import React from 'react';
import { formatDate, formatEmailAddress, formatPreview, getInitials, getColorFromString } from '../../utils/format';
import { highlightKeywords } from '../../utils/html';
import type { Email, EmailLabel } from '@shared/types';

interface SearchResultsProps {
  emails: Email[];
  labels: EmailLabel[];
  keywords: string[];
  selectedEmailId?: string | null;
  onEmailClick: (email: Email) => void;
  className?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  emails,
  labels,
  keywords,
  selectedEmailId,
  onEmailClick,
  className = ''
}) => {
  const getEmailLabels = (email: Email) => {
    return labels.filter(l => email.labels.includes(l.id));
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto">
        {emails.map((email, index) => {
          const emailLabels = getEmailLabels(email);
          const isSelected = selectedEmailId === email.id;

          return (
            <button
              key={email.id}
              onClick={() => onEmailClick(email)}
              className={`
                w-full p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-colors
                ${isSelected
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
                    <span
                      className={`font-medium truncate ${email.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'}`}
                      dangerouslySetInnerHTML={{
                        __html: highlightKeywords(formatEmailAddress(email.from, false), keywords)
                      }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatDate(email.date)}
                    </span>
                  </div>
                  <div
                    className={`text-sm truncate mb-1 ${email.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium'}`}
                    dangerouslySetInnerHTML={{
                      __html: highlightKeywords(email.subject || '(无主题)', keywords)
                    }}
                  />
                  <div
                    className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2"
                    dangerouslySetInnerHTML={{
                      __html: highlightKeywords(
                        formatPreview(email.preview || email.body.plain || '', 120),
                        keywords
                      )
                    }}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {email.isStarred && <span className="text-yellow-500">⭐</span>}
                    {email.hasTracking && <span className="text-orange-500" title="包含追踪像素">👁️</span>}
                    {email.isEncrypted && <span className="text-green-500" title="已加密">🔒</span>}
                    {email.attachments.length > 0 && (
                      <span className="text-gray-500" title={`${email.attachments.length}个附件`}>
                        📎 {email.attachments.length}
                      </span>
                    )}
                    {emailLabels.slice(0, 3).map(label => (
                      <span
                        key={label.id}
                        className="px-2 py-0.5 text-xs rounded-full text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                    {!email.isRead && (
                      <span className="ml-auto w-2 h-2 bg-primary-500 rounded-full"></span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SearchResults;
