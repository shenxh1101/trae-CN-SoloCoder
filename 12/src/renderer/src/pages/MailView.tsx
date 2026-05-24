import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { formatDate, formatEmailAddress, formatPreview, getInitials, getColorFromString, formatFileSize } from '../utils/format';
import { sanitizeHtml, removeTrackingPixels } from '../utils/html';
import Button from '../components/ui/Button';
import type { Email, MailFolder, Thread } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const FolderItem: React.FC<{
  folder: MailFolder;
  selected: boolean;
  onClick: () => void;
  level?: number;
}> = ({ folder, selected, onClick, level = 0 }) => {
  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('inbox') || lower.includes('收件箱')) return '📥';
    if (lower.includes('sent') || lower.includes('已发送')) return '📤';
    if (lower.includes('draft') || lower.includes('草稿')) return '📝';
    if (lower.includes('trash') || lower.includes('deleted') || lower.includes('垃圾箱')) return '🗑️';
    if (lower.includes('spam') || lower.includes('junk') || lower.includes('垃圾邮件')) return '⚠️';
    if (lower.includes('archive') || lower.includes('归档')) return '📦';
    if (lower.includes('starred') || lower.includes('星标')) return '⭐';
    return '📁';
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors
        ${selected
          ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }
      `}
      style={{ paddingLeft: `${12 + level * 16}px` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg">{getFolderIcon(folder.name)}</span>
        <span className="truncate text-sm">{folder.name}</span>
      </div>
      {folder.unreadCount > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded-full">
          {folder.unreadCount > 99 ? '99+' : folder.unreadCount}
        </span>
      )}
    </button>
  );
};

const EmailListItem: React.FC<{
  email: Email;
  selected: boolean;
  onClick: () => void;
  labels: { id: string; name: string; color: string }[];
}> = ({ email, selected, onClick, labels }) => {
  const emailLabels = labels.filter(l => email.labels.includes(l.id));

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-colors
        ${selected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : email.isRead
            ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
            : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
          style={{ backgroundColor: getColorFromString(email.from.email) }}
        >
          {getInitials(email.from.name || email.from.email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-medium truncate ${email.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-white font-semibold'}`}>
              {formatEmailAddress(email.from, false)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatDate(email.date)}
            </span>
          </div>
          <div className={`text-sm truncate mb-1 ${email.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium'}`}>
            {email.subject || '(无主题)'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
            {formatPreview(email.preview || email.body.plain || '', 100)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {email.isStarred && <span className="text-yellow-500">⭐</span>}
            {email.hasTracking && <span className="text-orange-500" title="包含追踪像素">👁️</span>}
            {email.isEncrypted && <span className="text-green-500" title="已加密">🔒</span>}
            {email.attachments.length > 0 && <span className="text-gray-500" title={`${email.attachments.length}个附件`}>📎 {email.attachments.length}</span>}
            {emailLabels.slice(0, 3).map(label => (
              <span
                key={label.id}
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
};

const ThreadListItem: React.FC<{
  thread: Thread;
  selected: boolean;
  onClick: () => void;
  labels: { id: string; name: string; color: string }[];
}> = ({ thread, selected, onClick, labels }) => {
  const threadLabels = labels.filter(l => thread.labels.includes(l.id));
  const lastEmail = thread.emails[thread.emails.length - 1];

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-colors
        ${selected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : thread.unreadCount > 0
            ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex -space-x-2">
          {thread.participants.slice(0, 3).map((p, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-900"
              style={{ backgroundColor: getColorFromString(p.email), zIndex: 3 - i }}
            >
              {getInitials(p.name || p.email)}
            </div>
          ))}
          {thread.participants.length > 3 && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-900 bg-gray-400">
              +{thread.participants.length - 3}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-medium truncate ${thread.unreadCount > 0 ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
              {thread.participants.map(p => formatEmailAddress(p, false)).slice(0, 2).join(', ')}
              {thread.participants.length > 2 && '...'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatDate(thread.lastMessageAt)}
            </span>
          </div>
          <div className={`text-sm truncate mb-1 ${thread.unreadCount > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
            {thread.subject || '(无主题)'}
            {thread.totalMessages > 1 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                {thread.totalMessages}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
            {formatPreview(thread.preview || lastEmail?.body.plain || '', 100)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {thread.hasAttachment && <span className="text-gray-500">📎</span>}
            {threadLabels.slice(0, 3).map(label => (
              <span
                key={label.id}
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
            {thread.unreadCount > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs bg-primary-500 text-white rounded-full">
                {thread.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const EmailDetail: React.FC<{
  email: Email;
  onClose: () => void;
  labels: { id: string; name: string; color: string }[];
  accounts: { id: string; name: string; email: string }[];
}> = ({ email, onClose, labels, accounts }) => {
  const [showExternalImages, setShowExternalImages] = useState(false);
  const [showTrackingWarning, setShowTrackingWarning] = useState(email.hasTracking);
  const emailLabels = labels.filter(l => email.labels.includes(l.id));
  const account = accounts.find(a => a.id === email.accountId);

  const handleLoadImages = () => {
    setShowExternalImages(true);
    setShowTrackingWarning(false);
  };

  const handleMarkAsRead = async () => {
    try {
      await window.api.email.updateFlags(email.id, { seen: true });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleStar = async () => {
    try {
      await window.api.email.updateFlags(email.id, { flagged: !email.isStarred });
    } catch (error) {
      console.error('Failed to star:', error);
    }
  };

  const renderBody = () => {
    let html = email.body.html || '';
    const plain = email.body.plain || '';

    if (showTrackingWarning && email.hasTracking) {
      const { html: cleanedHtml } = removeTrackingPixels(html);
      html = cleanedHtml;
    }

    const sanitized = sanitizeHtml(html, { allowExternalImages: showExternalImages });

    if (!html && plain) {
      return (
        <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm">
          {plain}
        </div>
      );
    }

    return (
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  };

  useEffect(() => {
    if (!email.isRead) {
      handleMarkAsRead();
    }
  }, [email.id]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={onClose}>
          ← 返回
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleStar} title={email.isStarred ? '取消星标' : '添加星标'}>
            {email.isStarred ? '⭐' : '☆'}
          </Button>
          <Button variant="ghost" size="icon" title="回复">
            ↩️
          </Button>
          <Button variant="ghost" size="icon" title="转发">
            ↪️
          </Button>
          <Button variant="ghost" size="icon" title="删除">
            🗑️
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {email.subject || '(无主题)'}
          </h1>

          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: getColorFromString(email.from.email) }}
            >
              {getInitials(email.from.name || email.from.email)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatEmailAddress(email.from)}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(email.date, 'long')}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                收件人: {email.to.map(t => formatEmailAddress(t)).join(', ')}
              </div>
              {email.cc.length > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  抄送: {email.cc.map(c => formatEmailAddress(c)).join(', ')}
                </div>
              )}
              {account && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  账户: {account.name} ({account.email})
                </div>
              )}
            </div>
          </div>

          {emailLabels.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {emailLabels.map(label => (
                <span
                  key={label.id}
                  className="px-3 py-1 text-sm rounded-full text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {showTrackingWarning && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>👁️</span>
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    此邮件包含追踪像素，已阻止加载以保护您的隐私
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={handleLoadImages}>
                  显示图片
                </Button>
              </div>
            </div>
          )}

          {!showExternalImages && email.body.html?.includes('src="http') && !showTrackingWarning && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🖼️</span>
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    外部图片已阻止加载以保护您的隐私
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={handleLoadImages}>
                  显示图片
                </Button>
              </div>
            </div>
          )}

          {email.attachments.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                📎 附件 ({email.attachments.length})
              </h3>
              <div className="space-y-2">
                {email.attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{att.filename}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {att.contentType} • {formatFileSize(att.size)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.api.attachment.open(att.id)}
                      >
                        打开
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.api.attachment.saveAs(att.id)}
                      >
                        另存为
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            {renderBody()}
          </div>
        </div>
      </div>
    </div>
  );
};

const MailView: React.FC = () => {
  const { folderId, threadId } = useParams<{ folderId: string; threadId: string }>();
  const {
    accounts,
    folders,
    labels,
    selectedAccountId,
    selectedFolderId,
    selectedEmailId,
    selectedThreadId,
    emails,
    threads,
    totalEmails,
    totalThreads,
    currentEmail,
    settings,
    setSelectedAccountId,
    setSelectedFolderId,
    setSelectedEmailId,
    setSelectedThreadId,
    setEmails,
    setThreads,
    setCurrentEmail,
    setIsLoading,
    isLoading
  } = useStore();

  const [viewMode, setViewMode] = useState<'list' | 'thread'>('list');

  const loadEmails = useCallback(async (folderId: string) => {
    setIsLoading(true);
    try {
      if (settings?.threadView) {
        const result = await window.api.email.getThreads(folderId, 50, 0);
        setThreads(result.threads, result.total);
        setViewMode('thread');
      } else {
        const result = await window.api.email.list(folderId, 50, 0);
        setEmails(result.emails, result.total);
        setViewMode('list');
      }
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settings?.threadView, setIsLoading, setThreads, setEmails]);

  useEffect(() => {
    if (folderId) {
      setSelectedFolderId(folderId);
    }
    if (threadId) {
      setSelectedThreadId(threadId);
    }
  }, [folderId, threadId, setSelectedFolderId, setSelectedThreadId]);

  useEffect(() => {
    if (selectedFolderId) {
      loadEmails(selectedFolderId);
    }
  }, [selectedFolderId, loadEmails]);

  useEffect(() => {
    if (selectedEmailId) {
      window.api.email.get(selectedEmailId).then((email: Email) => {
        setCurrentEmail(email);
      }).catch(console.error);
    }
  }, [selectedEmailId, setCurrentEmail]);

  useEffect(() => {
    if (selectedThreadId) {
      window.api.email.getByThread(selectedThreadId).then((emails: Email[]) => {
        if (emails.length > 0) {
          setCurrentEmail(emails[emails.length - 1]);
        }
      }).catch(console.error);
    }
  }, [selectedThreadId, setCurrentEmail]);

  const accountFolders = folders.filter(f => !selectedAccountId || f.accountId === selectedAccountId);

  const getChildFolders = (parentId?: string) => {
    return accountFolders.filter(f => f.parentId === parentId);
  };

  const renderFolderTree = (parentId?: string, level = 0) => {
    const children = getChildFolders(parentId);
    return children.map(folder => (
      <div key={folder.id}>
        <FolderItem
          folder={folder}
          selected={selectedFolderId === folder.id}
          onClick={() => setSelectedFolderId(folder.id)}
          level={level}
        />
        {renderFolderTree(folder.id, level + 1)}
      </div>
    ));
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Button className="w-full" onClick={() => useStore.getState().setShowCompose(true)}>
            ✉️ 写邮件
          </Button>
        </div>

        {accounts.length > 1 && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value || null)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">所有账户</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.email})</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {renderFolderTree()}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">邮箱使用情况</div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: '35%' }}></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">已使用 3.5 GB / 15 GB</div>
        </div>
      </div>

      <div className={`${currentEmail ? 'w-96' : 'flex-1'} flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {folders.find(f => f.id === selectedFolderId)?.name || '选择文件夹'}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                onClick={() => { setViewMode('list'); if (selectedFolderId) loadEmails(selectedFolderId); }}
              >
                列表
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'thread' ? 'primary' : 'ghost'}
                onClick={() => { setViewMode('thread'); if (selectedFolderId) loadEmails(selectedFolderId); }}
              >
                会话
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索邮件..."
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">加载中...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {viewMode === 'list' ? (
              emails.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-gray-500 dark:text-gray-400">暂无邮件</p>
                  </div>
                </div>
              ) : (
                emails.map(email => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    selected={selectedEmailId === email.id}
                    onClick={() => {
                      setSelectedEmailId(email.id);
                      setSelectedThreadId(null);
                    }}
                    labels={labels}
                  />
                ))
              )
            ) : (
              threads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-gray-500 dark:text-gray-400">暂无会话</p>
                  </div>
                </div>
              ) : (
                threads.map(thread => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    selected={selectedThreadId === thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      setSelectedEmailId(null);
                    }}
                    labels={labels}
                  />
                ))
              )
            )}
          </div>
        )}

        {!isLoading && (viewMode === 'list' ? totalEmails > 50 : totalThreads > 50) && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-center">
            <Button variant="outline" size="sm">
              加载更多
            </Button>
          </div>
        )}
      </div>

      {currentEmail ? (
        <div className="flex-1">
          <EmailDetail
            email={currentEmail}
            onClose={() => {
              setCurrentEmail(null);
              setSelectedEmailId(null);
              setSelectedThreadId(null);
            }}
            labels={labels}
            accounts={accounts}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">选择一封邮件查看详情</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MailView;
