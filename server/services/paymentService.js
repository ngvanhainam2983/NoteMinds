import crypto from 'crypto';
import db from './database.js';
import { setUserPlan } from './authService.js';
import { logger } from './logger.js';
import { createNotification, NOTIFICATION_TYPES, getNotificationTemplate } from './notificationService.js';
import './envLoader.js';

// ── SePay Configuration ──
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || '';
const SEPAY_BANK_ACCOUNT = process.env.SEPAY_BANK_ACCOUNT || '';
const SEPAY_BANK_NAME = process.env.SEPAY_BANK_NAME || 'MB Bank';
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || '';

// Plan prices in VND
export const PLAN_PRICES = {
  basic: 2000,
  pro: 99000,
  unlimited: 199000,
};

// ── Database tables ──
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_orders (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    transfer_content TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    paid_at TEXT,
    expired_at TEXT,
    sepay_transaction_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id TEXT,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT DEFAULT 'upgrade',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES payment_orders(id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
  CREATE INDEX IF NOT EXISTS idx_payment_orders_transfer ON payment_orders(transfer_content);
  CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
`);

// ── Generate unique transfer content ──
// Format: NM<random8> — matches SePay content pattern
function generateTransferContent() {
  const random = crypto.randomInt(10000000, 99999999);
  return `NM${random}`;
}

// ── Create payment order ──
export function createPaymentOrder(userId, plan) {
  if (!PLAN_PRICES[plan]) {
    throw new Error(`Plan "${plan}" không hợp lệ hoặc miễn phí`);
  }

  // Cancel any existing pending orders for this user
  db.prepare(`
    UPDATE payment_orders SET status = 'cancelled' 
    WHERE user_id = ? AND status = 'pending'
  `).run(userId);

  const id = crypto.randomUUID();
  const amount = PLAN_PRICES[plan];
  const transferContent = generateTransferContent();
  // Order expires in 30 minutes
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO payment_orders (id, user_id, plan, amount, transfer_content, expired_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, plan, amount, transferContent, expiredAt);

  return {
    id,
    plan,
    amount,
    transferContent,
    expiredAt,
    bankAccount: SEPAY_BANK_ACCOUNT,
    bankName: SEPAY_BANK_NAME,
    accountName: SEPAY_ACCOUNT_NAME,
    qrUrl: buildQrUrl(amount, transferContent),
  };
}

// ── Build SePay QR URL ──
function buildQrUrl(amount, content) {
  if (!SEPAY_BANK_ACCOUNT || !SEPAY_BANK_NAME) return null;
  // SePay QR URL format
  return `https://qr.sepay.vn/img?bank=${encodeURIComponent(SEPAY_BANK_NAME)}&acc=${encodeURIComponent(SEPAY_BANK_ACCOUNT)}&template=compact&amount=${amount}&des=${encodeURIComponent(content)}`;
}

// ── Get order by ID ──
export function getOrderById(orderId) {
  return db.prepare('SELECT * FROM payment_orders WHERE id = ?').get(orderId);
}

// ── Get order by transfer content ──
export function getOrderByTransferContent(content) {
  return db.prepare(`
    SELECT * FROM payment_orders 
    WHERE transfer_content = ? AND status = 'pending'
  `).get(content);
}

// ── Check order status ──
export function checkOrderStatus(orderId, userId) {
  const order = db.prepare(`
    SELECT * FROM payment_orders WHERE id = ? AND user_id = ?
  `).get(orderId, userId);

  if (!order) return null;

  // Auto-expire if past deadline and still pending
  if (order.status === 'pending' && new Date(order.expired_at) < new Date()) {
    db.prepare(`UPDATE payment_orders SET status = 'expired' WHERE id = ?`).run(orderId);
    return { ...order, status: 'expired' };
  }

  return order;
}

// ── Confirm payment (called by webhook) ──
export function confirmPayment(transferContent, transactionId) {
  const order = getOrderByTransferContent(transferContent);
  if (!order) {
    logger.warn(`[Payment] No pending order found for transfer: ${transferContent}`);
    return null;
  }

  // Check if expired
  if (new Date(order.expired_at) < new Date()) {
    db.prepare(`UPDATE payment_orders SET status = 'expired' WHERE id = ?`).run(order.id);
    logger.warn(`[Payment] Order ${order.id} expired`);
    return null;
  }

  // Mark as paid
  db.prepare(`
    UPDATE payment_orders SET status = 'paid', paid_at = datetime('now'), sepay_transaction_id = ?
    WHERE id = ?
  `).run(transactionId || null, order.id);

  // Set plan for 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  setUserPlan(order.user_id, order.plan, expiresAt);

  // Log payment history
  db.prepare(`
    INSERT INTO payment_history (user_id, order_id, plan, amount, type)
    VALUES (?, ?, ?, ?, 'upgrade')
  `).run(order.user_id, order.id, order.plan, order.amount);

  // Send notification
  try {
    const planLabels = { basic: 'Basic ⭐', pro: 'Pro 💎', unlimited: 'Unlimited 👑' };
    createNotification(
      order.user_id,
      NOTIFICATION_TYPES.PLAN_CHANGED,
      'Thanh toán thành công! 🎉',
      `Bạn đã nâng cấp lên gói ${planLabels[order.plan] || order.plan}. Cảm ơn bạn!`,
      { icon: 'upgrade', data: { plan: order.plan, expiresAt } }
    );
  } catch (e) {
    logger.warn('[Payment] Failed to create notification:', e.message);
  }

  logger.info(`[Payment] Order ${order.id} confirmed for user ${order.user_id} -> plan ${order.plan}`);
  return order;
}

// ── Verify SePay webhook via API key ──
export function verifySepayWebhook(authHeader) {
  if (!SEPAY_API_KEY) {
    logger.warn('[Payment] SEPAY_API_KEY not set, skipping webhook verification');
    return true;
  }
  // SePay sends: Authorization: Apikey <key>
  const token = (authHeader || '').replace(/^Apikey\s+/i, '').trim();
  if (!token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(SEPAY_API_KEY));
  } catch {
    return false;
  }
}

// ── Process SePay webhook ──
export function processSepayWebhook(data) {
  // SePay webhook payload structure:
  // { id, gateway, transactionDate, accountNumber, transferType,
  //   transferAmount, accumulated, code, content, referenceCode,
  //   description }

  const content = (data.content || '').trim().toUpperCase();
  const amount = Number(data.transferAmount) || 0;
  const transactionId = String(data.id || data.referenceCode || '');

  if (!content || amount <= 0) {
    logger.warn('[Payment] Invalid webhook data:', { content, amount });
    return { success: false, reason: 'invalid_data' };
  }

  // Try to match transfer content to a pending order
  // SePay may have extra text, so try extracting our code
  const nmMatch = content.match(/NM\d{8}/);
  const matchedContent = nmMatch ? nmMatch[0] : content;

  const order = getOrderByTransferContent(matchedContent);
  if (!order) {
    logger.info(`[Payment] No matching order for content: "${matchedContent}" (full: "${content}")`);
    return { success: false, reason: 'no_matching_order' };
  }

  // Verify amount matches
  if (amount < order.amount) {
    logger.warn(`[Payment] Amount mismatch: received ${amount}, expected ${order.amount} for order ${order.id}`);
    return { success: false, reason: 'amount_mismatch' };
  }

  const result = confirmPayment(matchedContent, transactionId);
  if (!result) {
    return { success: false, reason: 'confirmation_failed' };
  }

  return { success: true, orderId: order.id, plan: order.plan, userId: order.user_id };
}

// ── Get user payment history ──
export function getUserPaymentHistory(userId) {
  return db.prepare(`
    SELECT ph.*, po.transfer_content, po.sepay_transaction_id
    FROM payment_history ph
    LEFT JOIN payment_orders po ON ph.order_id = po.id
    WHERE ph.user_id = ?
    ORDER BY ph.created_at DESC
    LIMIT 50
  `).all(userId);
}

// ── Admin: get all recent payments ──
export function getRecentPayments(limit = 50) {
  return db.prepare(`
    SELECT po.*, u.username, u.email
    FROM payment_orders po
    JOIN users u ON po.user_id = u.id
    ORDER BY po.created_at DESC
    LIMIT ?
  `).all(limit);
}

// ── Cleanup expired orders (called periodically) ──
export function cleanupExpiredOrders() {
  const result = db.prepare(`
    UPDATE payment_orders SET status = 'expired'
    WHERE status = 'pending' AND expired_at < datetime('now')
  `).run();
  if (result.changes > 0) {
    logger.info(`[Payment] Expired ${result.changes} pending orders`);
  }
}
