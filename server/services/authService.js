import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './database.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'notemind-secret-key-change-in-production';
const JWT_EXPIRES_IN = '1d';

// ── Plan definitions ───────────────────────────────────

export const PLANS = {
  free: { label: 'Free', dailyUploads: 5, chatLimit: 10, badge: null, color: null },
  basic: { label: 'Basic', dailyUploads: 10, chatLimit: 25, badge: '⭐', color: '#fbbf24' },
  pro: { label: 'Pro', dailyUploads: 30, chatLimit: 50, badge: '💎', color: '#818cf8' },
  unlimited: { label: 'Unlimited', dailyUploads: -1, chatLimit: -1, badge: '👑', color: '#f43f5e' },
};

const GUEST_DAILY_LIMIT = 1;
const GUEST_CHAT_LIMIT = 5;

// ── User CRUD ──────────────────────────────────────────

function formatUser(user) {
  if (!user) return null;
  const plan = user.plan || 'free';
  const planInfo = PLANS[plan] || PLANS.free;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    role: user.role || 'user',
    plan,
    planLabel: planInfo.label,
    planBadge: planInfo.badge,
    planColor: planInfo.color,
    planExpiresAt: user.plan_expires_at || null,
    lastIp: user.last_ip || null,
    lastLoginAt: user.last_login_at || null,
    isBanned: !!user.is_banned,
    banReason: user.ban_reason || null,
    bannedAt: user.banned_at || null,
    emailVerified: !!user.email_verified,
    createdAt: user.created_at,
  };
}

export function createUser(username, email, password, displayName) {
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (username, email, password, display_name, role, plan)
    VALUES (?, ?, ?, ?, 'user', 'free')
  `);
  try {
    const result = stmt.run(username.toLowerCase(), email.toLowerCase(), hash, displayName || username);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    return formatUser(user);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: users.username')) {
      throw new Error('Tên đăng nhập đã tồn tại');
    }
    if (err.message.includes('UNIQUE constraint failed: users.email')) {
      throw new Error('Email đã được sử dụng');
    }
    throw err;
  }
}

// ── Registration rate limiting ─────────────────────────

export function getRegistrationCount(ip) {
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM registration_logs WHERE ip_address = ?
  `).get(ip);
  return row.count;
}

export function logRegistration(ip, userId) {
  db.prepare(`
    INSERT INTO registration_logs (ip_address, user_id) VALUES (?, ?)
  `).run(ip, userId);
}

export function authenticateUser(login, password, ip) {
  const user = db.prepare(`
    SELECT * FROM users WHERE username = ? OR email = ?
  `).get(login.toLowerCase(), login.toLowerCase());

  if (!user) {
    throw new Error('Tài khoản không tồn tại');
  }

  if (user.is_banned) {
    throw new Error('Tài khoản đã bị khóa: ' + (user.ban_reason || 'Vi phạm quy định'));
  }

  if (!bcrypt.compareSync(password, user.password)) {
    throw new Error('Mật khẩu không đúng');
  }

  // Update last login IP and time
  if (ip) {
    db.prepare(`
      UPDATE users SET last_ip = ?, last_login_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(ip, user.id);
  }

  return formatUser({ ...user, last_ip: ip || user.last_ip, last_login_at: new Date().toISOString() });
}

export function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return formatUser(user);
}

// ── JWT ────────────────────────────────────────────────

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ── Auth middleware ─────────────────────────────────────

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = getUserById(decoded.id);
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });
  }
  req.user = getUserById(decoded.id);
  if (!req.user) {
    return res.status(401).json({ error: 'Tài khoản không tồn tại' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện' });
  }
  next();
}

// ── Upload tracking ────────────────────────────────────

export function getUploadCount(userId, ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (userId) {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM upload_logs
      WHERE user_id = ? AND uploaded_at >= datetime(?, 'start of day')
    `).get(userId, today);
    return row.count;
  } else {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM upload_logs
      WHERE user_id IS NULL AND ip_address = ? AND uploaded_at >= datetime(?, 'start of day')
    `).get(ip, today);
    return row.count;
  }
}

export function logUpload(userId, ip) {
  db.prepare(`
    INSERT INTO upload_logs (user_id, ip_address) VALUES (?, ?)
  `).run(userId || null, ip);
}

export function getUploadLimit(user) {
  if (!user) return GUEST_DAILY_LIMIT;
  const plan = user.plan || 'free';
  const planInfo = PLANS[plan] || PLANS.free;
  return planInfo.dailyUploads; // -1 means unlimited
}

export function getChatLimit(user) {
  if (!user) return GUEST_CHAT_LIMIT;
  const plan = user.plan || 'free';
  const planInfo = PLANS[plan] || PLANS.free;
  return planInfo.chatLimit; // -1 means unlimited
}

// ── Admin functions ────────────────────────────────────

export function getAllUsers() {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  return users.map(formatUser);
}

export function setUserPlan(userId, plan, expiresAt) {
  if (!PLANS[plan]) throw new Error(`Gói "${plan}" không hợp lệ`);
  db.prepare(`
    UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(plan, expiresAt || null, userId);
  return getUserById(userId);
}

export function setUserRole(userId, role) {
  if (!['user', 'admin'].includes(role)) throw new Error('Role không hợp lệ');
  db.prepare(`
    UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?
  `).run(role, userId);
  return getUserById(userId);
}

export function banUser(userId, reason) {
  db.prepare(`
    UPDATE users SET is_banned = 1, ban_reason = ?, banned_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(reason || 'Vi phạm quy định', userId);
  return getUserById(userId);
}

export function unbanUser(userId) {
  db.prepare(`
    UPDATE users SET is_banned = 0, ban_reason = NULL, banned_at = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(userId);
  return getUserById(userId);
}

export function banIp(ip, reason, adminId) {
  try {
    db.prepare(`
      INSERT INTO banned_ips (ip_address, reason, banned_by) VALUES (?, ?, ?)
    `).run(ip, reason || 'Vi phạm quy định', adminId);
  } catch (err) {
    if (err.message.includes('UNIQUE')) throw new Error('IP đã bị ban rồi');
    throw err;
  }
}

export function unbanIp(ip) {
  db.prepare('DELETE FROM banned_ips WHERE ip_address = ?').run(ip);
}

export function getBannedIps() {
  return db.prepare('SELECT * FROM banned_ips ORDER BY created_at DESC').all();
}

export function isIpBanned(ip) {
  const row = db.prepare('SELECT id FROM banned_ips WHERE ip_address = ?').get(ip);
  return !!row;
}

export function updateLastIp(userId, ip) {
  db.prepare(`
    UPDATE users SET last_ip = ?, updated_at = datetime('now') WHERE id = ?
  `).run(ip, userId);
}

export function updateUserProfile(userId, displayName, email) {
  if (email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), userId);
    if (existing) throw new Error('Email đã được sử dụng');
  }
  if (displayName) {
    db.prepare('UPDATE users SET display_name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(displayName, userId);
  }
  if (email) {
    db.prepare('UPDATE users SET email = ?, updated_at = datetime(\'now\') WHERE id = ?').run(email.toLowerCase(), userId);
  }
  return getUserById(userId);
}

export function changePassword(userId, oldPassword, newPassword) {
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('Tài khoản không tồn tại');
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    throw new Error('Mật khẩu cũ không đúng');
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, userId);
}

// ── Email verification ─────────────────────────────────

export function setVerificationToken(userId, token) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  db.prepare(`
    UPDATE users SET verification_token = ?, verification_token_expires = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(token, expires, userId);
}

export function verifyEmail(token) {
  const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
  if (!user) throw new Error('Token xác minh không hợp lệ');
  if (new Date(user.verification_token_expires) < new Date()) {
    throw new Error('Token xác minh đã hết hạn. Vui lòng yêu cầu gửi lại.');
  }
  db.prepare(`
    UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(user.id);
  return formatUser({ ...user, email_verified: 1 });
}

export function getUserByEmail(email) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  return user; // raw user, not formatted
}

// ── Password reset ─────────────────────────────────────

export function setResetToken(userId, token) {
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  db.prepare(`
    UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(token, expires, userId);
}

export function resetPasswordWithToken(token, newPassword) {
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user) throw new Error('Token đặt lại mật khẩu không hợp lệ');
  if (new Date(user.reset_token_expires) < new Date()) {
    throw new Error('Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.');
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`
    UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(hash, user.id);
  return formatUser({ ...user, reset_token: null });
}

// ── Seed default admin ─────────────────────────────────

export function ensureAdmin() {
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT OR IGNORE INTO users (username, email, password, display_name, role, plan)
      VALUES ('admin', 'admin@notemind.local', ?, 'Admin', 'admin', 'unlimited')
    `).run(hash);
    console.log('🔑 Default admin created — username: admin / password: admin123');
  }
}

export { GUEST_DAILY_LIMIT };
