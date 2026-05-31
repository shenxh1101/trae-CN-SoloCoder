import { MessageSquarePlus, Download, Trash2, Clock } from 'lucide-react';
import type { Conversation } from '../types';
import { chatApi } from '../services/api';
import { useChatStore } from '../store/useChatStore';

interface ConversationListProps {
  onNewChat: () => void;
}

export default function ConversationList({ onNewChat }: ConversationListProps) {
  const { conversations, currentConversationId, setCurrentConversation, deleteConversation, setConversations, updateConversation } = useChatStore();

  const handleSelectConversation = async (id: string) => {
    setCurrentConversation(id);
    
    const selected = conversations.find(c => c.id === id);
    if (selected && selected.messages.length === 0 && selected.message_count && selected.message_count > 0) {
      try {
        const response = await chatApi.getConversation(id);
        if (response.success && response.data) {
          updateConversation(id, { messages: response.data.messages });
        }
      } catch (error) {
        console.error('加载对话详情失败:', error);
      }
    }
  };

  const handleExport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await chatApi.exportConversation(id);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;
    
    try {
      await chatApi.deleteConversation(id);
      deleteConversation(id);
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-800 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          <MessageSquarePlus className="w-5 h-5" />
          <span>新建对话</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无对话记录</p>
            <p className="text-sm mt-1">开始您的第一次法律咨询吧</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`p-4 cursor-pointer transition-colors group ${
                  currentConversationId === conv.id
                    ? 'bg-primary-50 border-l-4 border-primary-800'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {conv.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(conv.updated_at)}</span>
                      <span>•</span>
                      <span>{conv.message_count ?? conv.messages?.length ?? 0} 条消息</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleExport(e, conv.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600"
                      title="导出对话"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600"
                      title="删除对话"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
