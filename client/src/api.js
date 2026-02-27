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

export async function login(loginVal, password) {
  const response = await api.post('/auth/login', { login: loginVal, password });
  const data = response.data;

  // If 2FA is required, return the flag + temp token without storing auth
  if (data.requires2FA) {
    return {
      requires2FA: true,
      tempToken: data.tempToken,
      totpEnabled: data.totpEnabled,
      passkeyEnabled: data.passkeyEnabled,
    };
  }

  const { token, user } = data;
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

// ── Email Verification & Password Reset ───────────────

export async function verifyEmailToken(token) {
  const response = await api.post('/auth/verify-email', { token });
  return response.data;
}

export async function resendVerification(email) {
  const response = await api.post('/auth/resend-verification', { email });
  return response.data;
}

export async function forgotPassword(email) {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
}

export async function resetPassword(token, newPassword) {
  const response = await api.post('/auth/reset-password', { token, newPassword });
  return response.data;
}

// ── 2FA API ────────────────────────────────────────

export async function verify2FA(tempToken, totpCode) {
  const response = await api.post('/auth/2fa/verify', { tempToken, totpCode });
  const { token, user } = response.data;
  storeAuth(token, user);
  return { token, user };
}

export async function verify2FARecovery(tempToken, recoveryCode) {
  const response = await api.post('/auth/2fa/recovery', { tempToken, recoveryCode });
  const { token, user } = response.data;
  storeAuth(token, user);
  return { token, user };
}

export async function setup2FA() {
  const response = await api.post('/auth/2fa/setup');
  return response.data;
}

export async function enable2FA(token) {
  const response = await api.post('/auth/2fa/enable', { token });
  return response.data;
}

export async function disable2FA(password) {
  const response = await api.post('/auth/2fa/disable', { password });
  return response.data;
}

export async function get2FAStatus() {
  const response = await api.get('/auth/2fa/status');
  return response.data;
}

export async function regenerateRecoveryCodes(password) {
  const response = await api.post('/auth/2fa/recovery-codes', { password });
  return response.data;
}

// ── Passkey API ───────────────────────────────────────

export async function getPasskeyRegisterOptions() {
  const response = await api.post('/auth/passkey/register-options');
  return response.data;
}

export async function verifyPasskeyRegistration(passkeyResponse, name) {
  const response = await api.post('/auth/passkey/register-verify', { response: passkeyResponse, name });
  return response.data;
}

export async function getPasskeyAuthOptions(tempToken) {
  const response = await api.post('/auth/passkey/auth-options', { tempToken });
  return response.data;
}

export async function verifyPasskeyAuth(tempToken, passkeyResponse) {
  const response = await api.post('/auth/passkey/auth-verify', { tempToken, response: passkeyResponse });
  const { token, user } = response.data;
  storeAuth(token, user);
  return { token, user };
}

export async function getPasskeyList() {
  const response = await api.get('/auth/passkey/list');
  return response.data;
}

export async function deletePasskey(id) {
  const response = await api.delete(`/auth/passkey/${id}`);
  return response.data;
}

export async function renamePasskey(id, name) {
  const response = await api.put(`/auth/passkey/${id}`, { name });
  return response.data;
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

export async function getDueFlashcards(docId) {
  const response = await api.get(`/documents/${docId}/flashcards/due`);
  return response.data;
}

export async function reviewFlashcard(docId, cardIdx, difficulty, timeElapsedMs = 0) {
  const response = await api.post(`/documents/${docId}/flashcards/${cardIdx}/review`, {
    difficulty,
    timeElapsedMs
  });
  return response.data;
}

export async function generateQuiz(docId) {
  const response = await api.post(`/documents/${docId}/quiz`);
  return response.data;
}

export async function downloadDocument(docId) {
  const response = await api.get(`/documents/${docId}/download`, {
    responseType: 'blob',
  });

  // Extract filename from Content-Disposition header if available
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'document.txt'; // fallback
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch.length === 2) {
      filename = filenameMatch[1];
    }
  }

  return { blob: response.data, filename };
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

export async function getDocumentHistory() {
  const response = await api.get('/documents/history');
  return response.data.documents;
}

export async function getDocumentSessions(docId) {
  const response = await api.get(`/documents/${docId}/sessions`);
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

// ── Conversations (Chat History) ──────────────────────

export async function getConversations(documentId) {
  const response = await api.get(`/conversations/${documentId}`);
  return response.data.conversations;
}

export async function getConversationHistory(documentId) {
  const response = await api.get(`/conversations/${documentId}/history`);
  return response.data.conversations;
}

export async function getConversationMessages(conversationId) {
  const response = await api.get(`/conversation/${conversationId}`);
  return response.data.messages;
}

export async function saveConversation(documentId, messages, title) {
  const response = await api.post('/conversation/save', { documentId, messages, title });
  return response.data;
}

export async function addMessageToConversation(conversationId, role, message) {
  const response = await api.post(`/conversation/${conversationId}/message`, { role, message });
  return response.data;
}

export async function deleteConversation(conversationId) {
  const response = await api.delete(`/conversation/${conversationId}`);
  return response.data;
}

// ── Favorites ─────────────────────────────────────────

export async function addFavorite(documentId) {
  const response = await api.post(`/favorites/${documentId}`);
  return response.data;
}

export async function removeFavorite(documentId) {
  const response = await api.delete(`/favorites/${documentId}`);
  return response.data;
}

export async function getFavorites() {
  const response = await api.get('/favorites');
  return response.data.favorites;
}

export async function checkFavorite(documentId) {
  const response = await api.get(`/favorites/${documentId}/check`);
  return response.data.isFavorite;
}

// ── Tags ──────────────────────────────────────────────

export async function createTag(name, color) {
  const response = await api.post('/tags', { name, color });
  return response.data;
}

export async function getUserTags() {
  const response = await api.get('/tags');
  return response.data.tags;
}

export async function addTagToDocument(documentId, tagId) {
  const response = await api.post(`/documents/${documentId}/tags/${tagId}`);
  return response.data;
}

export async function removeTagFromDocument(documentId, tagId) {
  const response = await api.delete(`/documents/${documentId}/tags/${tagId}`);
  return response.data;
}

export async function getDocumentTags(documentId) {
  const response = await api.get(`/documents/${documentId}/tags`);
  return response.data.tags;
}

// ── Search ────────────────────────────────────────────

export async function searchDocuments(query, limit = 20) {
  const response = await api.post('/search', { query, limit });
  return response.data;
}

// ── Analytics ─────────────────────────────────────────

export async function getAnalytics(days = 7) {
  const response = await api.get(`/analytics?days=${days}`);
  return response.data;
}

// ── Sharing ───────────────────────────────────────────

export async function createShareLink(documentId, shareType = 'view', expiresIn = 7) {
  const response = await api.post(`/share/${documentId}`, { shareType, expiresIn });
  return response.data;
}

export async function validateShareToken(token) {
  const response = await api.get(`/shared/${token}`);
  return response.data;
}

export async function getSharedDocumentContent(token) {
  const response = await api.get(`/shared/${token}/content`);
  return response.data;
}

export async function shareGenerateMindmap(token) {
  const response = await api.post(`/shared/${token}/mindmap`);
  return response.data;
}

export async function shareGenerateFlashcards(token) {
  const response = await api.post(`/shared/${token}/flashcards`);
  return response.data;
}

export async function shareChatWithDocument(token, message, history) {
  const response = await api.post(`/shared/${token}/chat`, { message, history });
  return response.data;
}

export async function getSharedDocuments(documentId = null) {
  const params = documentId ? `?documentId=${documentId}` : '';
  const response = await api.get(`/shares${params}`);
  return response.data.shares;
}

export async function deleteShareLink(shareId) {
  const response = await api.delete(`/shares/${shareId}`);
  return response.data;
}

// ── Spaced Repetition ─────────────────────────────────

export async function getFlashcardStats() {
  const response = await api.get('/flashcards/stats');
  return response.data;
}

// ── Export ─────────────────────────────────────────────

export async function exportFlashcardsCSV(documentId) {
  const response = await api.post(`/export/flashcards/${documentId}`);
  return response.data;
}

export async function exportConversationPDF(conversationId) {
  const response = await api.post(`/export/conversation/${conversationId}`);
  return response.data;
}

// ── User Preferences ──────────────────────────────────

export async function getPreferences() {
  const response = await api.get('/preferences');
  return response.data;
}

export async function setPreference(key, value) {
  const response = await api.put('/preferences', { key, value });
  return response.data;
}

// ── Offline Sync ──────────────────────────────────────

export async function getPendingSyncActions() {
  const response = await api.get('/sync/pending');
  return response.data.pending;
}

export async function queueSyncAction(entityType, entityId, action, data) {
  const response = await api.post('/sync/action', { entityType, entityId, action, data });
  return response.data;
}

export async function markSynced(syncId) {
  const response = await api.post(`/sync/mark/${syncId}`);
  return response.data;
}

// ── Learning Paths (AI Recommendations) ───────────────

export default api;
