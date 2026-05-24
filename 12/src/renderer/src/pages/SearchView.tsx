import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { formatDate, formatEmailAddress, formatPreview, getInitials, getColorFromString } from '../utils/format';
import { highlightKeywords, highlightHtml, sanitizeHtml } from '../utils/html';
import Button from '../components/ui/Button';
import SearchBar from '../components/search/SearchBar';
import SearchFilters from '../components/search/SearchFilters';
import SearchResults from '../components/search/SearchResults';
import type { SearchQuery, Email, SearchResult } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const SearchView: React.FC = () => {
  const {
    accounts,
    folders,
    labels,
    searchResult,
    searchQuery,
    setSearchResult,
    setSearchQuery,
    setSelectedEmailId,
    setCurrentEmail
  } = useStore();

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Partial<SearchQuery>>({
    accountIds: [],
    folderIds: [],
    from: '',
    to: '',
    dateFrom: undefined,
    dateTo: undefined,
    hasAttachment: undefined,
    labelIds: [],
    isRead: undefined,
    isStarred: undefined,
    highlightKeywords: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const extractKeywords = (queryStr: string): string[] => {
    if (!queryStr) return [];
    return queryStr.split(/\s+/).filter(k => k.length > 0);
  };

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setSearchResult(null);
      setSearchQuery(null);
      return;
    }

    setIsLoading(true);
    try {
      const searchParams: SearchQuery = {
        query: query.trim(),
        ...filters,
        highlightKeywords: true
      };

      setSearchQuery(searchParams);
      const result: SearchResult = await window.api.search.query(searchParams);
      setSearchResult(result);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, filters, setSearchResult, setSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

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

  const handleFilterChange = (newFilters: Partial<SearchQuery>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      accountIds: [],
      folderIds: [],
      from: '',
      to: '',
      dateFrom: undefined,
      dateTo: undefined,
      hasAttachment: undefined,
      labelIds: [],
      isRead: undefined,
      isStarred: undefined,
      highlightKeywords: true
    });
  };

  const keywords = extractKeywords(query);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'highlightKeywords') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  }).length;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">🔍 搜索邮件</h1>
        </div>

        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={performSearch}
          placeholder="搜索邮件主题、内容、发件人..."
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              高级筛选 {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
              >
                重置筛选
              </Button>
            )}
          </div>
          {searchResult && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              找到 {searchResult.total} 条结果
            </span>
          )}
        </div>

        {showFilters && (
          <SearchFilters
            filters={filters}
            onChange={handleFilterChange}
            accounts={accounts}
            folders={folders}
            labels={labels}
            className="mt-4"
          />
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${selectedEmail ? 'w-2/5' : 'w-full'} flex-shrink-0 overflow-hidden`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500 dark:text-gray-400">正在搜索...</p>
              </div>
            </div>
          ) : !query.trim() ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">输入关键词开始搜索</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">支持搜索主题、内容、发件人、收件人等</p>
              </div>
            </div>
          ) : !searchResult || searchResult.total === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">未找到匹配的邮件</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">尝试其他关键词或调整筛选条件</p>
              </div>
            </div>
          ) : (
            <SearchResults
              emails={searchResult.emails}
              labels={labels}
              keywords={keywords}
              selectedEmailId={selectedEmail?.id}
              onEmailClick={handleEmailClick}
            />
          )}
        </div>

        {selectedEmail && (
          <div className="flex-1 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
                  dangerouslySetInnerHTML={{ __html: highlightKeywords(selectedEmail.subject || '(无主题)', keywords) }} />

              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                  style={{ backgroundColor: getColorFromString(selectedEmail.from.email) }}
                >
                  {getInitials(selectedEmail.from.name || selectedEmail.from.email)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-white"
                          dangerouslySetInnerHTML={{ __html: highlightKeywords(formatEmailAddress(selectedEmail.from), keywords) }} />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(selectedEmail.date, 'long')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    收件人: {selectedEmail.to.map(t => formatEmailAddress(t)).join(', ')}
                  </div>
                </div>
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
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(
                        highlightHtml(selectedEmail.body.html, keywords),
                        { allowExternalImages: false }
                      )
                    }}
                  />
                ) : (
                  <div
                    className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm"
                    dangerouslySetInnerHTML={{ __html: highlightKeywords(selectedEmail.body.plain || '', keywords) }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
