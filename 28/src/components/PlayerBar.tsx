import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Mic2,
  BarChart3,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore, type LoopMode } from '@/store/playerStore';
import { formatDuration } from '@/utils/formatTime';
import { cn } from '@/lib/utils';

const loopModeOrder: LoopMode[] = ['list', 'single', 'shuffle'];

interface PlayerBarProps {
  onToggleQueue?: () => void;
  showQueue?: boolean;
}

export default function PlayerBar({ onToggleQueue, showQueue }: PlayerBarProps) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    mute,
    loopMode,
    showLyrics,
    showVisualizer,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextSong,
    prevSong,
    setLoopMode,
    toggleShowLyrics,
    toggleShowVisualizer,
  } = usePlayerStore();

  const handleLoopCycle = () => {
    const currentIndex = loopModeOrder.indexOf(loopMode);
    const nextIndex = (currentIndex + 1) % loopModeOrder.length;
    setLoopMode(loopModeOrder[nextIndex]);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seek(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = mute ? 0 : volume * 100;

  const getLoopIcon = () => {
    switch (loopMode) {
      case 'single':
        return <Repeat1 className="w-5 h-5" />;
      case 'shuffle':
        return <Shuffle className="w-5 h-5" />;
      default:
        return <Repeat className="w-5 h-5" />;
    }
  };

  if (!currentSong) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border-subtle"
      >
        <div className="h-20 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.div
              className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0"
              animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              {currentSong.album?.picUrl ? (
                <img
                  src={currentSong.album.picUrl}
                  alt={currentSong.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-accent flex items-center justify-center">
                  <ListMusic className="w-6 h-6 text-white" />
                </div>
              )}
            </motion.div>

            <div className="min-w-0 hidden sm:block">
              <h4 className="font-medium text-text-primary truncate">
                {currentSong.name}
              </h4>
              <p className="text-sm text-text-secondary truncate">
                {currentSong.artists.map(a => a.name).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={prevSong}
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={togglePlay}
                className="relative p-3 rounded-full bg-gradient-accent text-white shadow-lg shadow-accent-purple/30 hover:shadow-accent-purple/50 transition-all duration-300"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" fill="currentColor" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                )}
              </motion.button>

              <button
                onClick={nextSong}
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full flex items-center gap-2">
              <span className="text-xs text-text-muted w-10 text-right hidden sm:block">
                {formatDuration(currentTime * 1000)}
              </span>

              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 h-1 my-auto bg-gradient-accent rounded-full pointer-events-none" style={{ width: `${progressPercent}%` }} />
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="progress-bar w-full relative z-10"
                />
              </div>

              <span className="text-xs text-text-muted w-10 hidden sm:block">
                {formatDuration(duration * 1000)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all duration-200"
              >
                {mute || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 h-0.5 my-auto bg-accent-cyan rounded-full pointer-events-none" style={{ width: `${volumePercent}%` }} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mute ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider relative z-10"
                />
              </div>
            </div>

            <button
              onClick={handleLoopCycle}
              className={cn(
                'p-2 rounded-full transition-all duration-200',
                loopMode !== 'list'
                  ? 'text-accent-purple bg-accent-purple/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              {getLoopIcon()}
            </button>

            <button
              onClick={toggleShowLyrics}
              className={cn(
                'p-2 rounded-full transition-all duration-200 hidden sm:block',
                showLyrics
                  ? 'text-accent-purple bg-accent-purple/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              <Mic2 className="w-5 h-5" />
            </button>

            <button
              onClick={toggleShowVisualizer}
              className={cn(
                'p-2 rounded-full transition-all duration-200 hidden sm:block',
                showVisualizer
                  ? 'text-accent-cyan bg-accent-cyan/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleQueue}
              className={cn(
                'p-2 rounded-full transition-all duration-200',
                showQueue
                  ? 'text-accent-purple bg-accent-purple/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
