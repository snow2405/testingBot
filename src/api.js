const API_BASE = '/api';

// Token management
let token = localStorage.getItem('pr_bot_token');

export function setToken(newToken) {
  token = newToken;
  if (newToken) {
    localStorage.setItem('pr_bot_token', newToken);
  } else {
    localStorage.removeItem('pr_bot_token');
  }
}

export function getToken() {
  return token;
}

// API helper
async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// API methods
export const api = {
  // Auth
  getAuthUrl: () => request('/auth/github', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Repos
  getRepos: () => request('/repos'),

  // PR Creation
  createPR: (repo, prompt) => 
    request('/create-pr', {
      method: 'POST',
      body: JSON.stringify({ repo, prompt }),
    }),

  // Jobs
  getJob: (id) => request(`/jobs/${id}`),
  getJobs: () => request('/jobs'),
};
