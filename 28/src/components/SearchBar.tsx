import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { search } from '../services/apiWithFallback';
import type { SearchResult, SearchParams } from '../services/api';
import { cn } from '../lib/utils';

type SearchType = 'songs' | 'artists' | 'albums';

interface SearchBarProps {
  onResults?: (results: SearchResult) => void;
  onLoadingChange?: (loading: boolean) => void;
  className?: string;
}

export default function SearchBar({ onResults, onLoadingChange, className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('songs');
  const [loading, setLoading] = useState(false);

  const searchTypes: { id: SearchType; label: string; apiType: SearchParams['type'] }[] = [
    { id: 'songs', label: '歌曲', apiType: 1 },
    { id: 'artists', label: '歌手', apiType: 100 },
    { id: 'albums', label: '专辑', apiType: 10 },
  ];

  const performSearch = useCallback(async (keywords: string, type: SearchType) => {
    if (!keywords.trim()) {
      onResults?.({ songs: [], hasMore: false, songCount: 0 });
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);

    try {
      const searchConfig = searchTypes.find(s => s.id === type);
      const result = await search({
        keywords: keywords.trim(),
        type: searchConfig?.apiType || 1,
        limit: 30,
        offset: 0,
      });
      onResults?.(result);
    } catch (error) {
      console.error('Search failed:', error);
      onResults?.({ songs: [], hasMore: false, songCount: 0 });
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [onResults, onLoadingChange, searchTypes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, searchType);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchType, performSearch]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('w-full max-w-3xl mx-auto', className)}
    >
      <div className="glass rounded-2xl p-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl">
            {searchTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSearchType(type.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  searchType === type.id
                    ? 'bg-gradient-accent text-white shadow-lg shadow-accent-purple/20'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索歌曲、歌手或专辑..."
              className="w-full pl-12 pr-12 py-3 bg-transparent text-white placeholder-text-muted focus:outline-none text-lg"
            />
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <Loader2 className="w-5 h-5 text-accent-cyan animate-spin" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
