import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import SearchBar from '@/components/SearchBar';
import SongList from '@/components/SongList';
import LyricsPanel from '@/components/LyricsPanel';
import CommentsPanel from '@/components/CommentsPanel';
import AudioVisualizer from '@/components/AudioVisualizer';
import PlayQueue from '@/components/PlayQueue';
import PlayerBar from '@/components/PlayerBar';
import { usePlayerStore } from '@/store/playerStore';
import { usePlayer, useKeyboardShortcuts } from '@/hooks';
import type { Song, SearchResult } from '@/services/api';
import { getTopPlaylist } from '@/services/apiWithFallback';
import { Search, Music, TrendingUp } from 'lucide-react';

export default function Home() {
  const { loading, error } = usePlayer();
  useKeyboardShortcuts();

  const { currentSong, showLyrics, showVisualizer } = usePlayerStore();
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'search' | 'discover'>('discover');
  const [showQueue, setShowQueue] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  useEffect(() => {
    const loadFeatured = async () => {
      const playlists = await getTopPlaylist(10);
      setFeaturedPlaylists(playlists);
    };
    loadFeatured();
  }, []);

  const handleSearchResults = (results: SearchResult) => {
    setSearchResults(results);
    if (results.songs.length > 0) {
      setActiveView('search');
    } else if (!results.hasMore && results.songCount === 0) {
      setActiveView('discover');
    }
  };

  const handlePlaySong = (song: Song) => {
    usePlayerStore.getState().setCurrentSong(song, true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <div className="max-w-5xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <SearchBar 
                onResults={handleSearchResults}
                onLoadingChange={setIsSearchLoading}
              />
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300"
              >
                {error}
              </motion.div>
            )}

            {(loading || isSearchLoading) && !currentSong && (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {activeView === 'discover' && (!searchResults || searchResults.songs.length === 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-8"
              >
                {showVisualizer && currentSong && (
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-accent-cyan" />
                      <h2 className="text-xl font-display font-semibold">音频可视化</h2>
                    </div>
                    <div className="h-48">
                      <AudioVisualizer />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-accent-purple" />
                    <h2 className="text-xl font-display font-semibold">热门歌单</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {featuredPlaylists.map((playlist, index) => (
                      <motion.div
                        key={playlist.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group cursor-pointer card-hover"
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                          <img
                            src={playlist.coverImgUrl}
                            alt={playlist.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        <h3 className="font-medium text-sm truncate text-text-primary">{playlist.name}</h3>
                        <p className="text-xs text-text-muted">{playlist.trackCount} 首歌曲</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-accent flex items-center justify-center">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2">开始探索音乐</h3>
                  <p className="text-text-secondary mb-4">在上方搜索框输入歌曲、歌手或专辑名称</p>
                  <p className="text-sm text-text-muted">
                    支持快捷键：空格播放/暂停 · ←→ 切换歌曲 · ↑↓ 调节音量
                  </p>
                </div>
              </motion.div>
            )}

            {activeView === 'search' && searchResults && searchResults.songs.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-semibold">
                    搜索结果
                    <span className="text-text-muted text-sm ml-2">共 {searchResults.songCount} 首</span>
                  </h2>
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="px-4 py-2 rounded-lg glass-hover text-sm"
                  >
                    {showComments ? '隐藏评论' : '查看评论'}
                  </button>
                </div>

                <SongList
                  songs={searchResults.songs}
                  onPlay={handlePlaySong}
                  loading={isSearchLoading}
                />
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showLyrics && currentSong && (
          <LyricsPanel 
            isOpen={showLyrics} 
            onClose={() => usePlayerStore.getState().toggleShowLyrics()} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && currentSong && (
          <CommentsPanel 
            isOpen={showComments} 
            onClose={() => setShowComments(false)}
            songId={currentSong.id}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQueue && (
          <PlayQueue 
            isOpen={showQueue}
            onClose={() => setShowQueue(false)} 
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-40">
        <PlayerBar onToggleQueue={() => setShowQueue(!showQueue)} showQueue={showQueue} />
      </div>
    </div>
  );
}
