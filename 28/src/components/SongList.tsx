import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Music, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { playlist, playlistSong, type PlaylistRecord } from '../services/db';
import type { Song } from '../services/api';
import { formatDuration } from '../utils/formatTime';
import { cn } from '../lib/utils';

interface SongListProps {
  songs: Song[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onPlay?: (song: Song) => void;
}

export default function SongList({ songs, loading = false, hasMore = false, onLoadMore, onPlay }: SongListProps) {
  const { currentSong, setCurrentSong, isPlaying, togglePlay } = usePlayerStore();
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<number | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPlaylists = async () => {
    const data = await playlist.getAll();
    setPlaylists(data);
  };

  const handleSongClick = (song: Song) => {
    if (onPlay) {
      onPlay(song);
    } else {
      if (currentSong?.id === song.id) {
        togglePlay();
      } else {
        setCurrentSong(song, true);
      }
    }
  };

  const handleAddToPlaylist = async (song: Song, playlistId: string) => {
    setLoadingPlaylistId(song.id);
    try {
      const exists = await playlistSong.checkSongInPlaylist(playlistId, song.id);
      if (exists) {
        console.log('歌曲已存在于歌单中');
        setOpenDropdownId(null);
        setLoadingPlaylistId(null);
        return;
      }

      await playlistSong.addToPlaylist({
        playlistId,
        songId: song.id,
        songName: song.name,
        artistName: song.artists.map(a => a.name).join(', '),
        albumName: song.album.name,
        albumPic: song.album.picUrl,
        duration: song.duration,
      });
      console.log('已添加到歌单');
    } catch (error) {
      console.error('添加到歌单失败:', error);
    } finally {
      setOpenDropdownId(null);
      setLoadingPlaylistId(null);
    }
  };

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '100px',
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  const SkeletonRow = () => (
    <div className="flex items-center gap-4 p-4 rounded-xl animate-pulse">
      <div className="w-8 h-8 bg-bg-tertiary rounded" />
      <div className="w-12 h-12 bg-bg-tertiary rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-bg-tertiary rounded" />
        <div className="h-3 w-32 bg-bg-tertiary rounded" />
      </div>
      <div className="h-4 w-24 bg-bg-tertiary rounded" />
      <div className="h-4 w-16 bg-bg-tertiary rounded" />
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-bg-tertiary rounded-lg" />
        <div className="w-8 h-8 bg-bg-tertiary rounded-lg" />
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="hidden md:grid grid-cols-[40px_60px_1fr_200px_120px_100px] gap-4 px-4 py-2 text-sm font-medium text-text-muted">
        <div>#</div>
        <div></div>
        <div>标题</div>
        <div>专辑</div>
        <div>时长</div>
        <div className="text-right">操作</div>
      </div>

      <div className="space-y-1">
        {loading && songs.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : songs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Music className="w-16 h-16 text-text-muted mb-4" />
            <p className="text-text-secondary text-lg">暂无歌曲</p>
            <p className="text-text-muted text-sm mt-1">试试搜索其他关键词</p>
          </motion.div>
        ) : (
          songs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            const isDropdownOpen = openDropdownId === song.id;
            const isThisLoading = loadingPlaylistId === song.id;

            return (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSongClick(song)}
                className={cn(
                  'song-item md:grid md:grid-cols-[40px_60px_1fr_200px_120px_100px] gap-4 cursor-pointer',
                  isActive && 'active'
                )}
              >
                <div className="hidden md:flex items-center justify-center w-8 text-text-muted">
                  {isActive && isPlaying ? (
                    <div className="flex gap-0.5 items-end h-4">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-accent-cyan rounded-full"
                          animate={{
                            height: [8, 16, 8],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-bg-tertiary flex-shrink-0">
                  <img
                    src={song.album.picUrl}
                    alt={song.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className={cn('font-medium truncate', isActive && 'text-accent-cyan')}>
                    {song.name}
                  </p>
                  <p className="text-sm text-text-secondary truncate">
                    {song.artists.map(a => a.name).join(', ')}
                  </p>
                </div>

                <div className="hidden md:block min-w-0">
                  <p className="text-text-secondary truncate">{song.album.name}</p>
                </div>

                <div className="hidden md:block text-text-muted">
                  {formatDuration(song.duration)}
                </div>

                <div className="hidden md:flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSongClick(song);
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors group"
                  >
                    <Play className="w-4 h-4 text-text-secondary group-hover:text-accent-cyan transition-colors" />
                  </button>

                  <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(isDropdownOpen ? null : song.id);
                      }}
                      className={cn(
                        'p-2 rounded-lg hover:bg-white/10 transition-colors group',
                        isDropdownOpen && 'bg-white/10'
                      )}
                    >
                      {isThisLoading ? (
                        <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 text-text-secondary group-hover:text-accent-cyan transition-colors" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 w-48 glass rounded-xl p-2 z-20"
                        >
                          {playlists.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-text-muted text-center">
                              暂无歌单
                            </p>
                          ) : (
                            playlists.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToPlaylist(song, pl.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded bg-bg-tertiary overflow-hidden flex-shrink-0">
                                  <img
                                    src={pl.coverUrl || 'https://picsum.photos/200/200'}
                                    alt={pl.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-sm text-text-secondary hover:text-white truncate">
                                  {pl.name}
                                </span>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {hasMore && (
        <div ref={observerRef} className="py-8 flex justify-center">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-text-secondary"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>加载更多...</span>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
