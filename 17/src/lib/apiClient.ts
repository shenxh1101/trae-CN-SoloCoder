import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res && typeof res === 'object' && 'success' in res) {
      if (res.success) {
        if (Array.isArray(res.data)) {
          const transformed: any = {
            snippets: res.data,
          };
          if (res.pagination) {
            transformed.total = res.pagination.total;
            transformed.hasMore = res.pagination.page < res.pagination.pages;
          }
          response.data = transformed;
        } else if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray(res.data.data)) {
          const transformed: any = {
            snippets: res.data.data,
          };
          if (res.pagination) {
            transformed.total = res.pagination.total;
            transformed.hasMore = res.pagination.page < res.pagination.pages;
          }
          response.data = transformed;
        } else {
          response.data = res.data;
        }
      } else {
        return Promise.reject(new Error(res.error || '请求失败'));
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
