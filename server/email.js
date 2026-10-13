import nodemailer from 'nodemailer';

/**
 * DM Locker Pro - Zero-Knowledge Email Notification Engine
 *
 * Requirements:
 * - Credentials read strictly from backend environment variables.
 * - Never expose credentials or sensitive data (keys, payloads, policy numbers) in emails or responses.
 * - Handles SMTP errors, timeouts, and connection rejection.
 * - Distinguishes verified SMTP delivery from mock/unconfigured sandbox mode.
 */

export function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim() || '"DM Locker Pro" <noreply@dmlocker.pro>';

  const isConfigured = Boolean(host && user && pass);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    isConfigured
  };
}

/**
 * Safe status object for API responses (Zero credential leakage)
 */
export function getEmailStatus() {
  const config = getSmtpConfig();
  return {
    isConfigured: config.isConfigured,
    host: config.isConfigured ? config.host : null,
    port: config.isConfigured ? config.port : null,
    secure: config.isConfigured ? config.secure : false,
    from: config.from,
    mockMode: !config.isConfigured
  };
}

/**
 * Creates a configured Nodemailer transporter or returns null if unconfigured
 */
export function createTransporter() {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

/**
 * Sends a Smart Expiry Alert Email
 *
 * ZERO SENSITIVE DATA INVARIANT:
 * Contains only document title, category, expiry date, days remaining, and Renewal Center link.
 * NEVER contains decrypted bytes, IVs, encryption keys, or sensitive policy text.
 */
export async function sendExpiryReminderEmail({
  to,
  recipientName = 'Valued Custodian',
  documentTitle,
  documentCategory = 'General Document',
  expiryDate,
  daysRemaining,
  renewalUrl = 'http://localhost:5173/#renewal'
}) {
  if (!to || !to.includes('@')) {
    throw new Error('Valid recipient email address is required.');
  }

  const config = getSmtpConfig();
  const urgencyLabel =
    daysRemaining < 0
      ? 'EXPIRED'
      : daysRemaining === 0
      ? 'EXPIRES TODAY'
      : daysRemaining === 1
      ? 'EXPIRES TOMORROW'
      : `${daysRemaining} DAYS REMAINING`;

  const urgencyColor =
    daysRemaining < 0
      ? '#ef4444'
      : daysRemaining <= 1
      ? '#ea580c'
      : daysRemaining <= 7
      ? '#f59e0b'
      : '#2563eb';

  const subject = `[Action Required] Expiry Alert: "${documentTitle}" (${urgencyLabel})`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b132b; margin: 0; padding: 24px; color: #e2e8f0; }
    .card { max-width: 580px; margin: 0 auto; background-color: #1c2541; border: 1px solid #3a506b; border-radius: 12px; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .brand { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #48cae4; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #ffffff; background-color: ${urgencyColor}; margin-bottom: 14px; text-transform: uppercase; }
    h1 { font-size: 20px; color: #ffffff; margin: 0 0 12px 0; font-weight: 700; }
    p { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0; }
    .details-box { background-color: #0b132b; border: 1px solid #3a506b; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(58,80,107,0.3); font-size: 13px; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #94a3b8; }
    .value { font-weight: 600; color: #ffffff; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin: 16px 0; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(58,80,107,0.4); font-size: 12px; color: #64748b; line-height: 1.5; }
    .zk-notice { font-size: 11px; color: #10b981; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <span>🛡️ DM Locker Pro — Expiry Custody Alert</span>
    </div>

    <div class="badge">${urgencyLabel}</div>

    <h1>Upcoming Expiration Notice</h1>
    <p>Hello ${recipientName},</p>
    <p>A monitored document in your zero-knowledge vault is reaching its recorded validity limit. Automated renewal intervention or record updating is recommended.</p>

    <div class="details-box">
      <div class="detail-row">
        <span class="label">Document Record:</span>
        <span class="value">${documentTitle}</span>
      </div>
      <div class="detail-row">
        <span class="label">Category:</span>
        <span class="value">${documentCategory}</span>
      </div>
      <div class="detail-row">
        <span class="label">Recorded Expiry Date:</span>
        <span class="value">${expiryDate}</span>
      </div>
      <div class="detail-row">
        <span class="label">Time Remaining:</span>
        <span class="value" style="color: ${urgencyColor};">${daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} day(s)`}</span>
      </div>
    </div>

    <a href="${renewalUrl}" class="btn">Open Self-Healing Renewal Center &rarr;</a>

    <div class="footer">
      <div>You received this notification because email reminders are enabled for your registered account (${to}).</div>
      <div class="zk-notice">🔒 <strong>Zero-Knowledge Privacy Guarantee:</strong> This alert was generated from vault metadata. Your underlying document ciphertext, decryption keys, and policy files were never accessed or decrypted.</div>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `DM Locker Pro - Expiry Alert
=====================================
Status: ${urgencyLabel}
Document: ${documentTitle} (${documentCategory})
Expiry Date: ${expiryDate}
Remaining: ${daysRemaining} day(s)

To review and dispatch autonomous TinyFish renewal agents, visit:
${renewalUrl}

Zero-Knowledge Privacy: Document contents and keys remain encrypted on-device.`;

  if (!config.isConfigured) {
    console.log(`[Email Reminder Mock] Recipient: ${to} | Subject: "${subject}" | Days Remaining: ${daysRemaining}`);
    return {
      success: true,
      mockMode: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      recipient: to,
      subject
    };
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text: textContent,
    html: htmlContent
  });

  return {
    success: true,
    mockMode: false,
    messageId: info.messageId,
    recipient: to,
    subject
  };
}

/**
 * Sends a test email to verify SMTP configuration
 */
export async function sendTestEmail({ to, username = 'Custodian' }) {
  if (!to || !to.includes('@')) {
    throw new Error('Valid recipient email address is required.');
  }

  const config = getSmtpConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      mockMode: true,
      error: 'SMTP credentials are not configured in backend environment variables (.env). Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to send real emails.'
    };
  }

  const transporter = createTransporter();

  // First verify transporter credentials
  try {
    await transporter.verify();
  } catch (err) {
    throw new Error(`SMTP Connection Verification Failed: ${err.message}`);
  }

  const subject = '[DM Locker Pro] SMTP Email Integration Test Successful';
  const htmlContent = `
<div style="font-family: sans-serif; background: #0b132b; color: #e2e8f0; padding: 24px; border-radius: 8px;">
  <h2 style="color: #10b981;">✅ SMTP Integration Verified</h2>
  <p>Hello <strong>${username}</strong>,</p>
  <p>Your DM Locker Pro email notification provider is successfully configured and reachable.</p>
  <div style="background: #1c2541; padding: 12px; border-radius: 6px; font-size: 13px; margin: 16px 0;">
    <div><strong>SMTP Host:</strong> ${config.host}:${config.port}</div>
    <div><strong>Sender:</strong> ${config.from}</div>
    <div><strong>Verified At:</strong> ${new Date().toISOString()}</div>
  </div>
  <p style="font-size: 12px; color: #94a3b8;">Automated Smart Expiry Alerts will be delivered to this address according to your configured intervals (30d, 7d, 1d).</p>
</div>
  `;

  const info = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text: `SMTP Integration Verified successfully for ${username}.`,
    html: htmlContent
  });

  return {
    success: true,
    mockMode: false,
    messageId: info.messageId,
    recipient: to
  };
}
