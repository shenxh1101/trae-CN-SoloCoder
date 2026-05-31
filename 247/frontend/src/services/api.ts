import axios from 'axios';
import type {
  ChatRequest,
  ChatResponse,
  VoteRequest,
  VoteResponse,
  Conversation,
  KnowledgeEntry,
  MissedQuestion,
  AdminStats,
  BackupFile
} from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const chatApi = {
  sendMessage: (data: ChatRequest): Promise<ChatResponse> =>
    api.post('/chat', data).then(res => res.data),

  sendFollowUp: (sessionId: string, data: Omit<ChatRequest, 'sessionId'>): Promise<ChatResponse> =>
    api.post(`/chat/${sessionId}/followup`, data).then(res => res.data),

  vote: (data: VoteRequest): Promise<VoteResponse> =>
    api.post('/vote', data).then(res => res.data),

  exportConversation: (sessionId: string): Promise<void> =>
    api.get(`/export/${sessionId}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        const disposition = res.headers['content-disposition'];
        const filename = disposition?.split('filename=')[1]?.replace(/"/g, '') || `consultation_${sessionId}.txt`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }),

  getConversations: (): Promise<{ success: boolean; data: Conversation[] }> =>
    api.get('/conversations').then(res => res.data),

  getConversation: (sessionId: string): Promise<{ success: boolean; data: Conversation }> =>
    api.get(`/conversations/${sessionId}`).then(res => res.data),

  deleteConversation: (sessionId: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/conversations/${sessionId}`).then(res => res.data),
};

export const adminApi = {
  login: (username: string, password: string): Promise<{ success: boolean; access_token?: string; username?: string; message: string }> =>
    api.post('/admin/login', { username, password }).then(res => res.data),

  getStats: (): Promise<{ success: boolean; data: AdminStats }> =>
    api.get('/admin/stats').then(res => res.data),

  getMissedQuestions: (limit?: number): Promise<{ success: boolean; data: MissedQuestion[] }> =>
    api.get('/admin/missed', { params: limit ? { limit } : {} }).then(res => res.data),

  deleteMissedQuestion: (id: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/admin/missed/${id}`).then(res => res.data),

  getKnowledgeEntries: (keyword?: string): Promise<{ success: boolean; data: KnowledgeEntry[] }> =>
    api.get('/admin/knowledge', { params: keyword ? { keyword } : {} }).then(res => res.data),

  addKnowledgeEntry: (data: Partial<KnowledgeEntry>): Promise<{ success: boolean; data: KnowledgeEntry; message: string }> =>
    api.post('/admin/knowledge', data).then(res => res.data),

  updateKnowledgeEntry: (id: string, data: Partial<KnowledgeEntry>): Promise<{ success: boolean; data: KnowledgeEntry; message: string }> =>
    api.put(`/admin/knowledge/${id}`, data).then(res => res.data),

  deleteKnowledgeEntry: (id: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/admin/knowledge/${id}`).then(res => res.data),

  addFromMissed: (missedId: string, data: Partial<KnowledgeEntry>): Promise<{ success: boolean; data: KnowledgeEntry; message: string }> =>
    api.post('/admin/knowledge/from-missed', { missedId, ...data }).then(res => res.data),

  createBackup: (): Promise<{ success: boolean; backup_file: string; created_at: string }> =>
    api.post('/admin/backup').then(res => res.data),

  getBackups: (): Promise<{ success: boolean; data: BackupFile[] }> =>
    api.get('/admin/backups').then(res => res.data),

  restoreBackup: (filename: string): Promise<{ success: boolean; restored_from: string; entries_count: number }> =>
    api.post(`/admin/backups/${filename}/restore`).then(res => res.data),

  deleteBackup: (filename: string): Promise<{ success: boolean; deleted_file: string }> =>
    api.delete(`/admin/backups/${filename}`).then(res => res.data),

  getVoteStats: (entryId: string): Promise<{ success: boolean; data: { helpful_count: number; not_helpful_count: number; helpful_rate: number; current_weight: number } }> =>
    api.get(`/admin/vote-stats/${entryId}`).then(res => res.data),
};

export default api;
