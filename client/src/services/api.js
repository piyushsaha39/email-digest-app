import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  // Global timeout stays at 65 seconds for normal UI clicks
  timeout: 65000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getToken() {
  return localStorage.getItem('sessionToken');
}

export function setToken(token) {
  localStorage.setItem('sessionToken', token);
}

export function clearToken() {
  localStorage.removeItem('sessionToken');
}

export function getGoogleAuthUrl() {
  return `${API_BASE}/auth/google`;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    clearToken();
  }
}

export async function getCurrentUser() {
  const { data } = await api.get('/api/user/me');
  return data.user;
}

export async function getTodayEmails() {
  const { data } = await api.get('/api/emails/today');
  return data.emails;
}

export async function getRecentEmails() {
  const { data } = await api.get('/api/emails/recent');
  return data;
}

export async function getEmailsByDate(date) {
  const { data } = await api.get(`/api/emails/date/${date}`);
  return data;
}

export async function getEmailById(id) {
  const { data } = await api.get(`/api/emails/${id}`);
  return data.email;
}

export async function markEmailAsRead(id) {
  const { data } = await api.patch(`/api/emails/${id}/read`);
  return data.email;
}

export async function runDigest(targetDate = null) {
  const body = targetDate ? { targetDate } : {};
  // 🚀 THE FIX: Overriding the timeout to 6 minutes (360,000ms) 
  // exclusively for this heavy AI processing task.
  const { data } = await api.post('/api/digest/run', body, { timeout: 360000 });
  return data;
}

/** @deprecated Use runDigest */
export async function runManualDigest(targetDate = null) {
  return runDigest(targetDate);
}

export async function saveFcmToken(token) {
  const { data } = await api.post('/api/notifications/token', { token });
  return data;
}

export default api;