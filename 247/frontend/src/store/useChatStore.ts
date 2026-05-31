import { create } from 'zustand';
import type { Message, Conversation } from '../types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentStyle: 'simple' | 'professional';
  isLoading: boolean;
  error: string | null;
  
  setCurrentConversation: (id: string | null) => void;
  setStyle: (style: 'simple' | 'professional') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  
  getCurrentConversation: () => Conversation | undefined;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  currentStyle: 'simple',
  isLoading: false,
  error: null,

  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setStyle: (style) => set({ currentStyle: style }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations],
    currentConversationId: conversation.id,
  })),

  updateConversation: (id, updates) => set((state) => ({
    conversations: state.conversations.map(conv =>
      conv.id === id ? { ...conv, ...updates } : conv
    ),
  })),

  deleteConversation: (id) => set((state) => ({
    conversations: state.conversations.filter(conv => conv.id !== id),
    currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
  })),

  setConversations: (conversations) => set({ conversations }),

  addMessage: (conversationId, message) => set((state) => ({
    conversations: state.conversations.map(conv =>
      conv.id === conversationId
        ? {
            ...conv,
            messages: [...conv.messages, message],
            updated_at: message.timestamp,
          }
        : conv
    ),
  })),

  updateMessage: (conversationId, messageId, updates) => set((state) => ({
    conversations: state.conversations.map(conv =>
      conv.id === conversationId
        ? {
            ...conv,
            messages: conv.messages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          }
        : conv
    ),
  })),

  getCurrentConversation: () => {
    const { conversations, currentConversationId } = get();
    return conversations.find(conv => conv.id === currentConversationId);
  },

  clearAll: () => set({
    conversations: [],
    currentConversationId: null,
    isLoading: false,
    error: null,
  }),
}));

interface AdminState {
  isLoggedIn: boolean;
  username: string | null;
  token: string | null;
  
  login: (token: string, username: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAdminStore = create<AdminState>((set, get) => {
  const storedToken = localStorage.getItem('admin_token');
  const storedUsername = localStorage.getItem('admin_username');

  return {
    isLoggedIn: !!storedToken,
    username: storedUsername,
    token: storedToken,

    login: (token, username) => {
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_username', username);
      set({ isLoggedIn: true, token, username });
    },

    logout: () => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
      set({ isLoggedIn: false, token: null, username: null });
    },

    checkAuth: () => {
      const { token } = get();
      return !!token;
    },
  };
});
