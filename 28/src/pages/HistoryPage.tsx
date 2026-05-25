import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Trash2, Music } from 'lucide-react';
import { recentPlay } from '@/services/db';
import type { RecentPlayRecord } from '@/services/db';
import { usePlayerStore } from '@/store/playerStore';
import { getSongDetail } from '@/services/apiWithFallback';
import { formatDate, formatDuration } from '@/utils/formatTime';
import { showToast } from '@/utils/notification';

export default function HistoryPage() {
  const [history, setHistory] = useState<RecentPlayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    const records = await recentPlay.getAll(30);
    setHistory(records);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handlePlay = async (record: RecentPlayRecord) => {
    try {
      const songs = await getSongDetail([record.songId]);
      if (songs.length > 0) {
        usePlayerStore.getState().setCurrentSong(songs[0], true);
      }
    } catch (err) {
      showToast({ message: '播放失败', type: 'error' });
    }
  };

  const handleClear = async () => {
    await recentPlay.clear();
    setHistory([]);
    showToast({ message: '已清空播放历史' });
  };

  return (
    <div className="min-h-screen p-6 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-accent-purple" />
            <h1 className="text-3xl font-display font-bold">最近播放</h1>
            <span className="text-text-muted text-sm">共 {history.length} 首</span>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 rounded-lg glass-hover text-text-secondary hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-accent/20 flex items-center justify-center">
              <Music className="w-10 h-10 text-accent-purple" />
            </div>
            <h3 className="text-xl font-semibold mb-2">暂无播放记录</h3>
            <p className="text-text-secondary">快去搜索并播放你喜欢的歌曲吧</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {history.map((record, index) => (
              <motion.div
                key={record.songId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handlePlay(record)}
                className="flex items-center gap-4 p-3 rounded-xl glass-hover cursor-pointer group"
              >
                <span className="w-8 text-center text-text-muted text-sm">{index + 1}</span>
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={record.albumPic}
                    alt={record.songName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{record.songName}</h4>
                  <p className="text-sm text-text-secondary truncate">{record.artistName}</p>
                </div>
                <span className="text-xs text-text-muted">
                  {formatDate(record.playedAt)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
