import React, { useState, useEffect } from 'react';
import type { Thread, Email } from '@shared/types';
import { EmailHeader } from './EmailHeader';
import { EmailBody } from './EmailBody';
import { useStore } from '../../store';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Loading } from '../ui/Loading';

interface EmailThreadProps {
  threadId?: string | null;
  onClose?: () => void;
}

const ThreadEmailItem: React.FC<{
  email: Email;
  isFirst: boolean;
  isLast: boolean;
  onReply: (email: Email) => void;
}> = ({ email, isFirst, isLast, onReply }) => {
  const [expanded, setExpanded] = useState(isLast);
  const { accounts } = useStore();

  const myEmails = accounts.map(a => a.email);
  const isFromMe = myEmails.includes(email.from.email);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`relative ${!isLast ? 'mb-2' : ''}`}>
      {!isLast && (
        <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}
      
      <div
        className={`
          relative rounded-xl border transition-all duration-200
          ${expanded
            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm'
            : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
      >
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {(email.from.name || email.from.email.charAt(0)).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm truncate ${email.isRead ? 'text-gray-700 dark:text-gray-300' : 'font-medium text-gray-900 dark:text-white'}`}>
                  {isFromMe ? '我' : email.from.name || email.from.email}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {formatDate(email.date)}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {email.preview}
              </p>
            </div>
            {email.attachments.length > 0 && (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
        ) : (
          <div>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {(email.from.name || email.from.email.charAt(0)).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {isFromMe ? '我' : email.from.name || email.from.email}
                      </span>
                      {isFromMe && (
                        <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-0.5 rounded">
                          我发送的
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {email.from.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(email.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(email)}
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
                    size="icon"
                    onClick={() => setExpanded(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </Button>
                </div>
              </div>

              {email.to.length > 0 && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">收件人: </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {email.to.map(c => c.name || c.email).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4">
              <EmailBody
                body={email.body}
                isEncrypted={email.isEncrypted}
                isSigned={email.isSigned}
                signatureValid={email.signatureValid}
                hasTracking={email.hasTracking}
              />
            </div>

            {email.attachments.length > 0 && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    附件 ({email.attachments.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {email.attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {attachment.filename}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const EmailThread: React.FC<EmailThreadProps> = ({
  threadId,
  onClose
}) => {
  const { setSelectedThreadId, setShowCompose, currentEmail } = useStore();
  const [thread, setThread] = useState<Thread | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchThread = async () => {
      if (threadId) {
        setLoading(true);
        try {
          const threadData = await window.api.thread.get(threadId);
          setThread(threadData);
          setEmails(threadData.emails.sort((a: Email, b: Email) => a.date - b.date));
          
          for (const email of threadData.emails) {
            if (!email.isRead) {
              await window.api.email.update(email.id, { isRead: true });
            }
          }
        } catch (error) {
          console.error('Failed to fetch thread:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setThread(null);
        setEmails([]);
      }
    };

    fetchThread();
  }, [threadId]);

  const handleReply = (email: Email) => {
    setShowCompose(true, {
      to: [email.from],
      subject: `Re: ${thread?.subject}`,
      inReplyTo: email.messageId,
      references: [...email.references, email.messageId]
    });
  };

  const handleClose = () => {
    setSelectedThreadId(null);
    onClose?.();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading text="加载会话..." />
      </div>
    );
  }

  if (!thread || emails.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
          title="选择一个会话"
          description="从列表中选择一个会话查看详情"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="flex -space-x-2">
            {thread.participants.slice(0, 3).map((p, idx) => (
              <div
                key={idx}
                className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium border-2 border-white dark:border-gray-900"
              >
                {(p.name || p.email.charAt(0)).charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">
              {thread.subject || '(无主题)'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {thread.totalMessages} 封邮件 · {thread.participants.length} 位参与者
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleReply(emails[emails.length - 1])}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          回复
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {emails.map((email, index) => (
          <ThreadEmailItem
            key={email.id}
            email={email}
            isFirst={index === 0}
            isLast={index === emails.length - 1}
            onReply={handleReply}
          />
        ))}
      </div>
    </div>
  );
};

export default EmailThread;
