import { useState, useEffect, useRef } from 'react';
import { X, Search, FileText, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSearchStore } from '../../store/useSearchStore';
import { highlightText } from '../../utils/helpers';
import type { SearchResult, SearchMatch } from '../../types';

interface SearchModalProps {
  onClose: () => void;
  onSearch: (query: string) => void;
}

export default function SearchModal({ onClose, onSearch }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { searchResults, isSearching, clearSearch } = useSearchStore();
  const { loadNote } = useAppStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        handleResultClick(searchResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, searchResults, selectedIndex]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim()) {
        onSearch(query);
      } else {
        clearSearch();
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [query, onSearch, clearSearch]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleResultClick = async (result: SearchResult) => {
    await loadNote(result.path);
    onClose();
  };

  const renderMatchContext = (match: SearchMatch) => {
    const context = match.context;
    const highlighted = highlightText(context, query);

    return (
      <div
        className="text-sm text-[var(--text-muted)] mt-1 font-mono"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-[var(--border-color)]">
          <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索笔记标题、内容或标签..."
            className="flex-1 px-3 py-4 bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
          {isSearching && (
            <div className="px-4 py-8 text-center text-[var(--text-muted)]">
              <div className="animate-pulse">搜索中...</div>
            </div>
          )}

          {!isSearching && query.trim() && searchResults.length === 0 && (
            <div className="px-4 py-8 text-center text-[var(--text-muted)]">
              <div className="text-4xl mb-2">🔍</div>
              <div>未找到包含 "{query}" 的笔记</div>
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-8 text-center text-[var(--text-muted)]">
              <div className="text-4xl mb-2">💡</div>
              <div>输入关键词开始搜索</div>
              <div className="text-xs mt-2 opacity-60">
                支持搜索标题、正文内容和标签
              </div>
            </div>
          )}

          {searchResults.map((result, index) => (
            <div
              key={result.id}
              onClick={() => handleResultClick(result)}
              className={`px-4 py-3 cursor-pointer transition-colors border-b border-[var(--border-color)] last:border-b-0 ${
                index === selectedIndex ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  {result.matches.some((m) => m.field === 'title') ? (
                    <Search size={16} className="text-[var(--accent-primary)]" />
                  ) : (
                    <FileText size={16} className="text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium text-[var(--text-primary)] truncate"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(result.title, query),
                    }}
                  />

                  {result.tags && result.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Tag size={12} className="text-[var(--text-muted)]" />
                      {result.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--accent-primary)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.matches
                    .filter((m) => m.field === 'content')
                    .slice(0, 2)
                    .map((match, i) => (
                      <div key={i}>{renderMatchContext(match)}</div>
                    ))}
                </div>
                <div className="flex-shrink-0 text-xs text-[var(--text-muted)]">
                  {result.matches.length} 个匹配
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)] flex items-center justify-between">
          <div>
            {searchResults.length > 0 && `找到 ${searchResults.length} 条结果`}
          </div>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> 导航
            </span>
            <span>
              <kbd className="kbd">Enter</kbd> 打开
            </span>
            <span>
              <kbd className="kbd">Esc</kbd> 关闭
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
