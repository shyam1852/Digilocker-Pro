import crypto from 'crypto';
import db from './db.js';
import { calculateDaysRemaining, cancelObsoleteReminders, processDueReminders } from './reminders.js';
import { getEmailStatus } from './email.js';

const BASE_URL = 'http://localhost:3001/api';

async function runReminderTests() {
  console.log('====================================================');
  console.log('  DM LOCKER PRO - SMART EXPIRY & REMINDER TEST SUITE ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. TIMEZONE-AWARE DAYS CALCULATION
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const getDateStringPlusDays = (days) => {
      const d = new Date(Date.now() + days * 24 * 3600 * 1000);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    };

    const dateIn30 = getDateStringPlusDays(30);
    const dateIn7 = getDateStringPlusDays(7);
    const dateIn1 = getDateStringPlusDays(1);
    const dateExpired = getDateStringPlusDays(-5);

    const calc30 = calculateDaysRemaining(dateIn30, 'UTC');
    const calc7 = calculateDaysRemaining(dateIn7, 'UTC');
    const calc1 = calculateDaysRemaining(dateIn1, 'UTC');
    const calcExp = calculateDaysRemaining(dateExpired, 'UTC');

    assert(calc30 === 30, `1. Timezone Days Calculation: 30 days ahead resolves to 30 (got: ${calc30})`);
    assert(calc7 === 7, `2. Timezone Days Calculation: 7 days ahead resolves to 7 (got: ${calc7})`);
    assert(calc1 === 1, `3. Timezone Days Calculation: 1 day ahead resolves to 1 (got: ${calc1})`);
    assert(calcExp === -5, `4. Timezone Days Calculation: Expired date resolves to -5 (got: ${calcExp})`);

    // 2. REGISTER PRIMARY TEST USER
    const testUsername = `rem_custodian_${Date.now().toString(36)}`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: 'Password123!',
        vault_salt: 'SALT_REMINDERS_TEST_32HEX',
        nominee_name: 'Priya Keshri',
        nominee_email: 'priya@example.com',
        nominee_phone: '+919876543210'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.token, '5. Registered custodian account with registered email');
    const authToken = regData.token;
    const userId = regData.user.id;

    // 3. CREATE SYNTHETIC VAULT DOCUMENTS TARGETING 30d, 7d, 1d, EXPIRED, AND DISABLED INTERVALS
    const createDoc = async (title, category, expiryDate, remindersEnabled = 1) => {
      const res = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title,
          category,
          policy_number: `POL-${Date.now().toString(36).toUpperCase()}`,
          insurer_name: 'Care Health',
          expiry_date: expiryDate,
          encrypted_blob: Buffer.from('TEST_PAYLOAD').toString('base64'),
          encryption_iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
          file_name: `${title}.pdf`,
          file_type: 'application/pdf',
          file_size_bytes: 1024
        })
      });
      const data = await res.json();
      if (remindersEnabled === 0 && data.document) {
        await fetch(`${BASE_URL}/documents/${data.document.id}/reminders`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ reminders_enabled: false })
        });
      }
      return data.document;
    };

    // Calculate dates matching the user's default timezone (Asia/Kolkata)
    const tzToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const addDaysToTzToday = (days) => {
      const [y, m, d] = tzToday.split('-').map(Number);
      const target = new Date(Date.UTC(y, m - 1, d + days));
      return target.toISOString().split('T')[0];
    };

    const doc30 = await createDoc('Health Shield 30-Day Policy', 'Health Insurance', addDaysToTzToday(30), 1);
    const doc7 = await createDoc('Life Cover 7-Day Policy', 'Life Insurance', addDaysToTzToday(7), 1);
    const doc1 = await createDoc('Motor Comprehensive 1-Day Policy', 'Vehicle Insurance', addDaysToTzToday(1), 1);
    const docExpired = await createDoc('Expired Old Policy', 'Health Insurance', addDaysToTzToday(-3), 1);
    const docFuture = await createDoc('Future 90-Day Policy', 'Health Insurance', addDaysToTzToday(90), 1);
    const docDisabled = await createDoc('Disabled Alert Policy', 'Health Insurance', addDaysToTzToday(7), 0);

    assert(doc30 && doc7 && doc1 && docExpired && docFuture && docDisabled, '6. Synthetic test documents deposited in vault with staggered expiry dates');

    // 4. MANUAL EXPIRY DATE CORRECTION & STRICT VALIDATION
    const invalidDateRes = await fetch(`${BASE_URL}/documents/${docFuture.id}/expiry`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ expiry_date: 'invalid-date-format' })
    });
    assert(invalidDateRes.status === 400, '7. Manual Expiry Update: Rejects invalid date format with 400');

    const validUpdateRes = await fetch(`${BASE_URL}/documents/${docFuture.id}/expiry`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ expiry_date: addDaysToTzToday(60), category: 'Health Insurance' })
    });
    const validUpdateData = await validUpdateRes.json();
    assert(
      validUpdateRes.ok && validUpdateData.document.expiry_date === addDaysToTzToday(60),
      '8. Manual Expiry Update: Successfully updates and persists corrected expiry date'
    );

    // 5. REMINDER SETTINGS UPDATE
    const settingsRes = await fetch(`${BASE_URL}/reminders/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        reminder_email_enabled: true,
        reminder_intervals: [30, 7, 1],
        reminder_post_expiry: true,
        timezone: 'Asia/Kolkata'
      })
    });
    assert(settingsRes.ok, '9. Reminders Settings: Configured intervals [30, 7, 1] and post-expiry enabled');

    // 6. PROCESS DUE REMINDERS (FIRST PASS)
    const run1 = await processDueReminders({ filterUserId: userId });
    assert(
      run1.status === 'COMPLETED' && run1.sent >= 3,
      `10. Reminder Engine: Dispatched due alerts for 30d, 7d, and 1d policies (sent: ${run1.sent})`
    );

    // Verify logs in database
    const logsAfterRun1 = db.prepare("SELECT * FROM reminder_logs WHERE user_id = ? AND status = 'SENT'").all(userId);
    assert(
      logsAfterRun1.length >= 3,
      `11. Database Audit Ledger: Durable records inserted with status = SENT (${logsAfterRun1.length} records)`
    );

    // 7. DUPLICATE PREVENTION (SECOND PASS)
    const run2 = await processDueReminders({ filterUserId: userId });
    assert(
      run2.status === 'COMPLETED' && run2.sent === 0 && run2.skippedAlreadySent >= 3,
      `12. Replay & Duplicate Prevention: Second run dispatched 0 duplicates (skippedAlreadySent: ${run2.skippedAlreadySent})`
    );

    // 8. DATABASE UNIQUE CONSTRAINT ENFORCEMENT
    let dbConstraintBlocked = false;
    try {
      const existing = logsAfterRun1[0];
      db.prepare(`
        INSERT INTO reminder_logs (
          id, user_id, document_id, document_title, document_category,
          expiry_date, interval_days, recipient_email, status, message_id,
          error_message, sent_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `dup_${Date.now()}`,
        existing.user_id,
        existing.document_id,
        existing.document_title,
        existing.document_category,
        existing.expiry_date,
        existing.interval_days,
        existing.recipient_email,
        'SENT',
        'msg_dup',
        null,
        new Date().toISOString(),
        new Date().toISOString()
      );
    } catch (err) {
      dbConstraintBlocked = err.message.includes('UNIQUE constraint failed');
    }
    assert(
      dbConstraintBlocked,
      '13. Atomic DB Deduplication: UNIQUE constraint idx_reminder_dedup rejects duplicate SENT records'
    );

    // 9. DISABLED REMINDERS PROTECTION
    const disabledDocLogs = db.prepare('SELECT * FROM reminder_logs WHERE document_id = ?').all(docDisabled.id);
    assert(
      disabledDocLogs.length === 0,
      '14. Document Muting: Muted document (reminders_enabled = 0) received zero notifications'
    );

    // 10. EXPIRY DATE CHANGE RESETS REMINDERS PROPERLY
    // Update doc30 with a new expiry date (e.g. 7 days away)
    const dateChangedRes = await fetch(`${BASE_URL}/documents/${doc30.id}/expiry`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ expiry_date: addDaysToTzToday(7) })
    });
    assert(dateChangedRes.ok, '15. Expiry Date Modification: Updated document with a new validity date');

    // Process reminders again - the new date should trigger the 7-day reminder for doc30
    const run3 = await processDueReminders({ filterUserId: userId });
    assert(
      run3.sent >= 1,
      `16. Rescheduling upon Expiry Change: New expiry date received fresh reminder stage (${run3.sent} sent)`
    );

    // 11. RATE-LIMITED TEST EMAIL ENDPOINT
    const testEmail1 = await fetch(`${BASE_URL}/reminders/send-test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(testEmail1.ok, '17. Test Email Dispatch: Authenticated user test email endpoint executes');

    // Immediate second call must be rate-limited with 429
    const testEmail2 = await fetch(`${BASE_URL}/reminders/send-test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(testEmail2.status === 429, '18. Rate Limiting: Rapid consecutive test email requests blocked with 429');

    // 12. CROSS-USER AUTHORIZATION ISOLATION
    const otherUserReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `other_custodian_${Date.now().toString(36)}`,
        email: `other_${Date.now()}@example.com`,
        password: 'Password123!',
        vault_salt: 'SALT_OTHER_32HEX'
      })
    }).then((r) => r.json());
    const otherToken = otherUserReg.token;

    const crossUserEdit = await fetch(`${BASE_URL}/documents/${doc1.id}/expiry`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${otherToken}`
      },
      body: JSON.stringify({ expiry_date: '2028-01-01' })
    });
    assert(crossUserEdit.status === 404, '19. Security Isolation: Cannot alter expiry date of another user\'s document (404)');

    // 13. RENEWAL INVALIDATES OBSOLETE REMINDERS
    cancelObsoleteReminders(doc1.id);
    const cancelledLogs = db.prepare("SELECT status FROM reminder_logs WHERE document_id = ? AND status != 'SENT'").all(doc1.id);
    assert(
      cancelledLogs.every((l) => l.status === 'CANCELLED'),
      '20. Renewal / Deletion Lifecycle: Obsolete pending reminders marked as CANCELLED'
    );

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal Reminder Test Error:', err);
    process.exit(1);
  }
}

runReminderTests();
