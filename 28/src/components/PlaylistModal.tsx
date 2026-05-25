import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Music2, ListPlus } from 'lucide-react';
import { playlist, playlistSong, type PlaylistRecord } from '@/services/db';
import { showToast } from '@/utils/notification';
import { cn } from '@/lib/utils';
import type { Song } from '@/services/api';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
}

export default function PlaylistModal({ isOpen, onClose, song }: PlaylistModalProps) {
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [songsInPlaylists, setSongsInPlaylists] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen, song?.id]);

  const loadPlaylists = async () => {
    try {
      const data = await playlist.getAll();
      setPlaylists(data);

      if (song) {
        const statusMap: Record<string, boolean> = {};
        for (const pl of data) {
          const hasSong = await playlistSong.checkSongInPlaylist(pl.id, song.id);
          statusMap[pl.id] = hasSong;
        }
        setSongsInPlaylists(statusMap);
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      showToast({ message: '请输入歌单名称', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const playlistId = await playlist.create({
        id: `local_${Date.now()}`,
        name: newPlaylistName.trim(),
      });

      if (song) {
        await playlistSong.addToPlaylist({
          playlistId,
          songId: song.id,
          songName: song.name,
          artistName: song.artists.map((a) => a.name).join(' / '),
          albumName: song.album.name,
          albumPic: song.album.picUrl,
          duration: song.duration,
        });
      }

      showToast({ message: '歌单创建成功', type: 'success' });
      setNewPlaylistName('');
      setIsCreating(false);
      loadPlaylists();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      showToast({ message: '创建失败，请重试', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistItem: PlaylistRecord) => {
    if (!song) return;

    if (songsInPlaylists[playlistItem.id]) {
      showToast({ message: '歌曲已在该歌单中', type: 'info' });
      return;
    }

    try {
      await playlistSong.addToPlaylist({
        playlistId: playlistItem.id,
        songId: song.id,
        songName: song.name,
        artistName: song.artists.map((a) => a.name).join(' / '),
        albumName: song.album.name,
        albumPic: song.album.picUrl,
        duration: song.duration,
      });

      setSongsInPlaylists((prev) => ({ ...prev, [playlistItem.id]: true }));
      showToast({ message: `已添加到「${playlistItem.name}」`, type: 'success' });
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      showToast({ message: '添加失败，请重试', type: 'error' });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-bg-secondary rounded-2xl border border-border-subtle shadow-2xl shadow-accent-purple/10 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-accent-purple" />
                <h2 className="text-lg font-semibold text-text-primary">添加到歌单</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {song && (
              <div className="p-4 border-b border-border-subtle bg-bg-tertiary/50">
                <div className="flex items-center gap-3">
                  <img
                    src={song.album.picUrl}
                    alt={song.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{song.name}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {song.artists.map((a) => a.name).join(' / ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto">
              {isCreating ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 border-b border-border-subtle"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="输入歌单名称"
                      className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-subtle rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    />
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loading ? '创建中...' : '创建'}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewPlaylistName('');
                    }}
                    className="mt-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
                  >
                    取消
                  </button>
                </motion.div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left border-b border-border-subtle"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-accent/20 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-accent-purple" />
                  </div>
                  <span className="text-text-primary font-medium">创建新歌单</span>
                </button>
              )}

              {playlists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-3">
                    <Music2 className="w-8 h-8 text-text-muted" />
                  </div>
                  <p className="text-text-secondary mb-1">还没有歌单</p>
                  <p className="text-text-muted text-sm">点击上方创建你的第一个歌单</p>
                </div>
              ) : (
                <div>
                  {playlists.map((pl, index) => (
                    <motion.button
                      key={pl.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleAddToPlaylist(pl)}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left',
                        index < playlists.length - 1 && 'border-b border-border-subtle'
                      )}
                    >
                      <div className="relative">
                        <img
                          src={
                            pl.coverUrl ||
                            `https://picsum.photos/seed/${pl.id}/200/200`
                          }
                          alt={pl.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        {songsInPlaylists[pl.id] && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{pl.name}</p>
                        <p className="text-xs text-text-muted">
                          {new Date(pl.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      {songsInPlaylists[pl.id] && (
                        <span className="text-xs text-emerald-400 font-medium">已添加</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
