import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Radio, History, LogIn, Plus, Music, Clock, X } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { playlist, recentPlay, type PlaylistRecord, type RecentPlayRecord } from '../services/db';
import type { Song } from '../services/api';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ activeNav = 'home', onNavChange, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { setCurrentSong } = usePlayerStore();
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [recentPlays, setRecentPlays] = useState<RecentPlayRecord[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    loadPlaylists();
    loadRecentPlays();
  }, []);

  const loadPlaylists = async () => {
    const data = await playlist.getAll();
    setPlaylists(data);
  };

  const loadRecentPlays = async () => {
    const data = await recentPlay.getAll(5);
    setRecentPlays(data);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    const newId = `playlist_${Date.now()}`;
    await playlist.create({
      id: newId,
      name: newPlaylistName.trim(),
      coverUrl: 'https://picsum.photos/200/200',
    });
    
    setNewPlaylistName('');
    setShowCreateModal(false);
    loadPlaylists();
  };

  const navItems = [
    { id: 'home', icon: Home, label: '首页' },
    { id: 'search', icon: Search, label: '搜索' },
    { id: 'radio', icon: Radio, label: '电台' },
    { id: 'history', icon: History, label: '历史记录' },
    { id: 'login', icon: LogIn, label: '登录' },
  ];

  const handleRecentPlayClick = (record: RecentPlayRecord) => {
    const song: Song = {
      id: record.songId,
      name: record.songName,
      artists: [{ id: 0, name: record.artistName }],
      album: {
        id: 0,
        name: '',
        picUrl: record.albumPic,
      },
      duration: 0,
    };
    setCurrentSong(song, true);
  };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="glass h-screen flex flex-col overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between border-b border-border-subtle">
          {!collapsed ? (
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-display font-bold text-gradient"
            >
              MusicFlow
            </motion.h1>
          ) : (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center"
            >
              <Music className="w-5 h-5 text-white" />
            </motion.div>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavChange?.(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-glow border border-border-highlight text-white'
                      : 'text-text-secondary hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-accent-cyan')} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between px-4 mb-3">
                <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                  我的歌单
                </span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <Plus className="w-4 h-4 text-text-secondary group-hover:text-accent-cyan transition-colors" />
                </button>
              </div>
              
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {playlists.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ x: 4 }}
                    onClick={() => onNavChange?.(`playlist-${item.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-text-secondary hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex-shrink-0 overflow-hidden">
                      <img
                        src={item.coverUrl || 'https://picsum.photos/200/200'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-medium truncate">{item.name}</span>
                  </motion.button>
                ))}
                {playlists.length === 0 && (
                  <p className="px-4 py-2 text-sm text-text-muted">
                    暂无歌单，点击 + 创建
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {!collapsed && recentPlays.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <div className="flex items-center gap-2 px-4 mb-3">
                <Clock className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                  最近播放
                </span>
              </div>
              
              <div className="space-y-1">
                {recentPlays.map((item, index) => (
                  <motion.button
                    key={`${item.songId}-${item.playedAt}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ x: 4 }}
                    onClick={() => handleRecentPlayClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex-shrink-0 overflow-hidden">
                      <img
                        src={item.albumPic}
                        alt={item.songName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{item.songName}</p>
                      <p className="text-sm text-text-secondary truncate">{item.artistName}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </nav>
      </motion.aside>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-xl font-bold text-white mb-4">创建新歌单</h3>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="输入歌单名称..."
                className="w-full px-4 py-3 bg-bg-tertiary border border-border-subtle rounded-xl text-white placeholder-text-muted focus:outline-none focus:border-accent-purple/50 mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePlaylist();
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-border-subtle text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-accent text-white font-medium hover:opacity-90 transition-opacity"
                >
                  创建
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
