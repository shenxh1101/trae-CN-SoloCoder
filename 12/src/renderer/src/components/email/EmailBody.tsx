import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { EmailBody as EmailBodyType } from '@shared/types';
import { useStore } from '../../store';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface EmailBodyProps {
  body: EmailBodyType;
  isEncrypted?: boolean;
  isSigned?: boolean;
  signatureValid?: boolean;
  hasTracking?: boolean;
}

type ViewMode = 'html' | 'plain' | 'markdown';

export const EmailBody: React.FC<EmailBodyProps> = ({
  body,
  isEncrypted = false,
  isSigned = false,
  signatureValid,
  hasTracking = false
}) => {
  const { settings } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('html');
  const [showRemoteContent, setShowRemoteContent] = useState(false);
  const [showTrackingWarning, setShowTrackingWarning] = useState(false);

  useEffect(() => {
    if (body.html) {
      setViewMode('html');
    } else if (body.markdown) {
      setViewMode('markdown');
    } else {
      setViewMode('plain');
    }
  }, [body]);

  useEffect(() => {
    if (hasTracking && settings?.preventTracking) {
      setShowTrackingWarning(true);
    }
  }, [hasTracking, settings?.preventTracking]);

  const processHtml = (html: string) => {
    let processed = html;
    
    if (!showRemoteContent && settings?.preventTracking) {
      processed = processed.replace(
        /<img[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/gi,
        '<div class="blocked-image p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-500 dark:text-gray-400 my-2">图片已被阻止加载以保护您的隐私</div>'
      );
    }

    const sanitized = DOMPurify.sanitize(processed, {
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'style', 'iframe'],
      FORBID_ATTR: ['onload', 'onerror', 'onclick']
    });

    return sanitized;
  };

  const renderMarkdown = (markdown: string) => {
    const html = marked.parse(markdown) as string;
    return DOMPurify.sanitize(html);
  };

  const availableModes: { key: ViewMode; label: string; available: boolean }[] = [
    { key: 'html', label: '富文本', available: !!body.html },
    { key: 'markdown', label: 'Markdown', available: !!body.markdown },
    { key: 'plain', label: '纯文本', available: !!body.plain }
  ];

  const renderContent = () => {
    switch (viewMode) {
      case 'html':
        if (!body.html) return null;
        return (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: processHtml(body.html) }}
          />
        );
      case 'markdown':
        if (!body.markdown) return null;
        return (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body.markdown) }}
          />
        );
      case 'plain':
        if (!body.plain) return null;
        return (
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300 bg-transparent p-0">
            {body.plain}
          </pre>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          {(isEncrypted || isSigned || hasTracking) && (
            <div className="flex items-center gap-1">
              {isEncrypted && (
                <Badge variant="success" size="sm">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  已加密
                </Badge>
              )}
              {isSigned && (
                <Badge variant={signatureValid ? 'success' : 'warning'} size="sm">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {signatureValid ? '签名有效' : '签名无效'}
                </Badge>
              )}
              {hasTracking && (
                <Badge variant="warning" size="sm">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  包含追踪
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {availableModes.filter(m => m.available).length > 1 && (
          <div className="flex items-center gap-1">
            {availableModes.map(mode => (
              mode.available && (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`
                    px-2 py-1 text-xs font-medium rounded
                    transition-colors
                    ${viewMode === mode.key
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {mode.label}
                </button>
              )
            ))}
          </div>
        )}
      </div>

      {showTrackingWarning && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            此邮件包含追踪像素，已阻止加载以保护您的隐私
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRemoteContent(true)}
            >
              显示图片
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTrackingWarning(false)}
            >
              关闭
            </Button>
          </div>
        </div>
      )}

      {hasTracking && !settings?.preventTracking && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          此邮件包含追踪内容，发件人可能知道您何时打开此邮件
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailBody;
