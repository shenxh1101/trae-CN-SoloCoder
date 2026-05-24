import React, { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
  showAdvanced?: boolean;
  onAdvancedToggle?: () => void;
}

const recentSearches = [
  '项目进度',
  '会议邀请',
  '发票',
  '合同',
  '技术支持'
];

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '搜索邮件...',
  className = '',
  showAdvanced = false,
  onAdvancedToggle
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
      setShowSuggestions(false);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`} ref={suggestionsRef}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          )}
          {onAdvancedToggle && (
            <Button
              variant={showAdvanced ? 'primary' : 'ghost'}
              size="sm"
              onClick={onAdvancedToggle}
            >
              筛选
            </Button>
          )}
        </div>
      </div>

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              最近搜索
            </div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(search)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-gray-400">⏱️</span>
                <span>{search}</span>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              搜索提示
            </div>
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>• 输入关键词搜索主题和内容</p>
              <p>• 使用筛选器缩小搜索范围</p>
              <p>• 支持按发件人、时间、标签等筛选</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
