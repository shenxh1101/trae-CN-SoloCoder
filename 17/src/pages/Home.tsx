import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  Clock,
  Flame,
  Code2,
  Sparkles,
  ChevronDown,
  Loader2,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import SnippetCard from '@/components/snippets/SnippetCard';
import Empty from '@/components/Empty';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSnippetStore } from '@/stores/useSnippetStore';
import { useEditorStore } from '@/stores/useEditorStore';
import type { Language, SearchQuery } from '@/shared/types';

const languages: { value: Language | 'all'; label: string }[] = [
  { value: 'all', label: '全部语言' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

const sortOptions = [
  { value: 'latest', label: '最新', icon: Clock },
  { value: 'popular', label: '最热', icon: Flame },
  { value: 'trending', label: '趋势', icon: TrendingUp },
];

export default function Home() {
  const { user, logout } = useAuthStore();
  const { snippets, isLoading, fetchSnippets, likeSnippet, favoriteSnippet, forkSnippet } = useSnippetStore();
  const { setCode, setLanguage } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | 'all'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('trending');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadSnippets = useCallback(async () => {
    const query: SearchQuery = {
      sortBy,
      page: 1,
      limit: 20,
    };
    if (searchQuery.trim()) {
      query.q = searchQuery.trim();
    }
    if (selectedLanguage !== 'all') {
      query.language = selectedLanguage;
    }
    await fetchSnippets(query);
  }, [fetchSnippets, searchQuery, selectedLanguage, sortBy]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSnippets();
  };

  const handleNewSnippet = () => {
    setCode(`// JavaScript 代码
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`);
    setLanguage('javascript');
    window.location.href = '/editor/new';
  };

  const handleRun = (snippet: any) => {
    setCode(snippet.code);
    setLanguage(snippet.language);
    window.location.href = `/editor/${snippet.shortCode}`;
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const hasActiveFilters = searchQuery.trim() || selectedLanguage !== 'all';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar
        user={user}
        onSearch={handleNewSnippet}
        onNewSnippet={handleNewSnippet}
        onLogout={logout}
        onLogin={handleLogin}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0tNiA2aC0ydi00aDJ2NHptMC02aC0ydi00aDJ2NHptLTYgNmgtdjRoNHY0em0wLTZoLTR2LTRoNHY0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-950" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">发现、运行、分享精彩代码</span>
            </div>
            
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl">
              代码分享与协作平台
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-white/90">
              支持 JavaScript、Python、Go、Rust 多语言在线运行，实时协作编辑，一键分享你的代码创意
            </p>

            <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索代码片段、标签、作者..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-24 text-gray-900 shadow-xl placeholder-gray-400 focus:ring-4 focus:ring-white/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-20 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  搜索
                </button>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {['#算法', '#机器学习', '#Web开发', '#工具函数', '#游戏'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag.replace('#', ''))}
                  className="rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              代码片段广场
            </h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {snippets.length} 个片段
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                hasActiveFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              <Filter className="h-4 w-4" />
              筛选
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-blue-500 px-1.5 text-xs text-white">
                  {(searchQuery.trim() ? 1 : 0) + (selectedLanguage !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>

            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value as typeof sortBy)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      sortBy === option.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  编程语言:
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {languages.find(l => l.value === selectedLanguage)?.label}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', { 'rotate-180': showLanguageDropdown })} />
                  </button>
                  
                  {showLanguageDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700 z-10">
                      {languages.map((lang) => (
                        <button
                          key={lang.value}
                          onClick={() => {
                            setSelectedLanguage(lang.value);
                            setShowLanguageDropdown(false);
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm transition-colors',
                            selectedLanguage === lang.value
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-600'
                          )}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedLanguage('all');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  清除所有筛选
                </button>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          </div>
        ) : snippets.length === 0 ? (
          <Empty
            title="暂无代码片段"
            description={hasActiveFilters ? "没有找到匹配的代码片段，试试调整筛选条件" : "还没有代码片段，快来创建第一个吧"}
            action={
              <Link
                to="/editor/new"
                onClick={handleNewSnippet}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Code2 className="h-4 w-4" />
                创建代码片段
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {snippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onLike={likeSnippet}
                onFavorite={favoriteSnippet}
                onFork={forkSnippet}
                onRun={handleRun}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
