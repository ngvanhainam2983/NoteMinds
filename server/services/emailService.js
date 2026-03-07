import nodemailer from 'nodemailer';
import crypto from 'crypto';
import './envLoader.js';
import db from './database.js';

// ── SMTP Configuration ──────────────────────────────────
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email',
    port: smtpPort,
    secure: smtpPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    requireTLS: smtpPort === 587, // Force STARTTLS for port 587
    tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
    },
});

const FROM_EMAIL = process.env.SMTP_FROM || 'donotreply@loveyuna.today';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'NoteMinds';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// ── Token generation ────────────────────────────────────
export function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function generateTrackingId() {
    return crypto.randomBytes(16).toString('hex');
}

// ── i18n helpers ────────────────────────────────────────
const translations = {
    en: {
        verifyEmailSubject: '✉️ Verify your email - NoteMinds',
        verifyEmailTitle: 'Verify your email',
        verifyEmailGreeting: 'Hello',
        verifyEmailBody: 'Thank you for signing up for NoteMinds! Please click the button below to verify your email.',
        verifyEmailButton: '✓ Verify Email',
        verifyEmailOr: 'Or copy this link to your browser:',
        verifyEmailExpiry: 'This link will expire in <strong>5 minutes</strong>. If you did not sign up for this account, please ignore this email.',
        resetPasswordSubject: '🔑 Reset your password - NoteMinds',
        resetPasswordTitle: 'Reset your password',
        resetPasswordGreeting: 'Hello',
        resetPasswordBody: 'We received a request to reset the password for your account. Click the button below to create a new password.',
        resetPasswordButton: '🔑 Reset Password',
        resetPasswordOr: 'Or copy this link to your browser:',
        resetPasswordExpiry: 'This link will expire in <strong>5 minutes</strong>. If you did not request a password reset, please ignore this email.',
        footer: '© 2026 NoteMinds — AI-Powered Study Assistant',
        poweredBy: 'Powered by AI',
        secureEmail: 'Secure Email',
        needHelp: 'Need help? Contact us',
    },
    vi: {
        verifyEmailSubject: '✉️ Xác minh email - NoteMinds',
        verifyEmailTitle: 'Xác minh email của bạn',
        verifyEmailGreeting: 'Xin chào',
        verifyEmailBody: 'Cảm ơn bạn đã đăng ký tài khoản NoteMinds! Vui lòng nhấn nút bên dưới để xác minh email.',
        verifyEmailButton: '✓ Xác minh Email',
        verifyEmailOr: 'Hoặc copy link sau vào trình duyệt:',
        verifyEmailExpiry: 'Link này sẽ hết hạn sau <strong>5 phút</strong>. Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.',
        resetPasswordSubject: '🔑 Đặt lại mật khẩu - NoteMinds',
        resetPasswordTitle: 'Đặt lại mật khẩu',
        resetPasswordGreeting: 'Xin chào',
        resetPasswordBody: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới.',
        resetPasswordButton: '🔑 Đặt lại mật khẩu',
        resetPasswordOr: 'Hoặc copy link sau vào trình duyệt:',
        resetPasswordExpiry: 'Link này sẽ hết hạn sau <strong>5 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.',
        footer: '© 2026 NoteMinds — Trợ lý học tập AI',
        poweredBy: 'Powered by AI',
        secureEmail: 'Email bảo mật',
        needHelp: 'Cần hỗ trợ? Liên hệ chúng tôi',
    },
};

function t(lang, key) {
    return translations[lang]?.[key] || translations['en'][key];
}

// ── Enhanced Email Templates ─────────────────────────────────────

function baseTemplate(content, trackingId, lang = 'vi') {
    const trackingPixel = trackingId ? `<img src="${BACKEND_URL}/api/email/track/${trackingId}" width="1" height="1" style="display:block;" alt="" />` : '';
    
    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background: linear-gradient(135deg, #0f1117 0%, #1a1d27 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #0f1117 0%, #1a1d27 100%); padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" style="max-width:600px; background-color:#1a1d27; border-radius:20px; border:1px solid #2e3144; overflow:hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4);" cellpadding="0" cellspacing="0" role="presentation">
          
          <!-- Decorative Header Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%); height:4px;"></td>
          </tr>
          
          <!-- Logo & Header -->
          <tr>
            <td style="padding:40px 40px 24px; text-align:center; background: linear-gradient(180deg, #1a1d27 0%, #16181f 100%);">
              <div style="display:inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); padding:16px 24px; border-radius:16px; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);">
                <h1 style="margin:0; font-size:28px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                  📚 NoteMinds
                </h1>
              </div>
              <p style="margin:12px 0 0; font-size:13px; color:#9496a1; font-weight:500; letter-spacing:1px; text-transform:uppercase;">
                ${t(lang, 'poweredBy')}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px 40px; background-color:#1a1d27;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px; background: linear-gradient(180deg, #16181f 0%, #0f1117 100%); border-top:1px solid #2e3144;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="text-align:center; padding-bottom:16px;">
                    <span style="display:inline-block; margin:0 8px; padding:6px 12px; background-color:#1a1d27; border:1px solid #2e3144; border-radius:6px; font-size:11px; color:#7c7d85; font-weight:600;">
                      🔒 ${t(lang, 'secureEmail')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center; padding-bottom:12px;">
                    <p style="margin:0; font-size:12px; color:#9496a1; line-height:1.6;">
                      ${t(lang, 'footer')}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;">
                    <a href="${FRONTEND_URL}" style="color:#7c3aed; text-decoration:none; font-size:11px; font-weight:600;">
                      ${t(lang, 'needHelp')}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        <!-- End Main Container -->
      </td>
    </tr>
  </table>
  ${trackingPixel}
</body>
</html>`;
}

function verificationEmailTemplate(username, verifyUrl, trackingId, lang = 'vi') {
    return baseTemplate(`
    <!-- Card with gradient background -->
    <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(167, 139, 250, 0.05) 100%); border:1px solid rgba(124, 58, 237, 0.3); border-radius:12px; padding:28px; margin-bottom:24px;">
      <h2 style="margin:0 0 12px; font-size:22px; color:#ffffff; font-weight:700; letter-spacing:-0.3px;">
        ${t(lang, 'verifyEmailTitle')}
      </h2>
      <p style="margin:0; font-size:15px; color:#c4c6d0; line-height:1.7;">
        ${t(lang, 'verifyEmailGreeting')} <strong style="color:#a78bfa; font-weight:700;">${username}</strong>,<br>
        ${t(lang, 'verifyEmailBody')}
      </p>
    </div>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:0 0 28px;">
          <a href="${verifyUrl}" style="display:inline-block; padding:16px 48px; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color:#ffffff; text-decoration:none; border-radius:12px; font-size:15px; font-weight:700; letter-spacing:0.3px; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4); transition: all 0.3s;">
            ✓ ${t(lang, 'verifyEmailButton')}
          </a>
        </td>
      </tr>
    </table>
    
    <!-- Alternative Link -->
    <div style="background-color:#16181f; border:1px solid #2e3144; border-radius:10px; padding:20px; margin-bottom:20px;">
      <p style="margin:0 0 10px; font-size:12px; color:#9496a1; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
        ${t(lang, 'verifyEmailOr')}
      </p>
      <p style="margin:0; font-size:12px; color:#7c3aed; word-break:break-all; line-height:1.6; font-family: 'Courier New', monospace;">
        ${verifyUrl}
      </p>
    </div>
    
    <!-- Warning Box -->
    <div style="border-left:3px solid #7c3aed; background-color:rgba(124, 58, 237, 0.05); padding:14px 16px; border-radius:0 8px 8px 0;">
      <p style="margin:0; font-size:13px; color:#9496a1; line-height:1.6;">
        ⏱️ ${t(lang, 'verifyEmailExpiry')}
      </p>
    </div>
  `, trackingId, lang);
}

function resetPasswordEmailTemplate(username, resetUrl, trackingId, lang = 'vi') {
    return baseTemplate(`
    <!-- Card with gradient background -->
    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%); border:1px solid rgba(239, 68, 68, 0.3); border-radius:12px; padding:28px; margin-bottom:24px;">
      <h2 style="margin:0 0 12px; font-size:22px; color:#ffffff; font-weight:700; letter-spacing:-0.3px;">
        ${t(lang, 'resetPasswordTitle')}
      </h2>
      <p style="margin:0; font-size:15px; color:#c4c6d0; line-height:1.7;">
        ${t(lang, 'resetPasswordGreeting')} <strong style="color:#fca5a5; font-weight:700;">${username}</strong>,<br>
        ${t(lang, 'resetPasswordBody')}
      </p>
    </div>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:0 0 28px;">
          <a href="${resetUrl}" style="display:inline-block; padding:16px 48px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color:#ffffff; text-decoration:none; border-radius:12px; font-size:15px; font-weight:700; letter-spacing:0.3px; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4); transition: all 0.3s;">
            🔑 ${t(lang, 'resetPasswordButton')}
          </a>
        </td>
      </tr>
    </table>
    
    <!-- Alternative Link -->
    <div style="background-color:#16181f; border:1px solid #2e3144; border-radius:10px; padding:20px; margin-bottom:20px;">
      <p style="margin:0 0 10px; font-size:12px; color:#9496a1; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
        ${t(lang, 'resetPasswordOr')}
      </p>
      <p style="margin:0; font-size:12px; color:#ef4444; word-break:break-all; line-height:1.6; font-family: 'Courier New', monospace;">
        ${resetUrl}
      </p>
    </div>
    
    <!-- Warning Box -->
    <div style="border-left:3px solid #ef4444; background-color:rgba(239, 68, 68, 0.05); padding:14px 16px; border-radius:0 8px 8px 0;">
      <p style="margin:0; font-size:13px; color:#9496a1; line-height:1.6;">
        ⏱️ ${t(lang, 'resetPasswordExpiry')}
      </p>
    </div>
  `, trackingId, lang);
}

// ── Send functions ──────────────────────────────────────

export async function sendVerificationEmail(email, token, username, lang = 'vi', saveTracking = null) {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
    const trackingId = generateTrackingId();
    const html = verificationEmailTemplate(username, verifyUrl, trackingId, lang);

    try {
        // Save tracking record if function provided
        if (saveTracking) {
            await saveTracking(trackingId, email, 'verification', username);
        }

        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: t(lang, 'verifyEmailSubject'),
            html,
        });
        console.log(`[Email] Verification email sent to ${email} (tracking: ${trackingId})`);
        return { success: true, trackingId };
    } catch (err) {
        console.error(`[Email] Failed to send verification email to ${email}:`, err.message);
        const errorMsg = lang === 'vi' 
            ? 'Không thể gửi email xác minh. Vui lòng thử lại sau.'
            : 'Unable to send verification email. Please try again later.';
        throw new Error(errorMsg);
    }
}

export async function sendPasswordResetEmail(email, token, username, lang = 'vi', saveTracking = null) {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    const trackingId = generateTrackingId();
    const html = resetPasswordEmailTemplate(username, resetUrl, trackingId, lang);

    try {
        // Save tracking record if function provided
        if (saveTracking) {
            await saveTracking(trackingId, email, 'password_reset', username);
        }

        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: t(lang, 'resetPasswordSubject'),
            html,
        });
        console.log(`[Email] Password reset email sent to ${email} (tracking: ${trackingId})`);
        return { success: true, trackingId };
    } catch (err) {
        console.error(`[Email] Failed to send reset email to ${email}:`, err.message);
        const errorMsg = lang === 'vi'
            ? 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.'
            : 'Unable to send password reset email. Please try again later.';
        throw new Error(errorMsg);
    }
}

// ── Test connection ─────────────────────────────────────
export async function testEmailConnection() {
    try {
        await transporter.verify();
        console.log('📧 SMTP connection verified successfully');
        return true;
    } catch (err) {
        console.error('📧 SMTP connection failed:', err.message);
        return false;
    }
}

// ── Email Tracking Functions ────────────────────────────

export function saveEmailTracking(trackingId, email, type, recipientName) {
    try {
        const stmt = db.prepare(`
            INSERT INTO email_tracking (tracking_id, email, type, recipient_name)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(trackingId, email, type, recipientName);
        return true;
    } catch (err) {
        console.error('[Email Tracking] Failed to save tracking:', err.message);
        return false;
    }
}

export function trackEmailOpen(trackingId, userAgent, ipAddress) {
    try {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            UPDATE email_tracking 
            SET opened_at = COALESCE(opened_at, ?),
                open_count = open_count + 1,
                last_opened_at = ?,
                user_agent = COALESCE(user_agent, ?),
                ip_address = COALESCE(ip_address, ?)
            WHERE tracking_id = ?
        `);
        stmt.run(now, now, userAgent, ipAddress, trackingId);
        return true;
    } catch (err) {
        console.error('[Email Tracking] Failed to track open:', err.message);
        return false;
    }
}

export function getEmailStats() {
    try {
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total_sent,
                COUNT(opened_at) as total_opened,
                CAST(COUNT(opened_at) AS FLOAT) / COUNT(*) * 100 as open_rate,
                SUM(open_count) as total_opens
            FROM email_tracking
        `).get();

        const byType = db.prepare(`
            SELECT 
                type,
                COUNT(*) as sent,
                COUNT(opened_at) as opened,
                CAST(COUNT(opened_at) AS FLOAT) / COUNT(*) * 100 as open_rate,
                SUM(open_count) as total_opens
            FROM email_tracking
            GROUP BY type
        `).all();

        const recent = db.prepare(`
            SELECT 
                tracking_id,
                email,
                type,
                recipient_name,
                sent_at,
                opened_at,
                open_count,
                last_opened_at
            FROM email_tracking
            ORDER BY sent_at DESC
            LIMIT 50
        `).all();

        return {
            overview: stats,
            byType,
            recent,
        };
    } catch (err) {
        console.error('[Email Tracking] Failed to get stats:', err.message);
        return null;
    }
}

export function getEmailStatsDateRange(startDate, endDate) {
    try {
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total_sent,
                COUNT(opened_at) as total_opened,
                CAST(COUNT(opened_at) AS FLOAT) / COUNT(*) * 100 as open_rate,
                SUM(open_count) as total_opens
            FROM email_tracking
            WHERE sent_at >= ? AND sent_at <= ?
        `).get(startDate, endDate);

        const byType = db.prepare(`
            SELECT 
                type,
                COUNT(*) as sent,
                COUNT(opened_at) as opened,
                CAST(COUNT(opened_at) AS FLOAT) / COUNT(*) * 100 as open_rate
            FROM email_tracking
            WHERE sent_at >= ? AND sent_at <= ?
            GROUP BY type
        `).all(startDate, endDate);

        const daily = db.prepare(`
            SELECT 
                DATE(sent_at) as date,
                COUNT(*) as sent,
                COUNT(opened_at) as opened,
                CAST(COUNT(opened_at) AS FLOAT) / COUNT(*) * 100 as open_rate
            FROM email_tracking
            WHERE sent_at >= ? AND sent_at <= ?
            GROUP BY DATE(sent_at)
            ORDER BY date DESC
        `).all(startDate, endDate);

        return {
            overview: stats,
            byType,
            daily,
        };
    } catch (err) {
        console.error('[Email Tracking] Failed to get date range stats:', err.message);
        return null;
    }
}

// ── Blast Email ─────────────────────────────────────────
export async function sendBlastEmail(email, subject, content, displayName, lang = 'vi', saveTracking = null) {
    const trackingId = generateTrackingId();
    const html = baseTemplate(`
    <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(167, 139, 250, 0.05) 100%); border:1px solid rgba(124, 58, 237, 0.3); border-radius:12px; padding:28px; margin-bottom:24px;">
      <h2 style="margin:0 0 12px; font-size:22px; color:#ffffff; font-weight:700; letter-spacing:-0.3px;">
        ${subject}
      </h2>
      <p style="margin:0; font-size:15px; color:#c4c6d0; line-height:1.7;">
        ${t(lang, 'verifyEmailGreeting')} <strong style="color:#a78bfa; font-weight:700;">${displayName || (lang === 'vi' ? 'bạn' : 'there')}</strong>,
      </p>
    </div>
    <div style="font-size:15px; color:#d1d5db; line-height:1.8; padding:0 0 20px;">
      ${content.replace(/\n/g, '<br>')}
    </div>
  `, trackingId, lang);

    try {
        // Save tracking record if function provided
        if (saveTracking) {
            await saveTracking(trackingId, email, 'blast', displayName);
        }

        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: `📢 ${subject} - NoteMinds`,
            html,
        });
        console.log(`[Email] Blast email sent to ${email} (tracking: ${trackingId})`);
        return { success: true, trackingId };
    } catch (err) {
        console.error(`[Email] Failed to send blast email to ${email}:`, err.message);
        throw err;
    }
}
