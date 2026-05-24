import React, { useState, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Tabs, TabPanel } from '../ui/Tabs';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <button
    onClick={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
  >
    {children}
  </button>
);

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = '使用 Markdown 编写...',
  disabled = false
}) => {
  const [view, setView] = useState<'edit' | 'preview' | 'split'>('split');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertText = useCallback((before: string, after: string = '') => {
    if (!textareaRef.current || disabled) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }, [value, onChange, disabled]);

  const handleBold = () => insertText('**', '**');
  const handleItalic = () => insertText('*', '*');
  const handleStrikethrough = () => insertText('~~', '~~');
  const handleCode = () => insertText('`', '`');
  const handleCodeBlock = () => insertText('```\n', '\n```');
  const handleQuote = () => insertText('> ');
  const handleHeading1 = () => insertText('# ');
  const handleHeading2 = () => insertText('## ');
  const handleHeading3 = () => insertText('### ');
  const handleUnorderedList = () => insertText('- ');
  const handleOrderedList = () => insertText('1. ');
  const handleLink = () => {
    const url = prompt('请输入链接地址:', 'https://');
    if (url) {
      insertText('[', `](${url})`);
    }
  };
  const handleImage = () => {
    const url = prompt('请输入图片地址:', 'https://');
    if (url) {
      insertText('![alt', `](${url})`);
    }
  };
  const handleTable = () => insertText(
    '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
  );

  const renderPreview = () => {
    const html = marked.parse(value) as string;
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <ToolbarButton onClick={handleBold} title="加粗">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleItalic} title="斜体">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m-4 0h8" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleStrikethrough} title="删除线">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 10H7m10 0a4 4 0 11-4 4M7 10a4 4 0 104 4m0-8v8" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton onClick={handleHeading1} title="标题1">
          <span className="text-sm font-bold">H1</span>
        </ToolbarButton>
        <ToolbarButton onClick={handleHeading2} title="标题2">
          <span className="text-sm font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton onClick={handleHeading3} title="标题3">
          <span className="text-sm font-bold">H3</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton onClick={handleUnorderedList} title="无序列表">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="3" cy="6" r="1" fill="currentColor" />
            <circle cx="3" cy="12" r="1" fill="currentColor" />
            <circle cx="3" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleOrderedList} title="有序列表">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6h11M10 12h11M10 18h11" />
            <text x="2" y="9" fontSize="10" fill="currentColor">1</text>
            <text x="2" y="15" fontSize="10" fill="currentColor">2</text>
            <text x="2" y="21" fontSize="10" fill="currentColor">3</text>
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleQuote} title="引用">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleCode} title="行内代码">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleCodeBlock} title="代码块">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton onClick={handleLink} title="链接">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleImage} title="图片">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={handleTable} title="表格">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>

        <div className="flex-1" />

        <div className="flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 pl-2">
          {[
            { key: 'edit', label: '编辑' },
            { key: 'split', label: '分屏' },
            { key: 'preview', label: '预览' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as typeof view)}
              className={`
                px-2 py-1 text-xs font-medium rounded
                transition-colors
                ${view === tab.key
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${view === 'split' ? 'grid grid-cols-2' : ''}`}>
        {(view === 'edit' || view === 'split') && (
          <div className={view === 'split' ? 'border-r border-gray-200 dark:border-gray-700' : ''}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full min-h-[300px] p-4 resize-none focus:outline-none font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}

        {(view === 'preview' || view === 'split') && (
          <div
            className="min-h-[300px] p-4 overflow-y-auto prose dark:prose-invert max-w-none bg-white dark:bg-gray-900"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
