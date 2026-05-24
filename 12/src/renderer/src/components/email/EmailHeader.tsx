import React, { useState } from 'react';
import type { Email, EmailContact } from '@shared/types';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { useStore } from '../../store';

interface EmailHeaderProps {
  email: Email;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onClose?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMarkUnread?: () => void;
  onToggleStar?: () => void;
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
};

const formatFullDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ContactChip: React.FC<{ contact: EmailContact; isMe?: boolean }> = ({ contact, isMe }) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm
        ${isMe
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        }
      `}
      title={contact.email}
    >
      {contact.name || contact.email.split('@')[0]}
      {isMe && <span className="text-xs">(我)</span>}
    </span>
  );
};

export const EmailHeader: React.FC<EmailHeaderProps> = ({
  email,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onArchive,
  onMarkUnread,
  onToggleStar
}) => {
  const { accounts, labels } = useStore();
  const [showDetails, setShowDetails] = useState(false);

  const currentAccount = accounts.find(a => a.id === email.accountId);
  const myEmails = accounts.map(a => a.email);
  const emailLabels = labels.filter(l => email.labels.includes(l.id));

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await window.api.email.update(email.id, { isStarred: !email.isStarred });
      useStore.getState().updateEmail(updated);
      onToggleStar?.();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await window.api.email.delete(email.id);
      useStore.getState().removeEmail(email.id);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  };

  const handleArchive = async () => {
    try {
      const updated = await window.api.email.archive(email.id);
      useStore.getState().updateEmail(updated);
      onArchive?.();
    } catch (error) {
      console.error('Failed to archive email:', error);
    }
  };

  const handleMarkUnread = async () => {
    try {
      const updated = await window.api.email.update(email.id, { isRead: false });
      useStore.getState().updateEmail(updated);
      onMarkUnread?.();
    } catch (error) {
      console.error('Failed to mark as unread:', error);
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
            {email.subject || '(无主题)'}
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleStar}
              className={`p-2 rounded-lg transition-colors ${
                email.isStarred
                  ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={email.isStarred ? '取消星标' : '添加星标'}
            >
              <svg className="w-5 h-5" fill={email.isStarred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            <Dropdown
              align="right"
              trigger={
                <Button variant="ghost" size="icon" title="更多操作">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </Button>
              }
              items={[
                {
                  key: 'mark-unread',
                  label: '标记为未读',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  onClick: handleMarkUnread
                },
                {
                  key: 'archive',
                  label: '归档',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  ),
                  onClick: handleArchive
                },
                { key: 'divider-1', label: '', divider: true },
                {
                  key: 'delete',
                  label: '删除',
                  danger: true,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ),
                  onClick: handleDelete
                }
              ]}
            />
          </div>
        </div>

        {emailLabels.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {emailLabels.map(label => (
              <Badge
                key={label.id}
                className="px-2 py-0.5 text-xs"
                style={{ backgroundColor: label.color + '30', color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium flex-shrink-0">
            {(email.from.name || email.from.email.charAt(0)).charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {email.from.name || email.from.email}
                  </span>
                  {myEmails.includes(email.from.email) && (
                    <Badge variant="primary" size="sm">我</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="truncate">{email.from.email}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div
                  className="text-sm text-gray-500 dark:text-gray-400"
                  title={formatFullDate(email.date)}
                >
                  {formatDate(email.date)}
                </div>
                {currentAccount && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {currentAccount.name}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-1">
              {email.to.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">收件人</span>
                  <div className="flex flex-wrap gap-1">
                    {email.to.map((contact, idx) => (
                      <ContactChip
                        key={idx}
                        contact={contact}
                        isMe={myEmails.includes(contact.email)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {email.cc.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">抄送</span>
                  <div className="flex flex-wrap gap-1">
                    {email.cc.map((contact, idx) => (
                      <ContactChip
                        key={idx}
                        contact={contact}
                        isMe={myEmails.includes(contact.email)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {showDetails && email.bcc.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">密送</span>
                  <div className="flex flex-wrap gap-1">
                    {email.bcc.map((contact, idx) => (
                      <ContactChip
                        key={idx}
                        contact={contact}
                        isMe={myEmails.includes(contact.email)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {showDetails && email.replyTo && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">回复</span>
                  <ContactChip contact={email.replyTo} />
                </div>
              )}

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-1"
              >
                {showDetails ? '隐藏详情' : '显示详情'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReply}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          }
        >
          回复
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReplyAll}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          }
        >
          全部回复
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onForward}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          }
        >
          转发
        </Button>
      </div>
    </div>
  );
};

export default EmailHeader;
