import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const articlesAPI = {
  getArticles: (params) => api.get('/articles', { params }),
  getAllArticles: () => api.get('/articles/all'),
  getArticle: (slug) => api.get(`/articles/${slug}`),
  getArchive: () => api.get('/articles/archive'),
  createArticle: (data) => api.post('/articles', data),
  updateArticle: (id, data) => api.put(`/articles/${id}`, data),
  deleteArticle: (id) => api.delete(`/articles/${id}`),
  incrementViews: (id) => api.post(`/articles/${id}/views`),
  likeArticle: (id) => api.post(`/articles/${id}/like`),
  favoriteArticle: (id) => api.post(`/articles/${id}/favorite`),
};

export const usersAPI = {
  getUserProfile: (username) => api.get(`/users/profile/${username}`),
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
};

export const commentsAPI = {
  getComments: (articleId) => api.get(`/comments/${articleId}`),
  createComment: (articleId, data) => api.post(`/comments/${articleId}`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`),
};

export const tagsAPI = {
  getTags: () => api.get('/tags'),
  createTag: (data) => api.post('/tags', data),
  updateTag: (id, data) => api.put(`/tags/${id}`, data),
  deleteTag: (id) => api.delete(`/tags/${id}`),
};

export const uploadAPI = {
  uploadImage: (formData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
