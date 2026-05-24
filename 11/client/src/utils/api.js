import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const createSnippet = async (data) => {
  const response = await api.post('/snippets', data);
  return response.data;
};

export const getSnippet = async (id) => {
  const response = await api.get(`/snippets/${id}`);
  return response.data;
};

export const executeCode = async (code, language) => {
  const response = await api.post('/execute', { code, language });
  return response.data;
};

export const getLanguages = async () => {
  const response = await api.get('/languages');
  return response.data;
};

export const getHistory = async (snippetId) => {
  const response = await api.get(`/snippets/${snippetId}/history`);
  return response.data;
};

export const getDiff = async (snippetId, version1, version2) => {
  const response = await api.get(`/snippets/${snippetId}/diff`, {
    params: { version1, version2 }
  });
  return response.data;
};

export const exportGist = async (code, language, description) => {
  const response = await api.post('/export/gist', { code, language, description });
  return response.data;
};

export const downloadFile = (code, language, filename) => {
  const extensions = {
    javascript: 'js',
    python: 'py',
    java: 'java',
    go: 'go',
    html: 'html'
  };
  
  const ext = extensions[language] || 'txt';
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || 'main'}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default api;
