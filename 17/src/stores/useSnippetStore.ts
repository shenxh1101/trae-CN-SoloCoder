import { create } from 'zustand';
import type { Snippet, SearchQuery } from '@/shared/types';
import { apiClient } from '@/lib/apiClient';

interface SnippetState {
  snippets: Snippet[];
  currentSnippet: Snippet | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  hasMore: boolean;
  fetchSnippets: (query?: SearchQuery) => Promise<void>;
  fetchSnippetById: (id: string) => Promise<void>;
  fetchSnippetByShortCode: (shortCode: string) => Promise<void>;
  createSnippet: (snippet: Partial<Snippet>) => Promise<Snippet>;
  updateSnippet: (id: string, snippet: Partial<Snippet>) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  forkSnippet: (id: string) => Promise<Snippet>;
  likeSnippet: (id: string) => Promise<void>;
  favoriteSnippet: (id: string) => Promise<void>;
  setCurrentSnippet: (snippet: Snippet | null) => void;
  clearError: () => void;
}

export const useSnippetStore = create<SnippetState>((set, get) => ({
  snippets: [],
  currentSnippet: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  hasMore: true,

  fetchSnippets: async (query?: SearchQuery) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<{ snippets: Snippet[]; total: number; hasMore: boolean }>('/snippets', {
        params: query,
      });
      const page = query?.page || 1;
      if (page > 1) {
        set((state) => ({
          snippets: [...state.snippets, ...data.snippets],
          total: data.total,
          hasMore: data.hasMore,
          page,
          isLoading: false,
        }));
      } else {
        set({
          snippets: data.snippets,
          total: data.total,
          hasMore: data.hasMore,
          page,
          isLoading: false,
        });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '获取代码片段失败', isLoading: false });
      throw err;
    }
  },

  fetchSnippetById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<Snippet>(`/snippets/${id}`);
      set({ currentSnippet: data, isLoading: false });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '获取代码片段失败', isLoading: false });
      throw err;
    }
  },

  fetchSnippetByShortCode: async (shortCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get<Snippet>(`/snippets/code/${shortCode}`);
      set({ currentSnippet: data, isLoading: false });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '获取代码片段失败', isLoading: false });
      throw err;
    }
  },

  createSnippet: async (snippet: Partial<Snippet>) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post<Snippet>('/snippets', snippet);
      set((state) => ({
        snippets: [data, ...state.snippets],
        isLoading: false,
      }));
      return data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '创建代码片段失败', isLoading: false });
      throw err;
    }
  },

  updateSnippet: async (id: string, snippet: Partial<Snippet>) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.put<Snippet>(`/snippets/${id}`, snippet);
      set((state) => ({
        snippets: state.snippets.map((s) => (s.id === id ? data : s)),
        currentSnippet: state.currentSnippet?.id === id ? data : state.currentSnippet,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '更新代码片段失败', isLoading: false });
      throw err;
    }
  },

  deleteSnippet: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/snippets/${id}`);
      set((state) => ({
        snippets: state.snippets.filter((s) => s.id !== id),
        currentSnippet: state.currentSnippet?.id === id ? null : state.currentSnippet,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '删除代码片段失败', isLoading: false });
      throw err;
    }
  },

  forkSnippet: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post<Snippet>(`/snippets/${id}/fork`);
      set((state) => ({
        snippets: [data, ...state.snippets],
        isLoading: false,
      }));
      return data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '复刻代码片段失败', isLoading: false });
      throw err;
    }
  },

  likeSnippet: async (id: string) => {
    try {
      await apiClient.post(`/snippets/${id}/like`);
      set((state) => ({
        snippets: state.snippets.map((s) =>
          s.id === id ? { ...s, likesCount: s.likesCount + 1 } : s
        ),
        currentSnippet: state.currentSnippet?.id === id
          ? { ...state.currentSnippet, likesCount: state.currentSnippet.likesCount + 1 }
          : state.currentSnippet,
      }));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '点赞失败' });
      throw err;
    }
  },

  favoriteSnippet: async (id: string) => {
    try {
      await apiClient.post(`/snippets/${id}/favorite`);
      set((state) => ({
        snippets: state.snippets.map((s) =>
          s.id === id ? { ...s, favoritesCount: s.favoritesCount + 1 } : s
        ),
        currentSnippet: state.currentSnippet?.id === id
          ? { ...state.currentSnippet, favoritesCount: state.currentSnippet.favoritesCount + 1 }
          : state.currentSnippet,
      }));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({ error: error.response?.data?.message || '收藏失败' });
      throw err;
    }
  },

  setCurrentSnippet: (snippet: Snippet | null) => {
    set({ currentSnippet: snippet });
  },

  clearError: () => {
    set({ error: null });
  },
}));
