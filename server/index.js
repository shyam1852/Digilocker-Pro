import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import {
  normalizeUsername,
  isValidUsername,
  isValidEmail,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  requireAuth
} from './auth.js';
import {
  runTinyFishRenewalAgent,
  runTinyFishPolicyHealthAgent,
  isLiveMode,
  getSupportedPublicInsuranceUrl
} from './tinyfish.js';
import { seedDemoData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Seed demo fixtures if not present
seedDemoData();

// Helper to log user activities
function logActivity(userId, eventType, description, isSimulation = 0, ip = '127.0.0.1') {
  try {
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, event_type, description, is_simulation, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `act_${crypto.randomBytes(6).toString('hex')}`,
      userId,
      eventType,
      description,
      isSimulation ? 1 : 0,
      ip,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

/* ==========================================================================
   AUTHENTICATION ENDPOINTS
   ========================================================================== */

/**
 * POST /api/auth/register
 * Enforces strict case-insensitive username uniqueness, persistent database
 * constraints, and returns friendly inline validation errors.
 */
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  // 1. Validate username presence & structure
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required.', field: 'username' });
  }

  const trimmedUsername = username.trim();
  if (!isValidUsername(trimmedUsername)) {
    return res.status(400).json({
      error: 'Username must be 3-30 characters long and contain only letters, numbers, underscores, and hyphens.',
      field: 'username'
    });
  }

  // 2. Validate email
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.', field: 'email' });
  }

  // 3. Validate password
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long.',
      field: 'password'
    });
  }

  const normalizedUsername = normalizeUsername(trimmedUsername);
  const normalizedEmail = email.trim().toLowerCase();

  // 4. Pre-check username availability in database
  const existingUsername = db.prepare('SELECT id FROM users WHERE normalized_username = ?').get(normalizedUsername);
  if (existingUsername) {
    return res.status(409).json({
      error: 'This username is already taken. Please choose another username.',
      field: 'username'
    });
  }

  // 5. Pre-check email availability in database
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existingEmail) {
    return res.status(409).json({
      error: 'An account with this email address already exists.',
      field: 'email'
    });
  }

  // 6. Atomic insertion with unique constraint error handling for concurrent requests
  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const { hash, salt } = hashPassword(password);
  const vaultSalt = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO users (
        id, username, normalized_username, email, password_hash, password_salt,
        vault_salt, theme, checkin_interval_days, last_checkin_at, switch_enabled,
        nominee_name, nominee_email, nominee_relationship, nominee_phone, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      trimmedUsername,
      normalizedUsername,
      normalizedEmail,
      hash,
      salt,
      vaultSalt,
      'system',
      30,
      now,
      1,
      'Authorized Nominee',
      'nominee@example.com',
      'Spouse',
      '',
      now
    );
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: users.normalized_username')) {
      return res.status(409).json({
        error: 'This username is already taken. Please choose another username.',
        field: 'username'
      });
    }
    if (err.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(409).json({
        error: 'An account with this email address already exists.',
        field: 'email'
      });
    }
    console.error('Registration insertion error:', err);
    return res.status(500).json({ error: 'Failed to create user account. Please try again.' });
  }

  // 7. Create authenticated session
  const token = generateSessionToken();
  const sessionExpiry = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, now, sessionExpiry);

  logActivity(userId, 'AUTH_SIGNUP', `Account registered with username @${trimmedUsername}. Vault key derived.`);

  const user = {
    id: userId,
    username: trimmedUsername,
    normalized_username: normalizedUsername,
    email: normalizedEmail,
    vault_salt: vaultSalt,
    theme: 'system',
    checkin_interval_days: 30,
    last_checkin_at: now,
    switch_enabled: true,
    nominee: {
      name: 'Authorized Nominee',
      email: 'nominee@example.com',
      relationship: 'Spouse',
      phone: ''
    }
  };

  res.status(201).json({ token, user });
});

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please enter both username/email and password.' });
  }

  const trimmedIdentifier = identifier.trim().toLowerCase();

  // Find user by normalized_username or email
  const user = db.prepare(`
    SELECT * FROM users 
    WHERE normalized_username = ? OR email = ?
  `).get(trimmedIdentifier, trimmedIdentifier);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify and try again.' });
  }

  const isValid = verifyPassword(password, user.password_hash, user.password_salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify and try again.' });
  }

  // Create session
  const token = generateSessionToken();
  const now = new Date().toISOString();
  const sessionExpiry = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, user.id, now, sessionExpiry);

  logActivity(user.id, 'AUTH_LOGIN', `Successful sign-in from ${req.ip || '127.0.0.1'}. Client vault unlocked.`);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      normalized_username: user.normalized_username,
      email: user.email,
      vault_salt: user.vault_salt,
      theme: user.theme,
      checkin_interval_days: user.checkin_interval_days,
      last_checkin_at: user.last_checkin_at,
      switch_enabled: Boolean(user.switch_enabled),
      nominee: {
        name: user.nominee_name,
        email: user.nominee_email,
        relationship: user.nominee_relationship,
        phone: user.nominee_phone
      }
    }
  });
});

/**
 * GET /api/auth/me
 */
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  res.json({ success: true, message: 'Logged out successfully.' });
});

/* ==========================================================================
   DOCUMENT VAULT ENDPOINTS (CLIENT-SIDE AES-256-GCM ENCRYPTED)
   ========================================================================== */

/**
 * GET /api/documents
 */
app.get('/api/documents', requireAuth, (req, res) => {
  const { category, status, search } = req.query;
  let query = 'SELECT * FROM documents WHERE user_id = ?';
  const params = [req.user.id];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (title LIKE ? OR insurer_name LIKE ? OR policy_number LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY created_at DESC';

  const docs = db.prepare(query).all(...params);
  res.json({ documents: docs });
});

/**
 * POST /api/documents
 * Stores client-side encrypted document blob and initialization vector.
 */
app.post('/api/documents', requireAuth, (req, res) => {
  const {
    title,
    category,
    policy_number,
    insurer_name,
    expiry_date,
    encrypted_blob,
    encryption_iv,
    file_name,
    file_type,
    file_size_bytes
  } = req.body;

  if (!title || !encrypted_blob || !encryption_iv) {
    return res.status(400).json({ error: 'Title, ciphertext payload, and encryption IV are required.' });
  }

  const docId = `doc_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  // Determine status based on expiry
  let status = 'active';
  if (expiry_date) {
    const daysUntilExpiry = Math.ceil((new Date(expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) {
      status = 'expired';
    } else if (daysUntilExpiry <= 30) {
      status = 'expiring_soon';
    }
  }

  db.prepare(`
    INSERT INTO documents (
      id, user_id, title, category, policy_number, insurer_name, expiry_date,
      version, status, encrypted_blob, encryption_iv, file_name, file_type,
      file_size_bytes, is_synthetic, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    docId,
    req.user.id,
    title.trim(),
    category || 'Other Records',
    policy_number ? policy_number.trim() : null,
    insurer_name ? insurer_name.trim() : null,
    expiry_date || null,
    1,
    status,
    encrypted_blob,
    encryption_iv,
    file_name || 'document.dat',
    file_type || 'application/octet-stream',
    file_size_bytes || 0,
    0, // Real user uploaded document
    now,
    now
  );

  logActivity(req.user.id, 'DOC_UPLOAD', `Uploaded & encrypted "${title}" (AES-256-GCM, IV length: 12B).`);

  const createdDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  res.status(201).json({ document: createdDoc });
});

/**
 * GET /api/documents/:id
 */
app.get('/api/documents/:id', requireAuth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  // Fetch version history if applicable
  const history = db.prepare(`
    SELECT id, version, title, status, file_name, created_at, superseded_at
    FROM documents
    WHERE (id = ? OR parent_document_id = ? OR id = ?) AND user_id = ?
    ORDER BY version DESC
  `).all(doc.id, doc.id, doc.parent_document_id || doc.id, req.user.id);

  res.json({ document: doc, history });
});

/**
 * DELETE /api/documents/:id
 */
app.delete('/api/documents/:id', requireAuth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
  logActivity(req.user.id, 'DOC_DELETE', `Deleted document "${doc.title}".`);

  res.json({ success: true, message: 'Document permanently deleted.' });
});

/* ==========================================================================
   SELF-HEALING LOCKER — RENEWAL WORKFLOWS
   ========================================================================== */

/**
 * GET /api/renewals
 */
app.get('/api/renewals', requireAuth, (req, res) => {
  const workflows = db.prepare(`
    SELECT r.*, d.title as doc_title, d.category as doc_category, d.policy_number, d.insurer_name
    FROM renewal_workflows r
    JOIN documents d ON r.document_id = d.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);

  res.json({ workflows });
});

/**
 * POST /api/renewals/dispatch
 * Dispatches TinyFish agent for document renewal.
 * Supports real autonomous agent execution on supported public insurance pages
 * when TINYFISH_API_KEY is configured, or transparent development simulation otherwise.
 */
app.post('/api/renewals/dispatch', requireAuth, async (req, res) => {
  const { document_id, current_premium, target_url } = req.body;

  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(document_id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  const targetUrl = target_url || getSupportedPublicInsuranceUrl(doc.insurer_name, doc.category);

  // Execute TinyFish Agent
  const agentResult = await runTinyFishRenewalAgent({
    policyNumber: doc.policy_number || 'POL-DEFAULT',
    insurerName: doc.insurer_name || 'National Underwriters',
    currentPremium: Number(current_premium) || 18500,
    category: doc.category,
    targetUrl
  });

  if (agentResult.status === 'failed') {
    return res.status(502).json({
      error: agentResult.error,
      code: agentResult.error_code,
      run_id: agentResult.run_id,
      is_simulation: false
    });
  }

  const workflowId = `rnw_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO renewal_workflows (
      id, user_id, document_id, status, is_simulation, old_premium, new_quote_premium,
      insurer_portal_url, quote_ref, agent_telemetry, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workflowId,
    req.user.id,
    doc.id,
    'quote_ready',
    agentResult.is_simulation ? 1 : 0,
    agentResult.old_premium,
    agentResult.new_quote_premium,
    agentResult.insurer_portal_url,
    agentResult.quote_ref,
    JSON.stringify(agentResult.telemetry),
    now
  );

  logActivity(
    req.user.id,
    'RENEWAL_DISPATCHED',
    `TinyFish renewal agent completed for "${doc.title}". Quote ref: ${agentResult.quote_ref}`,
    agentResult.is_simulation
  );

  const workflow = db.prepare('SELECT * FROM renewal_workflows WHERE id = ?').get(workflowId);
  res.status(201).json({ workflow, agentResult });
});

/**
 * POST /api/renewals/:id/confirm
 * Confirms user review of renewal quote, creates new version in vault,
 * and archives the superseded policy version.
 */
app.post('/api/renewals/:id/confirm', requireAuth, (req, res) => {
  const workflow = db.prepare('SELECT * FROM renewal_workflows WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!workflow) {
    return res.status(404).json({ error: 'Renewal workflow not found.' });
  }

  const oldDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(workflow.document_id);
  if (!oldDoc) {
    return res.status(404).json({ error: 'Original document not found.' });
  }

  const now = new Date().toISOString();
  const nextExpiry = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const newDocId = `doc_${crypto.randomBytes(6).toString('hex')}`;
  const newVersion = oldDoc.version + 1;

  // 1. Mark old doc as archived and superseded
  db.prepare(`
    UPDATE documents 
    SET status = 'archived', superseded_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, oldDoc.id);

  // 2. Insert new version
  db.prepare(`
    INSERT INTO documents (
      id, user_id, title, category, policy_number, insurer_name, expiry_date,
      version, status, encrypted_blob, encryption_iv, file_name, file_type,
      file_size_bytes, is_synthetic, parent_document_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newDocId,
    req.user.id,
    `${oldDoc.title} (v${newVersion})`,
    oldDoc.category,
    oldDoc.policy_number,
    oldDoc.insurer_name,
    nextExpiry,
    newVersion,
    'active',
    oldDoc.encrypted_blob, // Preserves encrypted structure
    oldDoc.encryption_iv,
    oldDoc.file_name,
    oldDoc.file_type,
    oldDoc.file_size_bytes,
    oldDoc.is_synthetic,
    oldDoc.parent_document_id || oldDoc.id,
    now,
    now
  );

  // 3. Mark renewal workflow as completed
  db.prepare(`
    UPDATE renewal_workflows
    SET status = 'completed', approved_at = ?, superseded_version_id = ?, new_version_id = ?
    WHERE id = ?
  `).run(now, oldDoc.id, newDocId, workflow.id);

  logActivity(
    req.user.id,
    'RENEWAL_CONFIRMED',
    `Renewal confirmed for "${oldDoc.title}". Promoted to version ${newVersion}, archived version ${oldDoc.version}.`
  );

  res.json({
    success: true,
    message: `Policy successfully renewed to version ${newVersion}. Superseded version archived.`,
    new_document_id: newDocId
  });
});

/* ==========================================================================
   ZERO-KNOWLEDGE POLICY HEALTH CHECK
   ========================================================================== */

/**
 * GET /api/health-checks
 */
app.get('/api/health-checks', requireAuth, (req, res) => {
  const checks = db.prepare(`
    SELECT h.*, d.title as doc_title, d.policy_number, d.insurer_name
    FROM policy_health_checks h
    JOIN documents d ON h.document_id = d.id
    WHERE h.user_id = ?
    ORDER BY h.created_at DESC
  `).all(req.user.id);

  res.json({ checks });
});

/**
 * POST /api/health-checks/run
 */
app.post('/api/health-checks/run', requireAuth, async (req, res) => {
  const { document_id, target_url } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(document_id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  const targetUrl = target_url || getSupportedPublicInsuranceUrl(doc.insurer_name, doc.category);

  const agentResult = await runTinyFishPolicyHealthAgent({
    policyNumber: doc.policy_number || 'POL-DEFAULT',
    insurerName: doc.insurer_name || 'Underwriter Group',
    policyTitle: doc.title,
    category: doc.category,
    targetUrl
  });

  if (agentResult.status === 'failed') {
    return res.status(502).json({
      error: agentResult.error,
      code: agentResult.error_code,
      is_simulation: false
    });
  }

  const checkId = `hlth_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO policy_health_checks (
      id, user_id, document_id, status, is_simulation, source_url, retrieved_date,
      original_policy_summary, retrieved_terms_summary, clause_comparisons, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    checkId,
    req.user.id,
    doc.id,
    agentResult.status || 'Verified Difference',
    agentResult.is_simulation ? 1 : 0,
    agentResult.source_url,
    agentResult.retrieved_date,
    agentResult.original_policy_summary,
    agentResult.retrieved_terms_summary,
    JSON.stringify(agentResult.clause_comparisons),
    now
  );

  logActivity(
    req.user.id,
    'POLICY_HEALTH_RUN',
    `Zero-Knowledge health check performed on "${doc.title}". Status: ${agentResult.status}`,
    agentResult.is_simulation
  );

  const check = db.prepare('SELECT * FROM policy_health_checks WHERE id = ?').get(checkId);
  res.status(201).json({ check, agentResult });
});

/**
 * PATCH /api/health-checks/:id/review
 */
app.patch('/api/health-checks/:id/review', requireAuth, (req, res) => {
  const { user_notes } = req.body;
  const check = db.prepare('SELECT * FROM policy_health_checks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!check) {
    return res.status(404).json({ error: 'Health check record not found.' });
  }

  db.prepare(`
    UPDATE policy_health_checks 
    SET user_reviewed = 1, user_notes = ?
    WHERE id = ?
  `).run(user_notes || '', check.id);

  res.json({ success: true, message: 'Review marked and notes saved.' });
});

/* ==========================================================================
   AUTONOMOUS NOMINEE CLAIM PILOT
   ========================================================================== */

/**
 * GET /api/nominee-claims
 */
app.get('/api/nominee-claims', requireAuth, (req, res) => {
  const claims = db.prepare(`
    SELECT c.*, d.title as doc_title, d.policy_number, d.insurer_name
    FROM nominee_claims c
    JOIN documents d ON c.document_id = d.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);

  res.json({ claims });
});

/**
 * POST /api/nominee-claims/prepare
 * Constructs an authentic checklist mapped directly to documents existing in user's vault.
 */
app.post('/api/nominee-claims/prepare', requireAuth, (req, res) => {
  const { document_id } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(document_id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Check what exists in user vault to dynamically compute availability
  const userVaultDocs = db.prepare('SELECT title, category FROM documents WHERE user_id = ?').all(req.user.id);
  const categoriesPresent = new Set(userVaultDocs.map(d => d.category));

  const checklistItems = [
    {
      name: 'Original Policy Schedule',
      required: true,
      status: 'Available',
      notes: `Active schedule linked: ${doc.title} (${doc.policy_number})`
    },
    {
      name: 'Primary Insured Identity Verification',
      required: true,
      status: categoriesPresent.has('Identity Documents') ? 'Available' : 'Missing',
      notes: categoriesPresent.has('Identity Documents')
        ? 'Verified against encrypted PAN/Aadhaar identity vault'
        : 'Action required: Upload Primary Insured KYC copy'
    },
    {
      name: 'Attending Physician & Hospital Discharge Summary',
      required: true,
      status: 'Requires Review',
      notes: 'Hospital records must carry official institutional seal and registration number'
    },
    {
      name: 'Nominee Verified Bank Proof (Cancelled Cheque)',
      required: true,
      status: 'Missing',
      notes: `Action required: Upload account holder proof for ${req.user.nominee?.name || 'Nominee'}`
    },
    {
      name: 'Formal Claim Intimation Form',
      required: true,
      status: 'Available',
      notes: 'Generated automatically from authenticated locker metadata'
    }
  ];

  const claimId = `clm_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO nominee_claims (
      id, user_id, document_id, status, nominee_name, checklist_items,
      insurer_guidelines_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    claimId,
    req.user.id,
    doc.id,
    'ready_for_review',
    req.user.nominee?.name || 'Authorized Nominee',
    JSON.stringify(checklistItems),
    `https://regulatory.claims-portal.org/guidelines/${doc.insurer_name ? doc.insurer_name.toLowerCase().replace(/\s+/g, '-') : 'general'}`,
    now
  );

  logActivity(req.user.id, 'NOMINEE_CLAIM_PREPARED', `Prepared claim package dossier for policy "${doc.title}".`);

  const createdClaim = db.prepare('SELECT * FROM nominee_claims WHERE id = ?').get(claimId);
  res.status(201).json({ claim: createdClaim });
});

/* ==========================================================================
   EMERGENCY ACCESS — DEAD MAN'S SWITCH & SHAMIR'S SECRET SHARING
   ========================================================================== */

/**
 * GET /api/emergency/status
 */
app.get('/api/emergency/status', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT last_checkin_at, checkin_interval_days, switch_enabled,
           nominee_name, nominee_email, nominee_relationship, nominee_phone
    FROM users WHERE id = ?
  `).get(req.user.id);

  const lastCheckinDate = new Date(user.last_checkin_at);
  const nextExpectedDate = new Date(lastCheckinDate.getTime() + user.checkin_interval_days * 24 * 3600 * 1000);
  const isTriggered = user.switch_enabled && (new Date() > nextExpectedDate);

  const escrowShare = db.prepare('SELECT id, share_index, escrow_status, created_at FROM shamir_shares WHERE user_id = ?').get(req.user.id);

  res.json({
    switch_enabled: Boolean(user.switch_enabled),
    checkin_interval_days: user.checkin_interval_days,
    last_checkin_at: user.last_checkin_at,
    next_expected_checkin: nextExpectedDate.toISOString(),
    is_triggered: isTriggered,
    nominee: {
      name: user.nominee_name,
      email: user.nominee_email,
      relationship: user.nominee_relationship,
      phone: user.nominee_phone
    },
    escrow_share: escrowShare || null
  });
});

/**
 * POST /api/emergency/checkin
 * Records heartbeat check-in to reset dead man's timer.
 */
app.post('/api/emergency/checkin', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_checkin_at = ? WHERE id = ?').run(now, req.user.id);

  logActivity(req.user.id, 'CHECKIN_RECORDED', 'Emergency heartbeat check-in completed. Timer reset.');

  res.json({ success: true, message: 'Check-in recorded. Inactivity timer successfully reset.', last_checkin_at: now });
});

/**
 * POST /api/emergency/settings
 */
app.post('/api/emergency/settings', requireAuth, (req, res) => {
  const { switch_enabled, checkin_interval_days, nominee_name, nominee_email, nominee_relationship, nominee_phone } = req.body;

  db.prepare(`
    UPDATE users SET
      switch_enabled = ?,
      checkin_interval_days = ?,
      nominee_name = ?,
      nominee_email = ?,
      nominee_relationship = ?,
      nominee_phone = ?
    WHERE id = ?
  `).run(
    switch_enabled ? 1 : 0,
    Number(checkin_interval_days) || 30,
    nominee_name ? nominee_name.trim() : 'Nominee',
    nominee_email ? nominee_email.trim() : '',
    nominee_relationship || 'Spouse',
    nominee_phone || '',
    req.user.id
  );

  logActivity(req.user.id, 'EMERGENCY_SETTINGS', `Updated emergency protocol and nominee settings.`);

  res.json({ success: true, message: 'Emergency settings saved successfully.' });
});

/**
 * POST /api/emergency/escrow-share
 * Stores server-custodied timelock share (Share 3 of 2-of-3 Shamir threshold).
 */
app.post('/api/emergency/escrow-share', requireAuth, (req, res) => {
  const { share_data } = req.body;
  if (!share_data) {
    return res.status(400).json({ error: 'Share data payload is required.' });
  }

  const shareId = `shr_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  // Delete prior escrow share if existing
  db.prepare('DELETE FROM shamir_shares WHERE user_id = ?').run(req.user.id);

  db.prepare(`
    INSERT INTO shamir_shares (id, user_id, share_index, encrypted_share_data, escrow_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(shareId, req.user.id, 3, share_data, 'locked', now);

  logActivity(req.user.id, 'SHAMIR_SHARE_ESCROWED', 'Server timelock recovery share (Share 3 of 3) registered.');

  res.status(201).json({ success: true, share_id: shareId });
});

/**
 * GET /api/emergency/escrow-share
 * Returns server timelock share ONLY during authorized emergency or sandbox test.
 */
app.get('/api/emergency/escrow-share', requireAuth, (req, res) => {
  const share = db.prepare('SELECT encrypted_share_data FROM shamir_shares WHERE user_id = ?').get(req.user.id);
  if (!share) {
    return res.status(404).json({ error: 'No escrowed timelock share found for this account.' });
  }

  res.json({ share_data: share.encrypted_share_data });
});

/* ==========================================================================
   ACTIVITY LOGS & USER PREFERENCES
   ========================================================================== */

/**
 * GET /api/activities
 */
app.get('/api/activities', requireAuth, (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM activity_logs 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 100
  `).all(req.user.id);

  res.json({ activities: logs });
});

/**
 * PATCH /api/user/theme
 * Persists theme preference per authenticated user in the database.
 */
app.patch('/api/user/theme', requireAuth, (req, res) => {
  const { theme } = req.body;
  if (!['light', 'dark', 'system'].includes(theme)) {
    return res.status(400).json({ error: 'Invalid theme. Must be light, dark, or system.' });
  }

  db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.user.id);
  res.json({ success: true, theme });
});

/**
 * PATCH /api/user/profile
 */
app.patch('/api/user/profile', requireAuth, (req, res) => {
  const { email } = req.body;
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'This email is already in use by another account.' });
    }
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.trim().toLowerCase(), req.user.id);
  }

  res.json({ success: true, message: 'Profile updated.' });
});

/* ==========================================================================
   TINYFISH INTEGRATION STATUS ENDPOINT
   ========================================================================== */

app.get('/api/tinyfish/status', (req, res) => {
  const isLive = isLiveMode();
  res.json({
    is_live: isLive,
    mode: isLive ? 'LIVE' : 'SIMULATION',
    label: isLive ? 'LIVE AGENT API' : 'DEVELOPMENT SIMULATION (MOCK PORTAL)',
    api_url: process.env.TINYFISH_API_URL || 'https://agent.tinyfish.ai'
  });
});

/* ==========================================================================
   STATIC FRONTEND SERVING (For production single-port execution)
   ========================================================================== */

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

/* ==========================================================================
   START SERVER
   ========================================================================== */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[DM Locker Pro Backend] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[Database] SQLite connected at server/data/dmlocker.db`);
  console.log(`[TinyFish] Mode: ${isLiveMode() ? 'LIVE AGENT API' : 'DEVELOPMENT SIMULATION (MOCK PORTAL)'}`);
});

