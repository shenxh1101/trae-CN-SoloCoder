import React, { useEffect } from 'react';
import type { Email, Attachment } from '@shared/types';
import { EmailHeader } from './EmailHeader';
import { EmailBody } from './EmailBody';
import { useStore } from '../../store';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface EmailDetailProps {
  emailId?: string | null;
  onClose?: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (contentType.startsWith('video/')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  if (contentType.startsWith('audio/')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    );
  }
  if (contentType.includes('pdf')) {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

const AttachmentItem: React.FC<{ attachment: Attachment }> = ({ attachment }) => {
  const handleDownload = async () => {
    try {
      await window.api.attachment.download(attachment.id);
    } catch (error) {
      console.error('Failed to download attachment:', error);
    }
  };

  const handleOpen = async () => {
    try {
      await window.api.attachment.open(attachment.id);
    } catch (error) {
      console.error('Failed to open attachment:', error);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="text-gray-500 dark:text-gray-400">
        {getFileIcon(attachment.contentType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {attachment.filename}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          title="下载"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpen}
          title="打开"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export const EmailDetail: React.FC<EmailDetailProps> = ({
  emailId,
  onClose
}) => {
  const { currentEmail, setCurrentEmail, setSelectedEmailId, setShowCompose, emails } = useStore();

  useEffect(() => {
    const fetchEmail = async () => {
      if (emailId) {
        try {
          const email = await window.api.email.get(emailId);
          setCurrentEmail(email);
          
          if (!email.isRead) {
            await window.api.email.update(emailId, { isRead: true });
          }
        } catch (error) {
          console.error('Failed to fetch email:', error);
        }
      } else {
        setCurrentEmail(null);
      }
    };

    fetchEmail();
  }, [emailId, setCurrentEmail]);

  const handleReply = () => {
    if (currentEmail) {
      setShowCompose(true, {
        to: [currentEmail.from],
        subject: `Re: ${currentEmail.subject}`,
        inReplyTo: currentEmail.messageId,
        references: [...currentEmail.references, currentEmail.messageId]
      });
    }
  };

  const handleReplyAll = () => {
    if (currentEmail) {
      setShowCompose(true, {
        to: [currentEmail.from, ...currentEmail.to],
        cc: currentEmail.cc,
        subject: `Re: ${currentEmail.subject}`,
        inReplyTo: currentEmail.messageId,
        references: [...currentEmail.references, currentEmail.messageId]
      });
    }
  };

  const handleForward = () => {
    if (currentEmail) {
      setShowCompose(true, {
        subject: `Fwd: ${currentEmail.subject}`,
        attachments: currentEmail.attachments
      });
    }
  };

  const handleClose = () => {
    setSelectedEmailId(null);
    setCurrentEmail(null);
    onClose?.();
  };

  if (!currentEmail) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title="选择一封邮件"
          description="从列表中选择一封邮件查看详情"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
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
        <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">
          邮件详情
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <EmailHeader
          email={currentEmail}
          onReply={handleReply}
          onReplyAll={handleReplyAll}
          onForward={handleForward}
          onClose={handleClose}
        />

        {currentEmail.attachments.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                附件 ({currentEmail.attachments.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentEmail.attachments.map(attachment => (
                <AttachmentItem key={attachment.id} attachment={attachment} />
              ))}
            </div>
          </div>
        )}

        <EmailBody
          body={currentEmail.body}
          isEncrypted={currentEmail.isEncrypted}
          isSigned={currentEmail.isSigned}
          signatureValid={currentEmail.signatureValid}
          hasTracking={currentEmail.hasTracking}
        />
      </div>
    </div>
  );
};

export default EmailDetail;
