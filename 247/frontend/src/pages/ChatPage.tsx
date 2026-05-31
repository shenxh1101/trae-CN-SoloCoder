import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Settings, Download } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ConversationList from '../components/ConversationList';
import { chatApi } from '../services/api';
import { useChatStore } from '../store/useChatStore';
import type { Message } from '../types';

export default function ChatPage() {
  const {
    conversations,
    currentConversationId,
    currentStyle,
    isLoading,
    setLoading,
    setError,
    addConversation,
    addMessage,
    setCurrentConversation,
    setConversations,
    getCurrentConversation,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversations, currentConversationId, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('加载对话失败:', error);
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
  };

  const handleSendMessage = async (question: string) => {
    setLoading(true);
    setError(null);

    try {
      const currentConv = getCurrentConversation();
      
      const userMessage: Message = {
        id: `temp_${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      };

      if (currentConv) {
        addMessage(currentConv.id, userMessage);
        const response = await chatApi.sendFollowUp(currentConv.id, {
          question,
          style: currentStyle,
        });

        if (response.success) {
          const assistantMessage: Message = {
            id: response.data.messageId,
            role: 'assistant',
            content: response.data.answer,
            timestamp: new Date().toISOString(),
            legal_references: response.data.legal_references,
            urgency_level: response.data.urgency_level,
            urgency_reason: response.data.urgency_reason,
            recommend_lawyer: response.data.recommend_lawyer,
            matched_entry_id: response.data.matched_entry_id || undefined,
          };
          addMessage(currentConv.id, assistantMessage);
        }
      } else {
        const response = await chatApi.sendMessage({
          question,
          style: currentStyle,
        });

        if (response.success) {
          const newConversation = {
            id: response.data.conversationId,
            title: question,
            messages: [
              userMessage,
              {
                id: response.data.messageId,
                role: 'assistant' as const,
                content: response.data.answer,
                timestamp: new Date().toISOString(),
                legal_references: response.data.legal_references,
                urgency_level: response.data.urgency_level,
                urgency_reason: response.data.urgency_reason,
                recommend_lawyer: response.data.recommend_lawyer,
                matched_entry_id: response.data.matched_entry_id || undefined,
              },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          addConversation(newConversation);
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setError('发送消息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentConversationId) return;
    try {
      await chatApi.exportConversation(currentConversationId);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const currentConv = getCurrentConversation();

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-primary-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Scale className="w-8 h-8 text-gold-400" />
          <div>
            <h1 className="font-serif text-xl font-bold">AI 法律咨询顾问</h1>
            <p className="text-xs text-primary-300">专业劳动法律问题解答</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {currentConversationId && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>导出对话</span>
            </button>
          )}
          <Link
            to="/admin/login"
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-primary-900 hover:bg-gold-400 rounded-lg transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            <span>管理后台</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 flex-shrink-0">
          <ConversationList onNewChat={handleNewChat} />
        </aside>

        <main className="flex-1 flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {!currentConv ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Scale className="w-20 h-20 text-gold-400 mb-6" />
                <h2 className="font-serif text-3xl font-bold text-primary-800 mb-3">
                  欢迎使用 AI 法律咨询顾问
                </h2>
                <p className="text-gray-600 max-w-lg mb-8">
                  我可以为您解答劳动法律相关问题，包括劳动合同、工资福利、社会保险、工伤赔偿等。
                  请在下方输入您的问题，我会基于专业法律知识为您解答。
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
                  {[
                    '试用期被辞退有赔偿吗？',
                    '公司拖欠工资怎么办？',
                    '加班费怎么算？',
                    '没有签劳动合同怎么维权？',
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(q)}
                      className="p-4 text-left bg-white rounded-xl border-2 border-gray-200 hover:border-primary-400 hover:shadow-md transition-all text-sm text-gray-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {currentConv.messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    conversationId={currentConv.id}
                    isLast={index === currentConv.messages.length - 1 && !isLoading}
                  />
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-primary-900">
                      <div className="w-5 h-5 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md p-4">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder={currentConv ? "继续追问您的问题..." : "请输入您的法律问题，例如：试用期被辞退有赔偿吗？"}
          />
        </main>
      </div>
    </div>
  );
}
