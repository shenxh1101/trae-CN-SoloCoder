import React, { useState } from 'react';
import Button from '../ui/Button';
import type { SearchQuery, EmailAccount, MailFolder, EmailLabel } from '@shared/types';

interface SearchFiltersProps {
  filters: Partial<SearchQuery>;
  onChange: (filters: Partial<SearchQuery>) => void;
  accounts: EmailAccount[];
  folders: MailFolder[];
  labels: EmailLabel[];
  className?: string;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  accounts,
  folders,
  labels,
  className = ''
}) => {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | null>(null);

  const handleDateRangeChange = (range: 'today' | 'week' | 'month' | 'year' | 'custom' | null) => {
    setDateRange(range);
    if (!range) {
      onChange({ dateFrom: undefined, dateTo: undefined });
      return;
    }

    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      onChange({ dateFrom: startOfDay.getTime(), dateTo: endOfDay.getTime() });
    } else if (range === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      onChange({ dateFrom: weekAgo.getTime(), dateTo: endOfDay.getTime() });
    } else if (range === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      onChange({ dateFrom: monthAgo.getTime(), dateTo: endOfDay.getTime() });
    } else if (range === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      onChange({ dateFrom: yearAgo.getTime(), dateTo: endOfDay.getTime() });
    }
  };

  const handleAccountToggle = (accountId: string) => {
    const current = filters.accountIds || [];
    const updated = current.includes(accountId)
      ? current.filter(id => id !== accountId)
      : [...current, accountId];
    onChange({ accountIds: updated });
  };

  const handleFolderToggle = (folderId: string) => {
    const current = filters.folderIds || [];
    const updated = current.includes(folderId)
      ? current.filter(id => id !== folderId)
      : [...current, folderId];
    onChange({ folderIds: updated });
  };

  const handleLabelToggle = (labelId: string) => {
    const current = filters.labelIds || [];
    const updated = current.includes(labelId)
      ? current.filter(id => id !== labelId)
      : [...current, labelId];
    onChange({ labelIds: updated });
  };

  const formatDateInput = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  const parseDateInput = (value: string): number | undefined => {
    if (!value) return undefined;
    return new Date(value).getTime();
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            发件人
          </label>
          <input
            type="text"
            value={filters.from || ''}
            onChange={(e) => onChange({ from: e.target.value })}
            placeholder="输入发件人邮箱或名称"
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            收件人
          </label>
          <input
            type="text"
            value={filters.to || ''}
            onChange={(e) => onChange({ to: e.target.value })}
            placeholder="输入收件人邮箱或名称"
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            时间范围
          </label>
          <div className="flex gap-2 mb-2">
            {(['today', 'week', 'month', 'year'] as const).map(range => (
              <Button
                key={range}
                size="sm"
                variant={dateRange === range ? 'primary' : 'outline'}
                onClick={() => handleDateRangeChange(range)}
              >
                {range === 'today' ? '今天' : range === 'week' ? '本周' : range === 'month' ? '本月' : '本年'}
              </Button>
            ))}
            <Button
              size="sm"
              variant={dateRange === 'custom' ? 'primary' : 'outline'}
              onClick={() => setDateRange('custom')}
            >
              自定义
            </Button>
            {(filters.dateFrom || filters.dateTo) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDateRangeChange(null)}
              >
                清除
              </Button>
            )}
          </div>
          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={formatDateInput(filters.dateFrom)}
                onChange={(e) => onChange({ dateFrom: parseDateInput(e.target.value) })}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="py-2 text-gray-500">至</span>
              <input
                type="date"
                value={formatDateInput(filters.dateTo)}
                onChange={(e) => onChange({ dateTo: parseDateInput(e.target.value) })}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            账户
          </label>
          <div className="flex flex-wrap gap-2">
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => handleAccountToggle(account.id)}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-colors
                  ${filters.accountIds?.includes(account.id)
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                {account.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            文件夹
          </label>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {folders.slice(0, 10).map(folder => (
              <button
                key={folder.id}
                onClick={() => handleFolderToggle(folder.id)}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-colors
                  ${filters.folderIds?.includes(folder.id)
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                {folder.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            标签
          </label>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {labels.map(label => (
              <button
                key={label.id}
                onClick={() => handleLabelToggle(label.id)}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-colors
                  ${filters.labelIds?.includes(label.id)
                    ? 'text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
                style={{
                  backgroundColor: filters.labelIds?.includes(label.id) ? label.color : undefined,
                  borderColor: filters.labelIds?.includes(label.id) ? label.color : undefined
                }}
              >
                {label.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            其他条件
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasAttachment === true}
                onChange={(e) => onChange({ hasAttachment: e.target.checked ? true : undefined })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">有附件</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isRead === false}
                onChange={(e) => onChange({ isRead: e.target.checked ? false : undefined })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">未读</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isStarred === true}
                onChange={(e) => onChange({ isStarred: e.target.checked ? true : undefined })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">已星标</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
