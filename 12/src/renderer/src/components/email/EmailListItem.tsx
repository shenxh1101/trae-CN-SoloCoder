import React from 'react';
import type { Email } from '@shared/types';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { useStore } from '../../store';

interface EmailListItemProps {
  email: Email;
  selected?: boolean;
  showCheckbox?: boolean;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

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

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const EmailListItem: React.FC<EmailListItemProps> = ({
  email,
  selected = false,
  showCheckbox = false,
  checked = false,
  onCheck,
  onClick,
  onDoubleClick
}) => {
  const { labels } = useStore();
  const emailLabels = labels.filter(l => email.labels.includes(l.id));

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await window.api.email.update(email.id, { isStarred: !email.isStarred });
      useStore.getState().updateEmail(updated);
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await window.api.email.update(email.id, { isRead: !email.isRead });
      useStore.getState().updateEmail(updated);
    } catch (error) {
      console.error('Failed to mark as read:', error);
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
          : email.isRead
            ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-l-transparent'
        }
      `}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {showCheckbox && (
        <div className="pt-0.5">
          <Checkbox
            checked={checked}
            onChange={(e) => onCheck?.(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <button
        onClick={handleToggleStar}
        className={`
          pt-0.5 flex-shrink-0 transition-colors
          ${email.isStarred
            ? 'text-yellow-500'
            : 'text-gray-300 dark:text-gray-600 group-hover:text-yellow-500'
          }
        `}
        title={email.isStarred ? '取消星标' : '添加星标'}
      >
        <svg className="w-5 h-5" fill={email.isStarred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
        {(email.from.name || email.from.email.charAt(0)).charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`truncate ${email.isRead ? 'font-normal text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'}`}>
              {email.from.name || email.from.email}
            </span>
            {emailLabels.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {emailLabels.slice(0, 2).map(label => (
                  <span
                    key={label.id}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                    title={label.name}
                  />
                ))}
                {emailLabels.length > 2 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{emailLabels.length - 2}
                  </span>
                )}
              </div>
            )}
            {email.hasTracking && (
              <Badge variant="warning" size="sm" className="flex-shrink-0">
                <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </Badge>
            )}
            {email.isEncrypted && (
              <Badge variant="success" size="sm" className="flex-shrink-0">
                <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </Badge>
            )}
            {email.attachments.length > 0 && (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(email.date)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatFileSize(email.size)}
            </span>
            <button
              onClick={handleMarkRead}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title={email.isRead ? '标记为未读' : '标记为已读'}
            >
              {email.isRead ? (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className={`truncate ${email.isRead ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'}`}>
          {email.subject || '(无主题)'}
        </div>
        <div className="truncate text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {email.preview}
        </div>
      </div>
    </div>
  );
};

export default EmailListItem;
