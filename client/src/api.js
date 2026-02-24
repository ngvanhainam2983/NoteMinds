import axios from 'axios';
import { encryptDataForServer, decryptDataFromServer } from './encryptionService.js';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes for AI processing
});

// ── Token management ──────────────────────────────────

const TOKEN_KEY = 'notemind_token';
const USER_KEY = 'notemind_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Attach token to every request automatically and encrypt if needed
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Encrypt POST, PUT, PATCH requests (except file uploads)
  if (['POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase())) {
    if (config.data && !(config.data instanceof FormData)) {
      try {
        const encrypted = encryptDataForServer(config.data);
        config.data = encrypted;
        config.headers['X-Encrypted'] = 'true';
      } catch (error) {
        console.error('Request encryption failed:', error);
        // Continue without encryption if it fails
      }
    }
  }

  return config;
});

// Decrypt responses
api.interceptors.response.use(
  (response) => {
    // Decrypt response if it contains encrypted data
    if (response.data && response.data.encrypted && response.data.iv) {
      try {
        response.data = decryptDataFromServer(response.data);
      } catch (error) {
        console.error('Response decryption failed:', error);
        // Continue with original response if decryption fails
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Auth API ──────────────────────────────────────────

export async function register(username, email, password, displayName) {
  const response = await api.post('/auth/register', { username, email, password, displayName });
  const { token, user } = response.data;
  storeAuth(token, user);
  return { token, user };
}

export async function login(login, password) {
  const response = await api.post('/auth/login', { login, password });
  const { token, user } = response.data;
  storeAuth(token, user);
  return { token, user };
}

export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data.user;
}

export function logout() {
  clearAuth();
}

export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

  return response.data;
}

export async function getDocumentStatus(docId) {
  const response = await api.get(`/documents/${docId}/status`);
  return response.data;
}

export async function generateMindmap(docId) {
  const response = await api.post(`/documents/${docId}/mindmap`);
  return response.data;
}

export async function generateFlashcards(docId) {
  const response = await api.post(`/documents/${docId}/flashcards`);
  return response.data;
}

export async function chatWithDocument(docId, message, history) {
  const response = await api.post(`/documents/${docId}/chat`, {
    message,
    history,
  });
  return response.data;
}

export async function healthCheck() {
  const response = await api.get('/health');
  return response.data;
}

export async function getRateLimit() {
  const response = await api.get('/rate-limit');
  return response.data;
}

export async function deleteDocument(docId) {
  const response = await api.delete(`/documents/${docId}`);
  return response.data;
}

// ── Profile API ───────────────────────────────────────

export async function updateProfile(displayName, email) {
  const response = await api.put('/auth/profile', { displayName, email });
  const { user } = response.data;
  storeAuth(getStoredToken(), user);
  return user;
}

export async function changePassword(oldPassword, newPassword) {
  const response = await api.put('/auth/password', { oldPassword, newPassword });
  return response.data;
}

// ── Admin API ─────────────────────────────────────────

export async function adminGetUsers() {
  const response = await api.get('/admin/users');
  return response.data.users;
}

export async function adminSetPlan(userId, plan, expiresAt) {
  const response = await api.put(`/admin/users/${userId}/plan`, { plan, expiresAt });
  return response.data.user;
}

export async function adminSetRole(userId, role) {
  const response = await api.put(`/admin/users/${userId}/role`, { role });
  return response.data.user;
}

export async function adminBanUser(userId, reason) {
  const response = await api.put(`/admin/users/${userId}/ban`, { reason });
  return response.data.user;
}

export async function adminUnbanUser(userId) {
  const response = await api.put(`/admin/users/${userId}/unban`);
  return response.data.user;
}

export async function adminGetBannedIps() {
  const response = await api.get('/admin/banned-ips');
  return response.data.ips;
}

export async function adminBanIp(ip, reason) {
  const response = await api.post('/admin/ban-ip', { ip, reason });
  return response.data;
}

export async function adminUnbanIp(ip) {
  const response = await api.delete(`/admin/ban-ip/${ip}`);
  return response.data;
}

export async function adminGetPlans() {
  const response = await api.get('/admin/plans');
  return response.data.plans;
}

export default api;
