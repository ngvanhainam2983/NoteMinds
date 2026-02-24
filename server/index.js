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
      console.error(`Document ${docId} processing failed:`, err.message);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Delete document (cleanup on page leave)
app.delete('/api/documents/:docId', (req, res) => {
  const doc = documents.get(req.params.docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Delete uploaded file from disk
  if (doc.filePath) {
    fs.unlink(doc.filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(`Failed to delete file ${doc.filePath}:`, err.message);
      }
    });
  }

  documents.delete(req.params.docId);
  console.log(`Document ${req.params.docId} deleted (cleanup)`);
  res.json({ success: true });
});

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

// SPA fallback — serve index.html for any non-API route (production)
if (fs.existsSync(publicDir)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// Seed default admin account
ensureAdmin();

app.listen(PORT, () => {
  console.log(`🚀 NoteMinds server running on http://localhost:${PORT} [${NODE_ENV}]`);
});
