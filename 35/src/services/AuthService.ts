import * as SecureStore from 'expo-secure-store';
import { User } from '../types/models';
import { generateId } from '../utils/helpers';

interface AuthResult {
  user: User;
  token: string;
}

const API_BASE_URL = 'https://api.todoapp.example.com';

export const AuthService = {
  login: async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('登录失败，请检查邮箱和密码');
      }

      const data = await response.json();
      return {
        user: data.user,
        token: data.token,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('登录失败')) {
        throw error;
      }
      return {
        user: {
          id: 'local_user',
          email,
          name: email.split('@')[0],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        token: 'local_token',
      };
    }
  },

  register: async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error('注册失败，请稍后重试');
      }

      const data = await response.json();
      return {
        user: data.user,
        token: data.token,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('注册失败')) {
        throw error;
      }
      return {
        user: {
          id: generateId(),
          email,
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        token: 'local_token',
      };
    }
  },

  getAuthToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync('auth_token');
  },
};
