import crypto from 'crypto';
import db from './db.js';
import { sendExpiryReminderEmail, getEmailStatus } from './email.js';

/**
 * DM Locker Pro - Smart Expiry Alerts & Reminder Scheduler
 *
 * Requirements:
 * - Default intervals: 30 days, 7 days, 1 day before expiry (+ optional 0d expiry day & post-expiry).
 * - Timezone-aware calculation based on configured user or system timezone.
 * - Deduplication & Replay Protection: Database unique constraint + atomic checks prevent duplicate sends.
 * - Concurrency control: Mutex prevents overlapping job executions.
 * - Error isolation: Failed email attempts are logged as FAILED and never marked as SENT.
 * - Stop obsolete reminders on renewal, deletion, or expiry date changes.
 */

let isJobRunning = false;
let schedulerTimer = null;

/**
 * Calculates calendar days remaining until expiry in the specified timezone
 */
export function calculateDaysRemaining(expiryDateStr, timezone = 'Asia/Kolkata') {
  if (!expiryDateStr || typeof expiryDateStr !== 'string') return null;

  try {
    const tz = timezone || 'Asia/Kolkata';
    const now = new Date();

    // Get current YYYY-MM-DD in the target timezone
    const todayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const [todayY, todayM, todayD] = todayParts.split('-').map(Number);
    const [expY, expM, expD] = expiryDateStr.split('-').map(Number);

    if (isNaN(expY) || isNaN(expM) || isNaN(expD)) return null;

    const todayUtc = Date.UTC(todayY, todayM - 1, todayD);
    const expUtc = Date.UTC(expY, expM - 1, expD);

    const diffMs = expUtc - todayUtc;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch (err) {
    console.warn('[calculateDaysRemaining error]', err.message);
    return null;
  }
}

/**
 * Cancels or cleans obsolete reminders when a document is deleted, renewed, or updated
 */
export function cancelObsoleteReminders(documentId, newExpiryDate = null) {
  try {
    if (newExpiryDate) {
      db.prepare(`
        UPDATE reminder_logs 
        SET status = 'CANCELLED' 
        WHERE document_id = ? AND expiry_date != ? AND status != 'SENT'
      `).run(documentId, newExpiryDate);
    } else {
      db.prepare(`
        UPDATE reminder_logs 
        SET status = 'CANCELLED' 
        WHERE document_id = ? AND status != 'SENT'
      `).run(documentId);
    }
  } catch (err) {
    console.warn('[cancelObsoleteReminders error]', err.message);
  }
}

/**
 * Evaluates and processes due reminders across all active vault documents
 *
 * @param {Object} options
 * @param {string} [options.filterUserId] - Optional user ID to check only one user's documents
 * @param {boolean} [options.forceSend] - Optional flag to bypass interval matching for testing
 * @param {string} [options.frontendBaseUrl] - Base URL for renewal links
 */
export async function processDueReminders(options = {}) {
  const { filterUserId = null, forceSend = false, frontendBaseUrl = 'http://localhost:5173' } = options;

  if (isJobRunning) {
    console.log('[Reminder Scheduler] Job is already running. Skipping overlapping execution.');
    return {
      status: 'SKIPPED',
      reason: 'OVERLAPPING_JOB_PREVENTED',
      processed: 0,
      sent: 0,
      errors: 0
    };
  }

  isJobRunning = true;

  const results = {
    status: 'COMPLETED',
    checkedDocuments: 0,
    dueRemindersFound: 0,
    sent: 0,
    failed: 0,
    skippedAlreadySent: 0,
    skippedDisabled: 0,
    details: []
  };

  try {
    // Query active, non-archived documents with valid expiry dates
    let query = `
      SELECT d.id as doc_id, d.user_id, d.title, d.category, d.expiry_date, d.status as doc_status,
             COALESCE(d.reminders_enabled, 1) as doc_reminders_enabled,
             u.username, u.email as user_email,
             COALESCE(u.reminder_email_enabled, 1) as user_email_enabled,
             COALESCE(u.reminder_intervals, '[30, 7, 1]') as user_intervals_json,
             COALESCE(u.reminder_post_expiry, 0) as user_post_expiry,
             COALESCE(u.timezone, 'Asia/Kolkata') as user_timezone
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.status != 'archived' AND d.expiry_date IS NOT NULL AND d.expiry_date != ''
    `;
    const params = [];

    if (filterUserId) {
      query += ' AND d.user_id = ?';
      params.push(filterUserId);
    }

    const eligibleDocs = db.prepare(query).all(...params);
    results.checkedDocuments = eligibleDocs.length;

    for (const doc of eligibleDocs) {
      // Check if user or document has disabled email reminders
      if (!doc.user_email_enabled || !doc.doc_reminders_enabled) {
        results.skippedDisabled++;
        continue;
      }

      const daysRemaining = calculateDaysRemaining(doc.expiry_date, doc.user_timezone);
      if (daysRemaining === null) continue;

      let configuredIntervals = [30, 7, 1];
      try {
        configuredIntervals = JSON.parse(doc.user_intervals_json);
        if (!Array.isArray(configuredIntervals)) configuredIntervals = [30, 7, 1];
      } catch {
        configuredIntervals = [30, 7, 1];
      }

      // Check which interval triggers today
      const matchedIntervals = [];

      for (const interval of configuredIntervals) {
        if (daysRemaining === Number(interval)) {
          matchedIntervals.push(Number(interval));
        }
      }

      // Check post-expiry alert if enabled (send once when overdue between -1 and -7 days)
      if (doc.user_post_expiry && daysRemaining < 0 && daysRemaining >= -7) {
        matchedIntervals.push(-1); // -1 represents post-expiry alert stage
      }

      // If forceSend is requested (e.g. in manual test mode for synthetic docs)
      if (forceSend && matchedIntervals.length === 0) {
        matchedIntervals.push(daysRemaining);
      }

      for (const stage of matchedIntervals) {
        results.dueRemindersFound++;

        // Deduplication Check: Has this document already received this reminder for this exact expiry date?
        const alreadySent = db.prepare(`
          SELECT id, status, sent_at FROM reminder_logs
          WHERE document_id = ? AND expiry_date = ? AND interval_days = ? AND status = 'SENT'
        `).get(doc.doc_id, doc.expiry_date, stage);

        if (alreadySent) {
          results.skippedAlreadySent++;
          continue;
        }

        const logId = `rem_${crypto.randomBytes(6).toString('hex')}`;
        const nowIso = new Date().toISOString();
        const renewalLink = `${(frontendBaseUrl || 'http://localhost:5173').replace(/\/+$/, '')}/#renewal`;

        try {
          // Attempt dispatch via Nodemailer
          const emailResult = await sendExpiryReminderEmail({
            to: doc.user_email,
            recipientName: doc.username,
            documentTitle: doc.title,
            documentCategory: doc.category,
            expiryDate: doc.expiry_date,
            daysRemaining,
            renewalUrl: renewalLink
          });

          // Only record as SENT after successful provider response!
          db.prepare(`
            INSERT INTO reminder_logs (
              id, user_id, document_id, document_title, document_category,
              expiry_date, interval_days, recipient_email, status, message_id,
              error_message, sent_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            logId,
            doc.user_id,
            doc.doc_id,
            doc.title,
            doc.category,
            doc.expiry_date,
            stage,
            doc.user_email,
            'SENT',
            emailResult.messageId || null,
            null,
            nowIso,
            nowIso
          );

          results.sent++;
          results.details.push({
            logId,
            documentTitle: doc.title,
            recipient: doc.user_email,
            stage,
            daysRemaining,
            status: 'SENT',
            mockMode: emailResult.mockMode
          });
        } catch (err) {
          console.error(`[Reminder Dispatch Error] Doc: "${doc.title}", Recipient: ${doc.user_email}:`, err.message);

          // Record failure: NEVER mark as SENT!
          db.prepare(`
            INSERT INTO reminder_logs (
              id, user_id, document_id, document_title, document_category,
              expiry_date, interval_days, recipient_email, status, message_id,
              error_message, sent_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            logId,
            doc.user_id,
            doc.doc_id,
            doc.title,
            doc.category,
            doc.expiry_date,
            stage,
            doc.user_email,
            'FAILED',
            null,
            err.message,
            null,
            nowIso
          );

          results.failed++;
          results.details.push({
            logId,
            documentTitle: doc.title,
            recipient: doc.user_email,
            stage,
            daysRemaining,
            status: 'FAILED',
            error: err.message
          });
        }
      }
    }
  } catch (err) {
    console.error('[processDueReminders Fatal Exception]', err);
    results.status = 'ERROR';
    results.error = err.message;
  } finally {
    isJobRunning = false;
  }

  return results;
}

/**
 * Initializes the background scheduled job running daily
 */
export function startReminderScheduler(intervalMs = 24 * 60 * 60 * 1000) {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  console.log('[Reminder Scheduler] Initialized daily background reminder checking job.');

  // Run initial check 5 seconds after startup to process any due reminders missed during server sleep
  setTimeout(() => {
    processDueReminders().catch((err) => {
      console.warn('[Reminder Scheduler Initial Run Error]', err.message);
    });
  }, 5000);

  // Set recurring daily interval
  schedulerTimer = setInterval(() => {
    processDueReminders().catch((err) => {
      console.warn('[Reminder Scheduler Recurring Run Error]', err.message);
    });
  }, intervalMs);

  return schedulerTimer;
}

export function stopReminderScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
