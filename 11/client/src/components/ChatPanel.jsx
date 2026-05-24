import React, { useState, useRef, useEffect } from 'react';

const ChatPanel = ({
  className,
  messages,
  currentUserId,
  onSendMessage,
  onToggle,
  isOpen
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`chat-panel ${className}`}>
      <div className="sidebar-header">
        <span>💬 聊天</span>
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '12px' }}
          onClick={onToggle}
        >
          {isOpen ? '隐藏' : '显示'}
        </button>
      </div>

      <div className="chat-messages" ref={messagesEndRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-text">
              还没有消息<br />开始聊天吧！
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`chat-message ${msg.userId === currentUserId ? 'self' : ''}`}
            >
              <div className="chat-message-header">
                <span className="chat-message-name">{msg.userName}</span>
                <span>{formatTime(msg.timestamp)}</span>
              </div>
              <div className="chat-message-bubble">
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form className="chat-input-container" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
          disabled={!input.trim()}
        >
          发送
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
