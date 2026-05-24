import React, { ReactNode } from 'react';
import {
  FileCode,
  Search,
  Heart,
  FolderOpen,
  AlertCircle,
  MessageSquare,
  Clock,
  Users,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateType =
  | 'no-snippets'
  | 'no-results'
  | 'no-favorites'
  | 'no-comments'
  | 'no-history'
  | 'no-followers'
  | 'error'
  | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap: Record<EmptyStateType, ReactNode> = {
  'no-snippets': <FileCode className="h-12 w-12 text-gray-300 dark:text-gray-600" />,
  'no-results': <Search className="h-12 w-12 text-gray-300 dark:text-gray-600" />,
  'no-favorites': <Heart className="h-12 w-12 text-gray-300 dark:text-gray-600" />,
  'no-comments': <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600" />,
  'no-history': <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600" />,
  'no-followers': <Users className="h-12 w-12 text-gray-300 dark:text-gray-600" />,
  'error': <AlertCircle className="h-12 w-12 text-red-400 dark:text-red-500" />,
  'custom': <FolderOpen className="h-12 w-12 text-gray-300 dark:text-gray-600" />,
};

const sizeClasses = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-20',
};

const iconSizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export default function EmptyState({
  type = 'custom',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const displayIcon = icon || iconMap[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in',
        sizeClasses[size],
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800',
          size === 'sm' ? 'p-4' : size === 'md' ? 'p-5' : 'p-6'
        )}
      >
        {displayIcon &&
          React.cloneElement(displayIcon as React.ReactElement, {
            className: cn(
              (displayIcon as React.ReactElement).props.className,
              iconSizeClasses[size]
            ),
          })}
      </div>

      <h3
        className={cn(
          'font-semibold text-gray-900 dark:text-white',
          size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-xl'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'mt-2 text-gray-500 dark:text-gray-400 max-w-sm',
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="btn-primary text-sm"
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="btn-secondary text-sm"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptySnippets({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      type="no-snippets"
      title="暂无代码片段"
      description="创建你的第一个代码片段，开始分享你的知识和经验吧！"
      action={
        onCreate
          ? {
              label: '创建代码片段',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4" />,
            }
          : undefined
      }
    />
  );
}

export function EmptySearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      type="no-results"
      title="未找到匹配结果"
      description={
        query
          ? `没有找到与 "${query}" 相关的代码片段，请尝试其他关键词。`
          : '没有找到匹配的结果，请尝试调整搜索条件。'
      }
    />
  );
}

export function EmptyFavorites() {
  return (
    <EmptyState
      type="no-favorites"
      title="暂无收藏"
      description="浏览其他用户的代码片段，收藏你喜欢的内容吧！"
    />
  );
}

export function EmptyComments() {
  return (
    <EmptyState
      type="no-comments"
      title="暂无评论"
      description="成为第一个评论的人，分享你的想法和见解吧！"
    />
  );
}

export function EmptyHistory() {
  return (
    <EmptyState
      type="no-history"
      title="暂无浏览历史"
      description="浏览更多代码片段后，这里会显示你的浏览记录。"
    />
  );
}

export function EmptyError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      type="error"
      title="加载失败"
      description={message || '加载数据时出现错误，请稍后重试。'}
      action={
        onRetry
          ? {
              label: '重新加载',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}


