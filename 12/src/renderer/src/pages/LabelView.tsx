import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { formatDate, formatEmailAddress, formatPreview, getInitials, getColorFromString } from '../utils/format';
import { sanitizeHtml } from '../utils/html';
import Button from '../components/ui/Button';
import type { Email } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const LabelView: React.FC = () => {
  const { labelId } = useParams<{ labelId: string }>();
  const navigate = useNavigate();
  const { labels, accounts, selectedEmailId, setSelectedEmailId, setCurrentEmail } = useStore();

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const label = labels.find(l => l.id === labelId);

  const loadLabelEmails = useCallback(async () => {
    if (!labelId) return;
    setIsLoading(true);
    try {
      const result = await window.api.search.query({
        query: '',
        labelIds: [labelId],
        highlightKeywords: false
      });
      setEmails(result.emails);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load label emails:', error);
    } finally {
      setIsLoading(false);
    }
  }, [labelId]);

  useEffect(() => {
    loadLabelEmails();
  }, [loadLabelEmails]);

  const handleEmailClick = async (email: Email) => {
    setSelectedEmail(email);
    setSelectedEmailId(email.id);
    try {
      const fullEmail = await window.api.email.get(email.id);
      setCurrentEmail(fullEmail);
    } catch (error) {
      console.error('Failed to load email:', error);
    }
  };

  const handleRemoveLabel = async (emailId: string) => {
    if (!labelId) return;
    try {
      await window.api.label.remove(emailId, labelId);
      setEmails(prev => prev.filter(e => e.id !== emailId));
      setTotal(prev => prev - 1);
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
        setCurrentEmail(null);
      }
    } catch (error) {
      console.error('Failed to remove label:', error);
    }
  };

  if (!label) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="text-6xl mb-4">🏷️</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">标签不存在</p>
          <Button className="mt-4" onClick={() => navigate('/mail')}>返回邮件</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      <div className={`${selectedEmail ? 'w-2/5' : 'w-full'} flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl"
              style={{ backgroundColor: label.color }}
            >
              🏷️
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{label.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{total} 封邮件</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索此标签下的邮件..."
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
        ) : emails.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400">此标签下暂无邮件</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {emails.map(email => (
              <button
                key={email.id}
                onClick={() => handleEmailClick(email)}
                className={`
                  w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-colors
                  ${selectedEmail?.id === email.id
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
                      <span className={`font-medium truncate ${email.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'}`}>
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
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-xs rounded-full text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                      {email.attachments.length > 0 && (
                        <span className="text-gray-500">📎 {email.attachments.length}</span>
                      )}
                      {email.isStarred && <span className="text-yellow-500">⭐</span>}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-xs text-gray-400 hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); handleRemoveLabel(email.id); }}
                      >
                        移除标签
                      </Button>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEmail && (
        <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedEmail(null); setCurrentEmail(null); }}>
              ← 返回
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">↩️</Button>
              <Button variant="ghost" size="icon">↪️</Button>
              <Button variant="ghost" size="icon">🗑️</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {selectedEmail.subject || '(无主题)'}
            </h2>

            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: getColorFromString(selectedEmail.from.email) }}
              >
                {getInitials(selectedEmail.from.name || selectedEmail.from.email)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatEmailAddress(selectedEmail.from)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(selectedEmail.date, 'long')}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  收件人: {selectedEmail.to.map(t => formatEmailAddress(t)).join(', ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-3 py-1 text-sm rounded-full text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
              {selectedEmail.labels.filter(l => l !== labelId).map(lid => {
                const l = labels.find(lbl => lbl.id === lid);
                if (!l) return null;
                return (
                  <span
                    key={lid}
                    className="px-3 py-1 text-sm rounded-full text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                  </span>
                );
              })}
            </div>

            {selectedEmail.attachments.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  📎 附件 ({selectedEmail.attachments.length})
                </h3>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              {selectedEmail.body.html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEmail.body.html, { allowExternalImages: false }) }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm">
                  {selectedEmail.body.plain}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelView;
