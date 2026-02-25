import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processDocument } from './services/documentProcessor.js';
import { generateMindmap } from './services/mindmapGenerator.js';
import { generateFlashcards } from './services/flashcardGenerator.js';
import { chatWithDocument } from './services/chatService.js';
import {
  createUser, authenticateUser, generateToken, getUserById,
  optionalAuth, requireAuth, requireAdmin,
  getUploadCount, logUpload, getUploadLimit, getChatLimit,
  getAllUsers, setUserPlan, setUserRole,
  updateUserProfile, changePassword, ensureAdmin,
  banUser, unbanUser, banIp, unbanIp, getBannedIps, isIpBanned, updateLastIp,
  GUEST_DAILY_LIMIT, PLANS,
} from './services/authService.js';
import { decryptMiddleware } from './middleware/encryptionMiddleware.js';
import { initializeIndexes, getDatabaseStats } from './services/databaseIndexes.js';
import { initializeEnhancedTables } from './services/enhancedDatabase.js';
import { logger, requestLoggerMiddleware } from './services/logger.js';
import featureRoutes from './routes/featuresRoutes.js';
import { validateShareToken } from './services/advancedFeatureService.js';
import Database from 'better-sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy (nginx) for correct client IP
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging middleware
app.use(requestLoggerMiddleware);

// Decryption middleware for encrypted requests
app.use(decryptMiddleware);

// Serve static frontend in production
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.md', '.docx', '.doc', '.pptx', '.xlsx', '.csv', '.mp3', '.wav', '.m4a', '.ogg', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  }
});

// In-memory document store
const documents = new Map();

// ── SSE: live-update listeners per document ──
// Map<documentId, Set<Response>>
const docListeners = new Map();

function addDocListener(docId, res) {
  if (!docListeners.has(docId)) docListeners.set(docId, new Set());
  docListeners.get(docId).add(res);
}

function removeDocListener(docId, res) {
  const set = docListeners.get(docId);
  if (set) {
    set.delete(res);
    if (set.size === 0) docListeners.delete(docId);
  }
}

function broadcastDocEvent(docId, eventType, data) {
  const set = docListeners.get(docId);
  if (!set || set.size === 0) return;
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch { /* client gone */ }
  }
}

// Database path for document persistence
const DB_PATH = path.join(__dirname, 'data', 'notemind.db');

function persistDocumentToDB(docId, userId, filePath, originalName, status, textLength = 0) {
  try {
    const db = new Database(DB_PATH);
    const existing = db.prepare('SELECT id FROM documents WHERE id = ?').get(docId);
    if (existing) {
      db.prepare(`
        UPDATE documents SET status = ?, text_length = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(status, textLength, docId);
    } else {
      db.prepare(`
        INSERT INTO documents (id, user_id, file_path, original_name, status, text_length)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(docId, userId || null, filePath, originalName, status, textLength);
    }
    db.close();
  } catch (err) {
    console.error('[DB] Error persisting document:', err.message);
  }
}

// Helper to extract real client IP (behind nginx proxy)
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.ip
    || req.connection?.remoteAddress
    || 'unknown';
}

// Ban check middleware
function checkBan(req, res, next) {
  const ip = getClientIp(req);
  if (isIpBanned(ip)) {
    return res.status(403).json({ error: 'IP của bạn đã bị chặn truy cập.' });
  }
  next();
}

// Apply ban check to all API routes
app.use('/api', checkBan);

// ============ AUTH ROUTES ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    const user = createUser(username, email, password, displayName);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập/email và mật khẩu' });
    }
    const ip = getClientIp(req);
    const user = authenticateUser(login, password, ip);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  // Update IP on each auth check
  const ip = getClientIp(req);
  updateLastIp(req.user.id, ip);
  res.json({ user: req.user });
});

// ============ USER PROFILE ============

app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { displayName, email } = req.body;
    const updated = updateUserProfile(req.user.id, displayName, email);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/auth/password', requireAuth, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    changePassword(req.user.id, oldPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ ADMIN ROUTES ============

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const users = getAllUsers();
  res.json({ users });
});

app.put('/api/admin/users/:userId/plan', requireAuth, requireAdmin, (req, res) => {
  try {
    const { plan, expiresAt } = req.body;
    const updated = setUserPlan(Number(req.params.userId), plan, expiresAt);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/users/:userId/role', requireAuth, requireAdmin, (req, res) => {
  try {
    const { role } = req.body;
    const updated = setUserRole(Number(req.params.userId), role);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/plans', requireAuth, requireAdmin, (req, res) => {
  res.json({ plans: PLANS });
});

// Ban/unban user
app.put('/api/admin/users/:userId/ban', requireAuth, requireAdmin, (req, res) => {
  try {
    const { reason } = req.body;
    const updated = banUser(Number(req.params.userId), reason);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/users/:userId/unban', requireAuth, requireAdmin, (req, res) => {
  try {
    const updated = unbanUser(Number(req.params.userId));
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// IP ban management
app.get('/api/admin/banned-ips', requireAuth, requireAdmin, (req, res) => {
  const ips = getBannedIps();
  res.json({ ips });
});

app.post('/api/admin/ban-ip', requireAuth, requireAdmin, (req, res) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ error: 'Vui lòng nhập IP' });
    // Prevent admin from banning their own IP
    const adminIp = getClientIp(req);
    if (ip === adminIp || ip === '::1' && adminIp === '::1') {
      return res.status(400).json({ error: 'Không thể chặn IP của chính bạn!' });
    }
    banIp(ip, reason, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/ban-ip/:ip', requireAuth, requireAdmin, (req, res) => {
  try {
    unbanIp(req.params.ip);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ UPLOAD LIMIT (auth-aware) ============

function uploadRateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = req.user?.id || null;
  const limit = getUploadLimit(req.user);
  const used = getUploadCount(userId, ip);
  const remaining = Math.max(0, limit - used);

  if (remaining <= 0 && limit !== -1) {
    if (!req.user) {
      return res.status(429).json({
        error: 'Bạn đã dùng hết lượt upload miễn phí. Đăng ký tài khoản để có thêm lượt!',
        uploadLimitReached: true,
        requireAuth: true,
        remaining: 0,
      });
    }
    return res.status(429).json({
      error: `Đã dùng hết ${limit} lượt upload hôm nay. Nâng cấp gói để có thêm lượt!`,
      uploadLimitReached: true,
      remaining: 0,
    });
  }

  // Log the upload
  logUpload(userId, ip);
  next();
}

// ============ ROUTES ============

// Upload and process document
app.post('/api/upload', optionalAuth, uploadRateLimitMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Free/guest users cannot upload audio files
    const audioExts = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    const userPlan = req.user?.plan || 'free';
    if (audioExts.includes(ext) && (userPlan === 'free' || !req.user)) {
      // Delete the uploaded file
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({
        error: 'Gói Free không hỗ trợ file âm thanh. Nâng cấp gói để sử dụng tính năng này!',
        requireUpgrade: true,
      });
    }

    const docId = uuidv4();
    const filePath = req.file.path;
    // Multer encodes originalname as latin1; decode it back to UTF-8 for Vietnamese support
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    res.json({
      docId,
      fileName: originalName,
      status: 'processing',
      message: 'File uploaded. Processing...'
    });

    // Persist to DB immediately (processing state)
    const userId = req.user?.id || null;
    persistDocumentToDB(docId, userId, filePath, originalName, 'processing');

    // Process in background
    try {
      const extractedText = await processDocument(filePath);
      documents.set(docId, {
        id: docId,
        fileName: originalName,
        filePath,
        text: extractedText,
        status: 'ready',
        createdAt: new Date().toISOString()
      });
      persistDocumentToDB(docId, userId, filePath, originalName, 'ready', extractedText.length);
      console.log(`Document ${docId} processed successfully (${extractedText.length} chars)`);
    } catch (err) {
      documents.set(docId, {
        id: docId,
        fileName: originalName,
        filePath,
        text: '',
        status: 'error',
        error: err.message,
        createdAt: new Date().toISOString()
      });
      persistDocumentToDB(docId, userId, filePath, originalName, 'error', 0);
      console.error(`Document ${docId} processing failed:`, err.message);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get document history (for logged-in users) — must be before :docId routes
app.get('/api/documents/history', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ documents: [] });
    }
    const db = new Database(DB_PATH);
    const docs = db.prepare(`
      SELECT id, original_name, status, text_length, deleted_at, created_at, updated_at
      FROM documents
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId);
    db.close();
    res.json({ documents: docs });
  } catch (error) {
    console.error('Error getting document history:', error.message);
    res.json({ documents: [] });
  }
});

// Get saved sessions for a document (history viewer)
app.get('/api/documents/:docId/sessions', optionalAuth, (req, res) => {
  try {
    const docId = req.params.docId;
    const db = new Database(DB_PATH);
    // Get document info (verify ownership if user is logged in)
    const doc = db.prepare('SELECT id, user_id, original_name, status, text_length, deleted_at, created_at FROM documents WHERE id = ?').get(docId);
    if (!doc) {
      db.close();
      return res.status(404).json({ error: 'Document not found' });
    }
    // Check ownership
    if (req.user?.id && doc.user_id && doc.user_id !== req.user.id) {
      db.close();
      return res.status(403).json({ error: 'Access denied' });
    }
    db.close();

    const sessions = getAllDocumentSessions(docId);
    const isFileDeleted = !!doc.deleted_at || !documents.has(docId);

    res.json({
      document: {
        id: doc.id,
        originalName: doc.original_name,
        status: doc.status,
        textLength: doc.text_length,
        deletedAt: doc.deleted_at,
        createdAt: doc.created_at,
        isFileDeleted,
      },
      sessions,
    });
  } catch (error) {
    console.error('Error getting document sessions:', error.message);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

// Check document status
app.get('/api/documents/:docId/status', (req, res) => {
  const doc = documents.get(req.params.docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({
    docId: doc.id,
    fileName: doc.fileName,
    status: doc.status,
    textLength: doc.text?.length || 0,
    error: doc.error
  });
});

// Delete document — only removes from in-memory cache (DB record kept for history)
app.delete('/api/documents/:docId', (req, res) => {
  documents.delete(req.params.docId);
  console.log(`Document ${req.params.docId} removed from memory`);
  res.json({ success: true });
});

// ── Session persistence helpers ──
function saveDocumentSession(docId, sessionType, data) {
  try {
    const db = new Database(DB_PATH);
    db.prepare(`
      INSERT INTO document_sessions (document_id, session_type, data, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(document_id, session_type) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
    `).run(docId, sessionType, JSON.stringify(data));
    db.close();
  } catch (err) {
    console.error(`[Session] Error saving ${sessionType} for ${docId}:`, err.message);
  }
}

function getDocumentSession(docId, sessionType) {
  try {
    const db = new Database(DB_PATH);
    const row = db.prepare('SELECT data FROM document_sessions WHERE document_id = ? AND session_type = ?').get(docId, sessionType);
    db.close();
    return row ? JSON.parse(row.data) : null;
  } catch (err) {
    console.error(`[Session] Error loading ${sessionType} for ${docId}:`, err.message);
    return null;
  }
}

function getAllDocumentSessions(docId) {
  try {
    const db = new Database(DB_PATH);
    const rows = db.prepare('SELECT session_type, data FROM document_sessions WHERE document_id = ?').all(docId);
    db.close();
    const sessions = {};
    for (const row of rows) {
      sessions[row.session_type] = JSON.parse(row.data);
    }
    return sessions;
  } catch (err) {
    console.error(`[Session] Error loading sessions for ${docId}:`, err.message);
    return {};
  }
}

// Generate mindmap
app.post('/api/documents/:docId/mindmap', async (req, res) => {
  try {
    const doc = documents.get(req.params.docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.status !== 'ready') {
      return res.status(400).json({ error: 'Document is still processing' });
    }

    const mindmap = await generateMindmap(doc.text, doc.fileName);
    saveDocumentSession(req.params.docId, 'mindmap', mindmap);
    broadcastDocEvent(req.params.docId, 'mindmap', mindmap);
    res.json(mindmap);
  } catch (error) {
    console.error('Mindmap generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate flashcards
app.post('/api/documents/:docId/flashcards', async (req, res) => {
  try {
    const doc = documents.get(req.params.docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.status !== 'ready') {
      return res.status(400).json({ error: 'Document is still processing' });
    }

    const flashcards = await generateFlashcards(doc.text, doc.fileName);
    saveDocumentSession(req.params.docId, 'flashcards', flashcards);
    broadcastDocEvent(req.params.docId, 'flashcards', flashcards);
    res.json(flashcards);
  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat with document (plan-based message limit per document)
app.post('/api/documents/:docId/chat', optionalAuth, async (req, res) => {
  try {
    const doc = documents.get(req.params.docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.status !== 'ready') {
      return res.status(400).json({ error: 'Document is still processing' });
    }

    const chatLimit = getChatLimit(req.user);

    // Initialise counter on first chat
    if (doc.chatCount === undefined) doc.chatCount = 0;

    if (chatLimit !== -1 && doc.chatCount >= chatLimit) {
      return res.status(429).json({
        error: `Đã đạt giới hạn ${chatLimit} tin nhắn cho tài liệu này. Nâng cấp gói để chat nhiều hơn!`,
        chatLimitReached: true,
        chatCount: doc.chatCount,
        chatLimit,
      });
    }

    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = await chatWithDocument(doc.text, message, history || []);
    doc.chatCount++;

    // Save chat session (last 50 messages)
    const chatHistory = [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: reply }].slice(-50);
    saveDocumentSession(req.params.docId, 'chat', chatHistory);
    broadcastDocEvent(req.params.docId, 'chat', chatHistory);

    res.json({ reply, chatCount: doc.chatCount, chatLimit });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limit status
app.get('/api/rate-limit', optionalAuth, (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = req.user?.id || null;
  const limit = getUploadLimit(req.user);
  const used = getUploadCount(userId, ip);
  const uploadsRemaining = limit === -1 ? 999 : Math.max(0, limit - used);
  const chatLimitVal = getChatLimit(req.user);

  res.json({
    uploadLimit: limit === -1 ? '∞' : limit,
    uploadsRemaining: limit === -1 ? 999 : uploadsRemaining,
    chatLimit: chatLimitVal === -1 ? '∞' : chatLimitVal,
    isGuest: !req.user,
    isUnlimited: limit === -1,
    plan: req.user?.plan || 'guest',
    planLabel: req.user?.planLabel || 'Guest',
  });
});

// Feature routes - all advanced features (chat history, favorites, tags, search, analytics, sharing, spaced repetition, exports, sync, preferences)
app.use('/api', featureRoutes);

// ── Share helper: validate token & ensure doc is in memory ──
async function resolveSharedDocument(shareToken) {
  const share = validateShareToken(shareToken);
  if (!share) return { error: 'Link chia sẻ không hợp lệ hoặc đã hết hạn', status: 403 };

  const docId = share.document_id;

  // Try in-memory first
  const memDoc = documents.get(docId);
  if (memDoc && memDoc.text && memDoc.status === 'ready') {
    return { share, doc: memDoc };
  }

  // Fall back to DB file_path + re-process
  const db = new Database(DB_PATH);
  const dbDoc = db.prepare('SELECT file_path, original_name, status FROM documents WHERE id = ?').get(docId);
  db.close();

  if (!dbDoc || !dbDoc.file_path || !fs.existsSync(dbDoc.file_path)) {
    return { error: 'Tài liệu không còn tồn tại hoặc đã hết hạn', status: 404 };
  }

  // Re-process the document to get text
  const text = await processDocument(dbDoc.file_path);
  const rebuilt = {
    id: docId,
    fileName: dbDoc.original_name,
    filePath: dbDoc.file_path,
    text,
    status: 'ready',
    createdAt: new Date().toISOString()
  };
  documents.set(docId, rebuilt);
  return { share, doc: rebuilt };
}

// ── SSE endpoint: live updates for shared document viewers ──
app.get('/api/shared/:shareToken/events', async (req, res) => {
  try {
    const share = validateShareToken(req.params.shareToken);
    if (!share) {
      return res.status(403).json({ error: 'Link chia sẻ không hợp lệ hoặc đã hết hạn' });
    }

    const docId = share.document_id;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    });

    // Send initial heartbeat
    res.write(`event: connected\ndata: {"documentId":"${docId}"}\n\n`);

    // Register listener
    addDocListener(docId, res);

    // Heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      removeDocListener(docId, res);
    });
  } catch (error) {
    console.error('[SSE] Error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'SSE connection failed' });
  }
});

// Shared document content endpoint (public — token validated)
app.get('/api/shared/:shareToken/content', async (req, res) => {
  try {
    const result = await resolveSharedDocument(req.params.shareToken);
    if (result.error) return res.status(result.status).json({ error: result.error });

    const { share, doc } = result;

    // Load pre-existing session data (mindmap, flashcards, chat)
    const sessions = getAllDocumentSessions(share.document_id);

    res.json({
      documentId: doc.id,
      fileName: doc.fileName || share.original_name,
      text: doc.text,
      shareType: share.share_type,
      status: doc.status,
      sessions: {
        mindmap: sessions.mindmap || null,
        flashcards: sessions.flashcards || null,
        chat: sessions.chat || null,
      }
    });
  } catch (error) {
    console.error('[Share] Error getting content:', error.message);
    res.status(500).json({ error: 'Lỗi khi tải tài liệu chia sẻ' });
  }
});

// Shared document — generate mindmap (public — token validated, not for view-only)
app.post('/api/shared/:shareToken/mindmap', async (req, res) => {
  try {
    const result = await resolveSharedDocument(req.params.shareToken);
    if (result.error) return res.status(result.status).json({ error: result.error });
    if (result.share.share_type === 'view') {
      return res.status(403).json({ error: 'Quyền chỉ xem không cho phép tạo nội dung mới' });
    }

    const { share, doc } = result;
    const mindmap = await generateMindmap(doc.text, doc.fileName);
    saveDocumentSession(share.document_id, 'mindmap', mindmap);
    broadcastDocEvent(share.document_id, 'mindmap', mindmap);
    res.json(mindmap);
  } catch (error) {
    console.error('[Share] Mindmap generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Shared document — generate flashcards (public — token validated, not for view-only)
app.post('/api/shared/:shareToken/flashcards', async (req, res) => {
  try {
    const result = await resolveSharedDocument(req.params.shareToken);
    if (result.error) return res.status(result.status).json({ error: result.error });
    if (result.share.share_type === 'view') {
      return res.status(403).json({ error: 'Quyền chỉ xem không cho phép tạo nội dung mới' });
    }

    const { share, doc } = result;
    const flashcards = await generateFlashcards(doc.text, doc.fileName);
    saveDocumentSession(share.document_id, 'flashcards', flashcards);
    broadcastDocEvent(share.document_id, 'flashcards', flashcards);
    res.json(flashcards);
  } catch (error) {
    console.error('[Share] Flashcard generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Shared document — chat (public — token validated, not for view-only)
app.post('/api/shared/:shareToken/chat', async (req, res) => {
  try {
    const result = await resolveSharedDocument(req.params.shareToken);
    if (result.error) return res.status(result.status).json({ error: result.error });
    if (result.share.share_type === 'view') {
      return res.status(403).json({ error: 'Quyền chỉ xem không cho phép chat' });
    }
    const { share, doc } = result;
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialise counter on first chat
    if (doc.chatCount === undefined) doc.chatCount = 0;

    // Shared documents: allow up to 20 messages
    const shareLimit = 20;
    if (doc.chatCount >= shareLimit) {
      return res.status(429).json({
        error: `Đã đạt giới hạn ${shareLimit} tin nhắn cho tài liệu chia sẻ.`,
        chatLimitReached: true,
        chatCount: doc.chatCount,
        chatLimit: shareLimit,
      });
    }

    const reply = await chatWithDocument(doc.text, message, history || []);
    doc.chatCount++;

    // Broadcast chat update to other viewers
    const shareChatHistory = [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: reply }].slice(-50);
    saveDocumentSession(share.document_id, 'chat', shareChatHistory);
    broadcastDocEvent(share.document_id, 'chat', shareChatHistory);

    res.json({ reply, chatCount: doc.chatCount, chatLimit: shareLimit });
  } catch (error) {
    console.error('[Share] Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// SPA fallback — serve index.html for any non-API route (production)
if (fs.existsSync(publicDir)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// Health check endpoint (required by Docker)
app.get('/health', (req, res) => {
  const stats = getDatabaseStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: stats || { users: 0, documents: 0, uploads: 0, totalSize: 0 }
  });
});

// Seed default admin account
ensureAdmin();

// Initialize enhanced feature tables (chat history, favorites, tags, etc.)
initializeEnhancedTables();

// Initialize database indexes for performance (after tables are created)
setTimeout(() => {
  initializeIndexes();
}, 100);

// ── Auto-cleanup: soft-delete documents older than 24h, purge files for deleted docs ──
function runDocumentCleanup() {
  try {
    const db = new Database(DB_PATH);

    // 1. Soft-delete: mark documents older than 24h that haven't been deleted yet
    const softDeleted = db.prepare(`
      UPDATE documents
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND created_at <= datetime('now', '-24 hours')
    `).run();
    if (softDeleted.changes > 0) {
      logger.info(`[Cleanup] Soft-deleted ${softDeleted.changes} documents older than 24h`);
    }

    // 2. Purge uploaded files for soft-deleted documents (file_path still set)
    const toClean = db.prepare(`
      SELECT id, file_path FROM documents
      WHERE deleted_at IS NOT NULL AND file_path IS NOT NULL
    `).all();

    for (const doc of toClean) {
      if (doc.file_path) {
        fs.unlink(doc.file_path, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error(`[Cleanup] Failed to delete file ${doc.file_path}:`, err.message);
          }
        });
      }
      // Clear file_path so we don't try again
      db.prepare('UPDATE documents SET file_path = NULL WHERE id = ?').run(doc.id);
    }
    if (toClean.length > 0) {
      logger.info(`[Cleanup] Purged files for ${toClean.length} deleted documents`);
    }

    // 3. Also evict from in-memory map if expired
    for (const [docId, memDoc] of documents.entries()) {
      const age = Date.now() - new Date(memDoc.createdAt).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        documents.delete(docId);
      }
    }

    db.close();
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
  }
}

// Run cleanup on startup then every 30 minutes
setTimeout(runDocumentCleanup, 5000);
setInterval(runDocumentCleanup, 30 * 60 * 1000);

app.listen(PORT, () => {
  logger.info(`🚀 NoteMinds server running on http://localhost:${PORT} [${NODE_ENV}]`);
  const stats = getDatabaseStats();
  if (stats) {
    logger.info(`Database stats: Users=${stats.users}, Documents=${stats.documents}, Uploads=${stats.uploads}`);
  }
});
