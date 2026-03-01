import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ── SMTP Configuration ──────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.azurecomm.net',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
    },
});

const FROM_EMAIL = process.env.SMTP_FROM || 'donotreply@loveyuna.today';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'NoteMinds';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Token generation ────────────────────────────────────
export function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

// ── Email templates ─────────────────────────────────────

function baseTemplate(content) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background-color:#0f1117; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1117; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px; background-color:#1a1d27; border-radius:16px; border:1px solid #2e3144; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0; text-align:center;">
              <h1 style="margin:0; font-size:24px; font-weight:700; color:#ffffff;">
                📚 NoteMinds
              </h1>
              <div style="width:40px; height:3px; background:linear-gradient(90deg, #7c3aed, #a78bfa); border-radius:2px; margin:12px auto 0;"></div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px; border-top:1px solid #2e3144; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9496a1;">
                © 2026 NoteMinds — AI-Powered Study Assistant
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function verificationEmailTemplate(username, verifyUrl) {
    return baseTemplate(`
    <h2 style="margin:0 0 8px; font-size:18px; color:#ffffff;">Xác minh email của bạn</h2>
    <p style="margin:0 0 20px; font-size:14px; color:#9496a1; line-height:1.6;">
      Xin chào <strong style="color:#a78bfa;">${username}</strong>,<br>
      Cảm ơn bạn đã đăng ký tài khoản NoteMinds! Vui lòng nhấn nút bên dưới để xác minh email.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 20px;">
          <a href="${verifyUrl}" style="display:inline-block; padding:12px 32px; background:linear-gradient(135deg, #7c3aed, #6d28d9); color:#ffffff; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; letter-spacing:0.3px;">
            ✓ Xác minh Email
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px; font-size:12px; color:#9496a1;">
      Hoặc copy link sau vào trình duyệt:
    </p>
    <p style="margin:0 0 16px; font-size:11px; color:#7c3aed; word-break:break-all; background:#0f1117; padding:10px 14px; border-radius:8px; border:1px solid #2e3144;">
      ${verifyUrl}
    </p>
    <p style="margin:0; font-size:12px; color:#9496a1;">
      Link này sẽ hết hạn sau <strong>5 phút</strong>. Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
    </p>
  `);
}

function resetPasswordEmailTemplate(username, resetUrl) {
    return baseTemplate(`
    <h2 style="margin:0 0 8px; font-size:18px; color:#ffffff;">Đặt lại mật khẩu</h2>
    <p style="margin:0 0 20px; font-size:14px; color:#9496a1; line-height:1.6;">
      Xin chào <strong style="color:#a78bfa;">${username}</strong>,<br>
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 20px;">
          <a href="${resetUrl}" style="display:inline-block; padding:12px 32px; background:linear-gradient(135deg, #ef4444, #dc2626); color:#ffffff; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; letter-spacing:0.3px;">
            🔑 Đặt lại mật khẩu
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px; font-size:12px; color:#9496a1;">
      Hoặc copy link sau vào trình duyệt:
    </p>
    <p style="margin:0 0 16px; font-size:11px; color:#ef4444; word-break:break-all; background:#0f1117; padding:10px 14px; border-radius:8px; border:1px solid #2e3144;">
      ${resetUrl}
    </p>
    <p style="margin:0; font-size:12px; color:#9496a1;">
      Link này sẽ hết hạn sau <strong>5 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
    </p>
  `);
}

// ── Send functions ──────────────────────────────────────

export async function sendVerificationEmail(email, token, username) {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
    const html = verificationEmailTemplate(username, verifyUrl);

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: '✉️ Xác minh email - NoteMinds',
            html,
        });
        console.log(`[Email] Verification email sent to ${email}`);
        return true;
    } catch (err) {
        console.error(`[Email] Failed to send verification email to ${email}:`, err.message);
        throw new Error('Không thể gửi email xác minh. Vui lòng thử lại sau.');
    }
}

export async function sendPasswordResetEmail(email, token, username) {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    const html = resetPasswordEmailTemplate(username, resetUrl);

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: '🔑 Đặt lại mật khẩu - NoteMinds',
            html,
        });
        console.log(`[Email] Password reset email sent to ${email}`);
        return true;
    } catch (err) {
        console.error(`[Email] Failed to send reset email to ${email}:`, err.message);
        throw new Error('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
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

// ── Blast Email ─────────────────────────────────────────
export async function sendBlastEmail(email, subject, content, displayName) {
    const html = baseTemplate(`
    <h2 style="margin:0 0 8px; font-size:18px; color:#ffffff;">${subject}</h2>
    <p style="margin:0 0 20px; font-size:14px; color:#9496a1; line-height:1.6;">
      Xin chào <strong style="color:#a78bfa;">${displayName || 'bạn'}</strong>,
    </p>
    <div style="font-size:14px; color:#d1d5db; line-height:1.7;">
      ${content.replace(/\n/g, '<br>')}
    </div>
  `);

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject: `📢 ${subject} - NoteMinds`,
        html,
    });
}
