import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Play, Pause } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { getLyric } from '../services/apiWithFallback';
import { findCurrentLyricIndex } from '../utils/lyricParser';
import { cn } from '../lib/utils';

interface LyricsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LyricsPanel({ isOpen, onClose }: LyricsPanelProps) {
  const {
    currentSong,
    lyrics,
    currentLyricIndex,
    setLyrics,
    setCurrentLyricIndex,
    currentTime,
    isPlaying,
    togglePlay,
    seek,
  } = usePlayerStore();

  const [isLoading, setIsLoading] = useState(false);
  const [userScrolling, setUserScrolling] = useState(false);
  const [manualScrollTimeout, setManualScrollTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricLineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (currentSong && isOpen) {
      loadLyrics(currentSong.id);
    }
  }, [currentSong?.id, isOpen]);

  useEffect(() => {
    if (lyrics.length === 0 || userScrolling) return;

    const newIndex = findCurrentLyricIndex(lyrics, currentTime * 1000);
    if (newIndex !== currentLyricIndex && newIndex !== -1) {
      setCurrentLyricIndex(newIndex);
      scrollToLyric(newIndex);
    }
  }, [currentTime, lyrics, userScrolling, currentLyricIndex, setCurrentLyricIndex]);

  const loadLyrics = async (songId: number) => {
    setIsLoading(true);
    setLyrics([]);
    setCurrentLyricIndex(0);

    try {
      const lyricData = await getLyric(songId);
      setLyrics(lyricData);
    } catch (error) {
      console.error('Failed to load lyrics:', error);
      setLyrics([]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToLyric = useCallback((index: number) => {
    const container = lyricsContainerRef.current;
    const line = lyricLineRefs.current[index];

    if (!container || !line) return;

    const containerHeight = container.clientHeight;
    const lineTop = line.offsetTop;
    const lineHeight = line.clientHeight;
    const scrollTop = lineTop - containerHeight / 2 + lineHeight / 2;

    container.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    });
  }, []);

  const handleScroll = useCallback(() => {
    setUserScrolling(true);

    if (manualScrollTimeout) {
      clearTimeout(manualScrollTimeout);
    }

    const timeout = setTimeout(() => {
      setUserScrolling(false);
    }, 3000);

    setManualScrollTimeout(timeout);
  }, [manualScrollTimeout]);

  useEffect(() => {
    return () => {
      if (manualScrollTimeout) {
        clearTimeout(manualScrollTimeout);
      }
    };
  }, [manualScrollTimeout]);

  const handleLyricClick = (index: number) => {
    const lyric = lyrics[index];
    if (lyric) {
      const time = lyric.time / 1000;
      setCurrentLyricIndex(index);
      seek(time);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md glass border-l border-border-subtle z-50 flex flex-col"
          >
            <div className="p-6 border-b border-border-subtle">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-bold text-white">歌词</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              {currentSong && (
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="relative w-20 h-20 rounded-xl overflow-hidden shadow-2xl shadow-accent-purple/20 flex-shrink-0"
                  >
                    <img
                      src={currentSong.album.picUrl}
                      alt={currentSong.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {currentSong.name}
                    </h3>
                    <p className="text-text-secondary truncate">
                      {currentSong.artists.map(a => a.name).join(', ')}
                    </p>
                    <p className="text-sm text-text-muted truncate">
                      {currentSong.album.name}
                    </p>
                  </div>

                  <button
                    onClick={togglePlay}
                    className="p-3 rounded-full bg-gradient-accent shadow-lg shadow-accent-purple/30 hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div
              ref={lyricsContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-8"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 border-2 border-accent-purple border-t-transparent rounded-full mb-4"
                  />
                  <p className="text-text-secondary">加载歌词中...</p>
                </div>
              ) : lyrics.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Music className="w-16 h-16 text-text-muted mb-4" />
                  <p className="text-text-secondary text-lg">暂无歌词</p>
                  <p className="text-text-muted text-sm mt-2">
                    这首歌暂时没有歌词，欣赏音乐吧
                  </p>
                </div>
              ) : (
                <div className="space-y-1 pb-32">
                  {lyrics.map((lyric, index) => {
                    const isActive = index === currentLyricIndex;

                    return (
                      <motion.div
                        key={index}
                        ref={(el) => {
                          lyricLineRefs.current[index] = el;
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.01 }}
                        onClick={() => handleLyricClick(index)}
                        className={cn(
                          'lyric-line text-center',
                          isActive && 'active'
                        )}
                      >
                        {lyric.text}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {userScrolling && lyrics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-bg-secondary/90 backdrop-blur-md rounded-full text-sm text-text-secondary"
              >
                3秒后恢复自动滚动
              </motion.div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
