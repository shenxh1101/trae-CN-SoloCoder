import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Email, Thread } from '@shared/types';
import { EmailListItem } from './EmailListItem';
import { Loading } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Dropdown } from '../ui/Dropdown';
import { useStore } from '../../store';

interface EmailListProps {
  emails?: Email[];
  threads?: Thread[];
  isLoading?: boolean;
  selectedEmailId?: string | null;
  onEmailSelect?: (email: Email) => void;
  onEmailDoubleClick?: (email: Email) => void;
  onThreadSelect?: (thread: Thread) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyMessage?: string;
}

const ThreadItem: React.FC<{
  thread: Thread;
  selected?: boolean;
  onClick?: () => void;
}> = ({ thread, selected, onClick }) => {
  const { labels } = useStore();
  const threadLabels = labels.filter(l => thread.labels.includes(l.id));

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()];
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  return (
    <div
      className={`
        group relative flex items-start gap-3 px-4 py-3 cursor-pointer
        border-b border-gray-100 dark:border-gray-800
        transition-colors duration-150
        ${selected
          ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-500'
          : thread.unreadCount > 0
            ? 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-l-transparent'
            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent'
        }
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 pt-0.5">
        {thread.unreadCount > 0 && (
          <span className="w-2 h-2 bg-primary-500 rounded-full" />
        )}
      </div>

      <div className="flex -space-x-2">
        {thread.participants.slice(0, 3).map((p, idx) => (
          <div
            key={idx}
            className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium border-2 border-white dark:border-gray-900"
          >
            {(p.name || p.email.charAt(0)).charAt(0).toUpperCase()}
          </div>
        ))}
        {thread.participants.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-medium border-2 border-white dark:border-gray-900">
            +{thread.participants.length - 3}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`truncate ${thread.unreadCount > 0 ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              {thread.participants.map(p => p.name || p.email.split('@')[0]).join(', ')}
            </span>
            {threadLabels.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {threadLabels.slice(0, 2).map(label => (
                  <span
                    key={label.id}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                    title={label.name}
                  />
                ))}
              </div>
            )}
            {thread.hasAttachment && (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(thread.lastMessageAt)}
            </span>
            {thread.unreadCount > 0 && (
              <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                {thread.unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className={`truncate ${thread.unreadCount > 0 ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {thread.subject || '(无主题)'}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">
            {thread.preview}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            {thread.totalMessages} 封邮件
          </span>
        </div>
      </div>
    </div>
  );
};

export const EmailList: React.FC<EmailListProps> = ({
  emails = [],
  threads = [],
  isLoading = false,
  selectedEmailId,
  onEmailSelect,
  onEmailDoubleClick,
  onThreadSelect,
  onLoadMore,
  hasMore = false,
  emptyMessage = '暂无邮件'
}) => {
  const { settings, selectedEmailId: storeSelectedEmailId } = useStore();
  const [showCheckbox, setShowCheckbox] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const selectedId = selectedEmailId ?? storeSelectedEmailId;
  const isThreadView = settings?.threadView ?? false;
  const items = isThreadView ? threads : emails;

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoading]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setCheckedIds(new Set(items.map(item => item.id)));
    } else {
      setCheckedIds(new Set());
    }
  };

  const handleCheckItem = (id: string, checked: boolean) => {
    const newChecked = new Set(checkedIds);
    if (checked) {
      newChecked.add(id);
    } else {
      newChecked.delete(id);
    }
    setCheckedIds(newChecked);
  };

  const allChecked = items.length > 0 && checkedIds.size === items.length;
  const someChecked = checkedIds.size > 0 && checkedIds.size < items.length;

  const handleArchiveSelected = async () => {
    try {
      for (const id of checkedIds) {
        await window.api.email.archive(id);
        useStore.getState().removeEmail(id);
      }
      setCheckedIds(new Set());
    } catch (error) {
      console.error('Failed to archive emails:', error);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const id of checkedIds) {
        await window.api.email.delete(id);
        useStore.getState().removeEmail(id);
      }
      setCheckedIds(new Set());
    } catch (error) {
      console.error('Failed to delete emails:', error);
    }
  };

  const handleMarkSelectedRead = async (read: boolean) => {
    try {
      for (const id of checkedIds) {
        const updated = await window.api.email.update(id, { isRead: read });
        useStore.getState().updateEmail(updated);
      }
      setCheckedIds(new Set());
    } catch (error) {
      console.error('Failed to mark emails:', error);
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading text="加载邮件..." />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title={emptyMessage}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allChecked}
            indeterminate={someChecked}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCheckbox(!showCheckbox)}
          >
            选择
          </Button>
          {checkedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                已选择 {checkedIds.size} 项
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkSelectedRead(true)}
              >
                标为已读
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchiveSelected}
              >
                归档
              </Button>
              <Dropdown
                trigger={
                  <Button variant="ghost" size="icon">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
                }
                items={[
                  {
                    key: 'mark-unread',
                    label: '标记为未读',
                    onClick: () => handleMarkSelectedRead(false)
                  },
                  {
                    key: 'archive',
                    label: '归档',
                    onClick: handleArchiveSelected
                  },
                  { key: 'divider', label: '', divider: true },
                  {
                    key: 'delete',
                    label: '删除',
                    danger: true,
                    onClick: handleDeleteSelected
                  }
                ]}
              />
            </>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          共 {items.length} {isThreadView ? '个会话' : '封邮件'}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isThreadView
          ? threads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                selected={false}
                onClick={() => onThreadSelect?.(thread)}
              />
            ))
          : emails.map(email => (
              <EmailListItem
                key={email.id}
                email={email}
                selected={selectedId === email.id}
                showCheckbox={showCheckbox}
                checked={checkedIds.has(email.id)}
                onCheck={(checked) => handleCheckItem(email.id, checked)}
                onClick={() => onEmailSelect?.(email)}
                onDoubleClick={() => onEmailDoubleClick?.(email)}
              />
            ))
        }
        
        {hasMore && (
          <div ref={observerRef} className="py-4 flex justify-center">
            <Loading size="sm" />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailList;
