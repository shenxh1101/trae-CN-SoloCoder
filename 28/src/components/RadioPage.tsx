import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Play, Headphones, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSimilarRadio, getSongDetail } from '@/services/apiWithFallback';
import type { RadioProgram, Song } from '@/services/api';
import { usePlayerStore } from '@/store/playerStore';
import { showToast } from '@/utils/notification';
import { cn } from '@/lib/utils';

function formatPlayCount(count: number): string {
  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(1)}亿`;
  }
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  return count.toString();
}

interface RadioCardProps {
  program: RadioProgram;
  index: number;
  onPlay: (program: RadioProgram) => void;
}

function RadioCard({ program, index, onPlay }: RadioCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-bg-tertiary cursor-pointer card-hover',
          'border border-border-subtle'
        )}
        onClick={() => onPlay(program)}
      >
        <div className="aspect-square relative overflow-hidden">
          <img
            src={program.coverUrl}
            alt={program.name}
            className={cn(
              'w-full h-full object-cover transition-transform duration-500',
              isHovered && 'scale-110'
            )}
          />

          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent',
              'flex items-end justify-center pb-6',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
            )}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 rounded-full bg-gradient-accent flex items-center justify-center shadow-lg shadow-accent-purple/50"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(program);
              }}
            >
              <Play className="w-6 h-6 text-white ml-1" />
            </motion.button>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <Headphones className="w-3 h-3 text-text-secondary" />
            <span className="text-xs text-text-secondary">{formatPlayCount(program.playCount)}</span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium text-text-primary truncate mb-1">{program.name}</h3>
          <p className="text-xs text-text-muted line-clamp-2 h-8">{program.description}</p>

          {program.radio && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
              <img
                src={program.radio.picUrl}
                alt={program.radio.name}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs text-text-secondary truncate">{program.radio.name}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RadioSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-2xl bg-bg-tertiary" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-3/4 bg-bg-tertiary rounded" />
        <div className="h-3 w-full bg-bg-tertiary rounded" />
        <div className="h-3 w-2/3 bg-bg-tertiary rounded" />
      </div>
    </div>
  );
}

export default function RadioPage() {
  const navigate = useNavigate();
  const { songId } = useParams<{ songId?: string }>();
  const { currentSong, setCurrentSong } = usePlayerStore();

  const [programs, setPrograms] = useState<RadioProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    loadRadios();
  }, [songId, currentSong?.id]);

  const loadRadios = async () => {
    setLoading(true);
    try {
      const id = songId ? parseInt(songId, 10) : currentSong?.id;
      if (!id) {
        setPrograms([]);
        return;
      }

      const data = await getSimilarRadio(id);
      setPrograms(data);
    } catch (error) {
      console.error('Failed to load radios:', error);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRadio = async (program: RadioProgram) => {
    setPlayingId(program.id);
    try {
      const songs = await getSongDetail([program.id]);
      if (songs.length > 0) {
        const song: Song = songs[0];
        setCurrentSong(song, true);
        showToast({ message: `正在播放：${song.name}`, type: 'success' });
      } else {
        showToast({ message: '无法获取播放资源', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to play radio:', error);
      showToast({ message: '播放失败，请重试', type: 'error' });
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-6 h-6 text-accent-cyan" />
                <h1 className="text-2xl font-bold text-text-primary">电台推荐</h1>
              </div>
              <p className="text-text-muted text-sm mt-1">
                {currentSong
                  ? `基于「${currentSong.name}」风格推荐`
                  : '播放歌曲后获取个性化推荐'}
              </p>
            </div>
          </div>

          <button
            onClick={loadRadios}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border-subtle text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              '刷新'
            )}
          </button>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <RadioSkeleton key={i} />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-bg-tertiary flex items-center justify-center mb-6">
              <Radio className="w-12 h-12 text-text-muted" />
            </div>
            <p className="text-text-secondary text-lg mb-2">暂无电台推荐</p>
            <p className="text-text-muted text-sm mb-6">
              播放一首歌曲后，我们会为你推荐相似风格的电台节目
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gradient-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity btn-glow"
            >
              去发现音乐
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {programs.map((program, index) => (
              <RadioCard
                key={program.id}
                program={program}
                index={index}
                onPlay={handlePlayRadio}
              />
            ))}
          </div>
        )}

        {playingId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-bg-secondary border border-border-subtle shadow-2xl shadow-accent-purple/20 flex items-center gap-3 z-40"
          >
            <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />
            <span className="text-sm text-text-primary">正在加载电台节目...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
