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
import { generateQuiz } from './services/quizGenerator.js';
import { reviewFlashcard, getDueFlashcards } from './services/srsService.js';
import { chatWithDocument, chatWithMultipleDocuments } from './services/chatService.js';
import { callQwen } from './services/qwenClient.js';
import {
  createUser, authenticateUser, generateToken, getUserById,
  optionalAuth, requireAuth, requireAdmin,
  getUploadCount, logUpload, getUploadLimit, getChatLimit,
  getAllUsers, setUserPlan, setUserRole,
  updateUserProfile, changePassword, ensureAdmin,
  banUser, unbanUser, banIp, unbanIp, getBannedIps, isIpBanned, updateLastIp,
  setVerificationToken, verifyEmail, getUserByEmail, setResetToken, resetPasswordWithToken,
  getRegistrationCount, logRegistration,
  generate2FATempToken, verify2FATempToken,
  setupTotp, enableTotp, verifyTotpToken, verifyRecoveryCode,
  disableTotp, getTotpStatus, regenerateRecoveryCodes,
  GUEST_DAILY_LIMIT, PLANS,
} from './services/authService.js';
import {
  generatePasskeyRegistrationOptions, verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions, verifyPasskeyAuthentication,
  getPasskeyList, removePasskey, renamePasskey,
} from './services/passkeyService.js';
import { decryptMiddleware } from './middleware/encryptionMiddleware.js';
import { initializeIndexes, getDatabaseStats } from './services/databaseIndexes.js';
import { initializeEnhancedTables } from './services/enhancedDatabase.js';
import { initDocumentCleanup } from './services/documentCleanup.js';
import { logger, requestLoggerMiddleware } from './services/logger.js';
import featureRoutes from './routes/featuresRoutes.js';
import { validateShareToken } from './services/advancedFeatureService.js';
import { sendVerificationEmail, sendPasswordResetEmail, generateVerificationToken, testEmailConnection } from './services/emailService.js';
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

// Ensure avatars directory exists
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Serve avatar files statically
app.use('/uploads/avatars', express.static(avatarsDir));

// Initialize cleanup cron job
initDocumentCleanup(uploadsDir);

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
    const allowed = ['.pdf', '.txt', '.md', '.docx', '.doc', '.pptx', '.xlsx', '.csv', '.mp3', '.wav', '.m4a', '.ogg', '.webm', '.jpg', '.jpeg', '.png'];
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

    // IP-based registration limit (max 3)
    const ip = getClientIp(req);
    const regCount = getRegistrationCount(ip);
    if (regCount >= 3) {
      return res.status(429).json({ error: 'Địa chỉ IP của bạn đã đăng ký quá 3 tài khoản. Không thể đăng ký thêm.' });
    }

    const user = createUser(username, email, password, displayName);
    logRegistration(ip, user.id);
    const token = generateToken(user);

    // Send verification email
    try {
      const verifyToken = generateVerificationToken();
      setVerificationToken(user.id, verifyToken);
      await sendVerificationEmail(email, verifyToken, username);
    } catch (emailErr) {
      console.error('[Register] Verification email failed:', emailErr.message);
      // Don't block registration if email fails
    }

    res.json({ user, token, message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Email verification routes ──

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token không hợp lệ' });
    const user = verifyEmail(token);
    res.json({ user, message: 'Email đã được xác minh thành công!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Vui lòng nhập email' });
    const user = getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });
    if (user.email_verified) return res.status(400).json({ error: 'Email đã được xác minh rồi' });

    const verifyToken = generateVerificationToken();
    setVerificationToken(user.id, verifyToken);
    await sendVerificationEmail(email, verifyToken, user.username);
    res.json({ message: 'Email xác minh đã được gửi lại!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Vui lòng nhập email' });
    const user = getUserByEmail(email);
    // Don't reveal if email exists or not for security
    if (!user) {
      return res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
    }

    const resetToken = generateVerificationToken();
    setResetToken(user.id, resetToken);
    await sendPasswordResetEmail(email, resetToken, user.username);
    res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
  } catch (err) {
    console.error('[ForgotPassword] Error:', err.message);
    res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Thông tin không hợp lệ' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    const user = resetPasswordWithToken(token, newPassword);
    res.json({ user, message: 'Mật khẩu đã được đặt lại thành công!' });
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
    const result = authenticateUser(login, password, ip);

    // If 2FA is required, return a temp token instead of the real JWT
    if (result.requires2FA) {
      const tempToken = generate2FATempToken(result.userId);
      return res.json({
        requires2FA: true,
        tempToken,
        totpEnabled: result.totpEnabled,
        passkeyEnabled: result.passkeyEnabled,
      });
    }

    const token = generateToken(result);
    res.json({ user: result, token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// ── 2FA Routes ──

app.post('/api/auth/2fa/verify', async (req, res) => {
  try {
    const { tempToken, totpCode } = req.body;
    if (!tempToken || !totpCode) {
      return res.status(400).json({ error: 'Vui lòng nhập mã xác thực' });
    }
    const decoded = verify2FATempToken(tempToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    const user = verifyTotpToken(decoded.id, totpCode);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/recovery', async (req, res) => {
  try {
    const { tempToken, recoveryCode } = req.body;
    if (!tempToken || !recoveryCode) {
      return res.status(400).json({ error: 'Vui lòng nhập mã khôi phục' });
    }
    const decoded = verify2FATempToken(tempToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    const user = verifyRecoveryCode(decoded.id, recoveryCode);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/setup', requireAuth, async (req, res) => {
  try {
    const result = await setupTotp(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/enable', requireAuth, (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Vui lòng nhập mã xác thực từ ứng dụng' });
    }
    const result = enableTotp(req.user.id, token);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/disable', requireAuth, (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu' });
    }
    const user = disableTotp(req.user.id, password);
    res.json({ user, message: '2FA đã được tắt thành công' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/2fa/status', requireAuth, (req, res) => {
  try {
    const status = getTotpStatus(req.user.id);
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/2fa/recovery-codes', requireAuth, (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu' });
    }
    const result = regenerateRecoveryCodes(req.user.id, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Passkey Routes ──

// Registration: generate options
app.post('/api/auth/passkey/register-options', requireAuth, async (req, res) => {
  try {
    const options = await generatePasskeyRegistrationOptions(req.user.id);
    res.json(options);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Registration: verify response
app.post('/api/auth/passkey/register-verify', requireAuth, async (req, res) => {
  try {
    const { response, name } = req.body;
    if (!response) return res.status(400).json({ error: 'Missing passkey response' });
    const result = await verifyPasskeyRegistration(req.user.id, response, name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Authentication during 2FA: generate options
app.post('/api/auth/passkey/auth-options', async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ error: 'Missing temp token' });
    const decoded = verify2FATempToken(tempToken);
    if (!decoded) return res.status(401).json({ error: 'Phiên xác thực đã hết hạn.' });
    const options = await generatePasskeyAuthenticationOptions(decoded.id);
    res.json(options);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Authentication during 2FA: verify response
app.post('/api/auth/passkey/auth-verify', async (req, res) => {
  try {
    const { tempToken, response } = req.body;
    if (!tempToken || !response) return res.status(400).json({ error: 'Missing data' });
    const decoded = verify2FATempToken(tempToken);
    if (!decoded) return res.status(401).json({ error: 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.' });
    const result = await verifyPasskeyAuthentication(decoded.id, response);
    if (result.verified) {
      const user = getUserById(decoded.id);
      const token = generateToken(user);
      res.json({ user, token });
    } else {
      res.status(401).json({ error: 'Xác thực passkey thất bại' });
    }
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Management: list passkeys
app.get('/api/auth/passkey/list', requireAuth, (req, res) => {
  try {
    const passkeys = getPasskeyList(req.user.id);
    res.json({ passkeys });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Management: remove passkey
app.delete('/api/auth/passkey/:id', requireAuth, (req, res) => {
  try {
    const result = removePasskey(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Management: rename passkey
app.put('/api/auth/passkey/:id', requireAuth, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên không được để trống' });
    const result = renamePasskey(req.user.id, req.params.id, name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

// Avatar upload
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user.id}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP'));
  }
});

app.post('/api/users/profile/avatar', requireAuth, avatarUpload.single('avatar'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không tìm thấy file ảnh' });

    // Remove old avatar file if exists
    if (req.user.avatar_url) {
      const oldPath = path.join(__dirname, req.user.avatar_url);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
      }
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const db = new Database(DB_PATH);
    db.prepare("UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?").run(avatarUrl, req.user.id);
    db.close();
    const updated = getUserById(req.user.id);
    res.json({ user: updated });
  } catch (err) {
    logger.error('Avatar upload error:', { error: err.message });
    res.status(500).json({ error: 'Lỗi khi tải lên ảnh đại diện' });
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
      fs.unlink(req.file.path, () => { });
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

// ============ FOLDERS (WORKSPACES) ============

// Get all folders for user
app.get('/api/folders', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    db.close();
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create folder
app.post('/api/folders', requireAuth, (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });
    const id = uuidv4();
    const db = new Database(DB_PATH);
    db.prepare('INSERT INTO folders (id, user_id, name, color) VALUES (?, ?, ?, ?)')
      .run(id, req.user.id, name, color || '#3b82f6');
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    db.close();
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update folder
app.put('/api/folders/:id', requireAuth, (req, res) => {
  try {
    const { name, color } = req.body;
    const db = new Database(DB_PATH);
    // Check ownership
    const existing = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Folder not found' });
    }
    db.prepare('UPDATE folders SET name = COALESCE(?, name), color = COALESCE(?, color), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name, color, req.params.id);
    const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
    db.close();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete folder (cascade handled partially by foreign keys, but documents will just lose folder_id due to ON DELETE SET NULL)
app.delete('/api/folders/:id', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const existing = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Folder not found' });
    }
    db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    db.close();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign document to folder
app.put('/api/documents/:id/folder', requireAuth, (req, res) => {
  try {
    const { folder_id } = req.body; // Can be null to remove from folder
    const db = new Database(DB_PATH);

    // Check document ownership
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!doc) {
      db.close();
      return res.status(404).json({ error: 'Document not found' });
    }

    // If folder_id provided, check folder ownership
    if (folder_id) {
      const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(folder_id, req.user.id);
      if (!folder) {
        db.close();
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    db.prepare('UPDATE documents SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(folder_id || null, req.params.id);
    db.close();
    res.json({ success: true, folder_id: folder_id || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DOCUMENTS ============

// Get document history (for logged-in users) — must be before :docId routes
app.get('/api/documents/history', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ documents: [] });
    }
    const db = new Database(DB_PATH);
    const docs = db.prepare(`
      SELECT id, original_name, status, text_length, deleted_at, created_at, updated_at, folder_id
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

// Download original document
app.get('/api/documents/:docId/download', optionalAuth, async (req, res) => {
  try {
    const docId = req.params.docId;

    // First try to find it in memory to get originalName
    let originalName = 'document.txt';
    const memDoc = documents.get(docId);
    if (memDoc && memDoc.fileName) {
      originalName = memDoc.fileName;
    }

    // Always fetch from DB to get the true file path
    const db = new Database(DB_PATH);
    const dbDoc = db.prepare('SELECT file_path, original_name FROM documents WHERE id = ?').get(docId);
    db.close();

    if (!dbDoc || !dbDoc.file_path || !fs.existsSync(dbDoc.file_path)) {
      return res.status(404).json({ error: 'Tài liệu không còn tồn tại trên máy chủ' });
    }

    originalName = dbDoc.original_name || originalName;

    res.download(dbDoc.file_path, originalName, (err) => {
      if (err) {
        console.error(`[Download] Error downloading ${docId}:`, err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Không thể tải xuống tệp' });
        }
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
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

// Export flashcards as CSV
app.get('/api/documents/:docId/flashcards/export', async (req, res) => {
  try {
    const doc = documents.get(req.params.docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // We get flashcards from the session storage
    const session = getDocumentSession(req.params.docId, 'flashcards');
    if (!session || !session.data) {
      return res.status(404).json({ error: 'No flashcards generated yet' });
    }

    const flashcards = session.data;

    // Convert to CSV string
    // Format: "Front","Back"
    let csv = '"Front","Back"\n';
    flashcards.forEach(card => {
      // Escape quotes by doubling them
      const front = card.front.replace(/"/g, '""');
      const back = card.back.replace(/"/g, '""');
      csv += `"${front}","${back}"\n`;
    });

    res.json({ csv });
  } catch (error) {
    console.error('Export flashcards error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get due flashcards for SRS
app.get('/api/documents/:docId/flashcards/due', requireAuth, (req, res) => {
  try {
    const dueCards = getDueFlashcards(req.user.id, req.params.docId);
    res.json({ dueCards });
  } catch (error) {
    console.error('Error fetching due flashcards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Review a flashcard (SRS)
app.post('/api/documents/:docId/flashcards/:cardIdx/review', requireAuth, (req, res) => {
  try {
    const { difficulty, timeElapsedMs } = req.body;
    if (!['easy', 'good', 'hard', 'again'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    // Usually flashcards are just stored as a JSON array in the session string.
    // We treat the cardIdx (index in the array) as the unique flashcardId for now, 
    // prefixed with docId to ensure global uniqueness in the metrics DB.
    const flashcardId = `${req.params.docId}-card-${req.params.cardIdx}`;

    const result = reviewFlashcard(req.user.id, req.params.docId, flashcardId, difficulty, timeElapsedMs);
    res.json(result);
  } catch (error) {
    console.error('Error reviewing flashcard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate quiz
app.post('/api/documents/:docId/quiz', async (req, res) => {
  try {
    const doc = documents.get(req.params.docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.status !== 'ready') {
      return res.status(400).json({ error: 'Document is still processing' });
    }

    const quiz = await generateQuiz(doc.text, doc.fileName);
    saveDocumentSession(req.params.docId, 'quiz', quiz);
    broadcastDocEvent(req.params.docId, 'quiz', quiz);
    res.json(quiz);
  } catch (error) {
    console.error('Quiz generation error:', error);
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

// Chat with multiple documents
app.post('/api/chat/multi', optionalAuth, async (req, res) => {
  try {
    const { docIds, message, history } = req.body;
    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return res.status(400).json({ error: 'Array of docIds is required' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify all docs exist and are ready
    const docsToChat = [];
    for (const id of docIds) {
      const doc = documents.get(id);
      if (!doc) {
        return res.status(404).json({ error: `Document ${id} not found` });
      }
      if (doc.status !== 'ready') {
        return res.status(400).json({ error: `Document ${doc.fileName} is still processing` });
      }
      docsToChat.push(doc);
    }

    const reply = await chatWithMultipleDocuments(docsToChat, message, history || []);

    // We don't save multi-chat history to a single document's session for now,
    // as it spans multiple documents. The client will hold the state.
    res.json({ reply });
  } catch (error) {
    console.error('Multi-chat error:', error);
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

// ============ COMMUNITY / PUBLIC HUB ============

app.get('/api/community/documents', async (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const query = `
      SELECT d.id, d.original_name as title, d.created_at, u.display_name as author, u.avatar_url as author_avatar
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_public = 1 AND d.status = 'ready'
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const publicDocs = db.prepare(query).all(limit, offset);
    db.close();

    res.json({ documents: publicDocs });
  } catch (error) {
    console.error('[Community] Error fetching public documents:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch a single public document's content and sessions
app.get('/api/public/documents/:id/content', async (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const docQuery = db.prepare('SELECT * FROM documents WHERE id = ? AND is_public = 1').get(req.params.id);
    db.close();

    if (!docQuery) {
      return res.status(404).json({ error: 'Tài liệu không tồn tại hoặc không được chia sẻ công khai.' });
    }

    // Load pre-existing session data
    const sessions = getAllDocumentSessions(docQuery.id);

    res.json({
      documentId: docQuery.id,
      fileName: docQuery.original_name,
      text: docQuery.text_content,
      shareType: 'view', // Always read-only for public community docs
      status: docQuery.status,
      sessions: {
        mindmap: sessions.mindmap || null,
        flashcards: sessions.flashcards || null,
        chat: sessions.chat || null,
      }
    });
  } catch (error) {
    console.error('[Public] Error getting public content:', error.message);
    res.status(500).json({ error: 'Lỗi khi tải tài liệu công khai.' });
  }
});

app.put('/api/documents/:id/public', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_public } = req.body;

    const db = new Database(DB_PATH);
    const docInfo = db.prepare('SELECT user_id FROM documents WHERE id = ?').get(id);

    if (!docInfo) {
      db.close();
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docInfo.user_id !== req.user.id) {
      db.close();
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('UPDATE documents SET is_public = ? WHERE id = ?').run(is_public ? 1 : 0, id);
    db.close();

    res.json({ success: true, is_public: !!is_public });
  } catch (error) {
    console.error('Error updating document public status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ ANALYTICS ============

// Get user analytics and metrics
app.get('/api/analytics', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const days = parseInt(req.query.days) || 7;

    // Total documents viewed / created
    const docs = db.prepare('SELECT COUNT(*) as count FROM documents WHERE user_id = ? AND status = ?').get(req.user.id, 'ready');

    // For interactions, we can use the activity_logs table if it exists, otherwise we'll estimate from chat history and flashcard reviews.
    // Let's create an aggregated view based on existing tables

    const chats = db.prepare('SELECT COUNT(*) as count FROM chat_history WHERE user_id = ? AND timestamp >= datetime("now", ?)').get(req.user.id, `-${days} days`);
    const flashcards = db.prepare('SELECT COUNT(*) as count FROM flashcard_reviews WHERE user_id = ? AND review_date >= datetime("now", ?)').get(req.user.id, `-${days} days`);

    // Top documents by chat interactions
    const topDocuments = db.prepare(`
      SELECT d.original_name as title, COUNT(c.id) as interactions
      FROM documents d
      LEFT JOIN chat_history c ON d.id = c.document_id
      WHERE d.user_id = ? AND c.timestamp >= datetime('now', ?)
      GROUP BY d.id
      ORDER BY interactions DESC
      LIMIT 5
    `).all(req.user.id, `-${days} days`);

    // Weekly activity (last 7 days by default)
    const weeklyActivity = db.prepare(`
      SELECT date(timestamp) as day, COUNT(*) as interactions
      FROM chat_history
      WHERE user_id = ? AND timestamp >= datetime('now', ?)
      GROUP BY date(timestamp)
      ORDER BY date(timestamp) ASC
    `).all(req.user.id, `-${days} days`);

    db.close();

    res.json({
      documentsViewed: docs.count || 0,
      chatInteractions: chats.count || 0,
      flashcardsReviewed: flashcards.count || 0,
      totalActions: (chats.count || 0) + (flashcards.count || 0),
      topDocuments: topDocuments || [],
      weeklyActivity: weeklyActivity || []
    });
  } catch (error) {
    console.error('[Analytics] Error:', error.message);
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

// ── Auto-cleanup: soft-delete documents older than 7 days, purge files for deleted docs ──
function runDocumentCleanup() {
  try {
    const db = new Database(DB_PATH);

    // 1. Soft-delete: mark documents older than 7 days that haven't been deleted yet
    const softDeleted = db.prepare(`
      UPDATE documents
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND created_at <= datetime('now', '-7 days')
    `).run();
    if (softDeleted.changes > 0) {
      logger.info(`[Cleanup] Soft-deleted ${softDeleted.changes} documents older than 7 days`);
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

    // 3. Also evict from in-memory map if expired (7 days)
    for (const [docId, memDoc] of documents.entries()) {
      const age = Date.now() - new Date(memDoc.createdAt).getTime();
      if (age > 7 * 24 * 60 * 60 * 1000) {
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
