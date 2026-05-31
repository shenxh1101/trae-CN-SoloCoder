import { useState, useEffect } from 'react';
import { User, Bot, PhoneCall } from 'lucide-react';
import type { Message } from '../types';
import UrgencyBadge from './UrgencyBadge';
import LegalReference from './LegalReference';
import VoteButtons from './VoteButtons';

interface ChatMessageProps {
  message: Message;
  conversationId: string;
  isLast?: boolean;
}

export default function ChatMessage({ message, conversationId, isLast = false }: ChatMessageProps) {
  const [displayContent, setDisplayContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (message.role === 'assistant' && isLast && !displayContent) {
      setIsTyping(true);
      let index = 0;
      const content = message.content;
      
      const timer = setInterval(() => {
        if (index < content.length) {
          setDisplayContent(content.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(timer);
        }
      }, 15);

      return () => clearInterval(timer);
    } else {
      setDisplayContent(message.content);
    }
  }, [message.content, message.role, isLast, displayContent]);

  const isUser = message.role === 'user';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-800 text-white' : 'bg-gold-500 text-primary-900'
      }`}>
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <Bot className="w-5 h-5" />
        )}
      </div>

      <div className={`flex-1 max-w-3xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 text-xs text-gray-500 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="font-medium text-gray-700">
            {isUser ? '您' : 'AI法律顾问'}
          </span>
          <span>{formatTime(message.timestamp)}</span>
        </div>

        <div className={`p-4 rounded-2xl ${
          isUser 
            ? 'bg-primary-800 text-white rounded-tr-md' 
            : 'bg-white border border-gray-200 rounded-tl-md shadow-sm'
        }`}>
          <div className={`whitespace-pre-wrap leading-relaxed ${isTyping ? 'typing-cursor' : ''}`}>
            {displayContent}
          </div>

          {!isUser && message.urgency_level && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <UrgencyBadge 
                level={message.urgency_level} 
                reason={message.urgency_reason}
              />
              
              {message.recommend_lawyer && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 animate-pulse-slow">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>建议立即联系律师</span>
                </div>
              )}
            </div>
          )}

          {!isUser && message.legal_references && message.legal_references.length > 0 && (
            <LegalReference references={message.legal_references} />
          )}

          {!isUser && message.matched_entry_id && (
            <VoteButtons
              messageId={message.id}
              conversationId={conversationId}
              entryId={message.matched_entry_id}
              voted={message.voted}
            />
          )}
        </div>
      </div>
    </div>
  );
}
