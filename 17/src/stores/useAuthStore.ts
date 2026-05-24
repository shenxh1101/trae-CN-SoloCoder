import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse } from '@/shared/types';
import { apiClient } from '@/lib/apiClient';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithCredentials: (user: User, token: string) => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err: unknown) {
          const error = err as { response?: { data?: { message?: string } } };
          set({ error: error.response?.data?.message || '登录失败', isLoading: false });
          throw err;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await apiClient.post<AuthResponse>('/auth/register', { username, email, password });
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err: unknown) {
          const error = err as { response?: { data?: { message?: string } } };
          set({ error: error.response?.data?.message || '注册失败', isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      loginWithCredentials: (user: User, token: string) => {
        set({ user, token, isLoading: false, error: null });
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
