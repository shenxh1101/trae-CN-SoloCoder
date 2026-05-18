const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `请求失败: ${response.status}`);
  }

  return data;
}

export const api = {
  users: {
    getAll: () => request('/users'),
    getById: (id) => request(`/users/${id}`),
    create: (username) => request('/users', {
      method: 'POST',
      body: JSON.stringify({ username })
    })
  },

  projects: {
    getAll: () => request('/projects'),
    search: (q) => request(`/projects/search?q=${encodeURIComponent(q)}`),
    getById: (id) => request(`/projects/${id}`),
    create: (data) => request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/projects/${id}`, {
      method: 'DELETE'
    })
  },

  tasks: {
    getByProject: (projectId, filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return request(`/projects/${projectId}/tasks${params ? `?${params}` : ''}`);
    },
    getById: (id) => request(`/tasks/${id}`),
    create: (projectId, data) => request(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/tasks/${id}`, {
      method: 'DELETE'
    }),
    getUpcoming: () => request('/tasks/upcoming')
  },

  comments: {
    getByTask: (taskId) => request(`/tasks/${taskId}/comments`),
    create: (taskId, data) => request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/comments/${id}`, {
      method: 'DELETE'
    })
  },

  dashboard: {
    getStats: () => request('/dashboard/stats')
  }
};
