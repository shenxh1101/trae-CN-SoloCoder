import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Bookmark, Eye, GitFork, Clock, Code2, User, MoreHorizontal, Copy, Check, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Snippet, Language } from '@/shared/types';

interface SnippetCardProps {
  snippet: Snippet;
  onLike?: (snippetId: string) => void;
  onFavorite?: (snippetId: string) => void;
  onFork?: (snippetId: string) => void;
  onRun?: (snippet: Snippet) => void;
  isLiked?: boolean;
  isFavorited?: boolean;
  className?: string;
}

const languageColors: Record<Language, { bg: string; text: string; border: string }> = {
  javascript: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  python: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  go: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  rust: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const languageNames: Record<Language, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
};

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? '刚刚' : `${minutes} 分钟前`;
    }
    return hours === 1 ? '1 小时前' : `${hours} 小时前`;
  }
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}

function truncateCode(code: string, maxLines: number = 10): string {
  const lines = code.split('\n');
  if (lines.length <= maxLines) return code;
  return lines.slice(0, maxLines).join('\n') + '\n...';
}

export default function SnippetCard({
  snippet,
  onLike,
  onFavorite,
  onFork,
  onRun,
  isLiked = false,
  isFavorited = false,
  className,
}: SnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localFavorited, setLocalFavorited] = useState(isFavorited);
  const [likesCount, setLikesCount] = useState(snippet.likesCount);
  const [favoritesCount, setFavoritesCount] = useState(snippet.favoritesCount);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippet.code]);

  const handleLike = useCallback(() => {
    setLocalLiked(!localLiked);
    setLikesCount((prev) => (localLiked ? prev - 1 : prev + 1));
    onLike?.(snippet.id);
  }, [localLiked, onLike, snippet.id]);

  const handleFavorite = useCallback(() => {
    setLocalFavorited(!localFavorited);
    setFavoritesCount((prev) => (localFavorited ? prev - 1 : prev + 1));
    onFavorite?.(snippet.id);
  }, [localFavorited, onFavorite, snippet.id]);

  const handleFork = useCallback(() => {
    onFork?.(snippet.id);
  }, [onFork, snippet.id]);

  const handleRun = useCallback(() => {
    onRun?.(snippet);
  }, [onRun, snippet]);

  const langColor = languageColors[snippet.language] || languageColors.javascript;

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900',
        className
      )}
    >
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={`/snippets/${snippet.shortCode}`}
              className="flex-1 hover:underline"
            >
              <h3 className="line-clamp-1 text-lg font-semibold text-gray-900 dark:text-white">
                {snippet.title}
              </h3>
            </Link>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                langColor.bg,
                langColor.text,
                langColor.border
              )}
            >
              <Code2 className="h-3 w-3" />
              {languageNames[snippet.language] || snippet.language}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  onClick={handleCopy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? '已复制' : '复制代码'}
                </button>
                <button
                  onClick={handleFork}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <GitFork className="h-4 w-4" />
                  Fork
                </button>
              </div>
            )}
          </div>
        </div>

        {snippet.description && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
            {snippet.description}
          </p>
        )}

        {snippet.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {snippet.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                #{tag}
              </span>
            ))}
            {snippet.tags.length > 5 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                +{snippet.tags.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <pre className="max-h-60 overflow-auto bg-gray-900 p-4 font-mono text-sm text-gray-100">
          <code className="language-javascript">{truncateCode(snippet.code)}</code>
        </pre>

        <div className="absolute bottom-3 right-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={handleRun}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:bg-green-700"
          >
            <Play className="h-3.5 w-3.5" />
            运行
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <Link
          to={`/users/${snippet.author.username}`}
          className="flex items-center gap-2 hover:underline"
        >
          {snippet.author.avatar ? (
            <img
              src={snippet.author.avatar}
              alt={snippet.author.username}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <User className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {snippet.author.username}
          </span>
        </Link>

        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDate(snippet.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800/30">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm transition-colors',
              localLiked
                ? 'text-red-500'
                : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
            )}
          >
            <Heart
              className={cn('h-4 w-4', localLiked && 'fill-current')}
            />
            <span>{likesCount}</span>
          </button>

          <button
            onClick={handleFavorite}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm transition-colors',
              localFavorited
                ? 'text-yellow-500'
                : 'text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-400'
            )}
          >
            <Bookmark
              className={cn('h-4 w-4', localFavorited && 'fill-current')}
            />
            <span>{favoritesCount}</span>
          </button>

          <button
            onClick={handleFork}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
          >
            <GitFork className="h-4 w-4" />
            <span>{snippet.forksCount}</span>
          </button>
        </div>

        <div className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Eye className="h-4 w-4" />
          <span>{snippet.viewsCount}</span>
        </div>
      </div>
    </div>
  );
}
