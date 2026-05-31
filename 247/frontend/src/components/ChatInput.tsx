import { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { STYLE_OPTIONS } from '../types';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const { currentStyle, setStyle } = useChatStore();

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "请输入您的法律问题..."}
            disabled={disabled}
            rows={2}
            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-primary-600 focus:outline-none transition-colors duration-200 resize-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={currentStyle}
            onChange={(e) => setStyle(e.target.value as 'simple' | 'professional')}
            className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-primary-600 focus:outline-none bg-white cursor-pointer"
            title="回答风格"
          >
            {STYLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-800 text-white rounded-xl font-medium transition-all duration-200 hover:bg-primary-700 hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {disabled ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">发送</span>
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-400 text-center">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  );
}
