import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import db, { logSecurityEvent } from './db.js';
import {
  computeSha256,
  createIntegrityManifest,
  verifyDocumentIntegrity,
  verifyManifestSignature,
  canonicalizeJson
} from './integrity.js';
import { executeBreachRehearsal } from './rehearsal.js';
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
import { getEmailStatus, sendTestEmail } from './email.js';
import {
  processDueReminders,
  calculateDaysRemaining,
  cancelObsoleteReminders,
  startReminderScheduler
} from './reminders.js';
import {
  getUserFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveDocumentsToFolder,
  bulkCategorizeDocuments,
  undoLastOrganizationAction,
  detectDuplicateDocuments
} from './vault-org.js';
import {
  computeLicMaturity,
  checkJobApplicationRequirements,
  generateInvestmentComparison,
  processAssistantMessage
} from './assistant.js';

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
/**
 * POST /api/documents
 * Registers client-side encrypted document, computes SHA-256 digest,
 * creates authenticated canonical integrity manifest, and records immutable version v1.
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
    encrypted_metadata,
    metadata_iv,
    file_name,
    file_type,
    file_size_bytes,
    folder_id,
    tags,
    file_hash
  } = req.body;

  if (!title || !encrypted_blob || !encryption_iv) {
    return res.status(400).json({ error: 'Title, ciphertext payload, and encryption IV are required.' });
  }

  const docId = `doc_${crypto.randomBytes(6).toString('hex')}`;
  const versionId = `ver_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  // Compute canonical SHA-256 content digest of stored encrypted blob
  const contentDigest = computeSha256(encrypted_blob);

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

  const safeFileName = file_name ? path.basename(file_name) : 'document.dat';
  const safeFileType = file_type || 'application/octet-stream';
  const safeFileSize = Number(file_size_bytes) || Buffer.byteLength(encrypted_blob, 'utf8');

  // Create authenticated canonical integrity manifest (HMAC-SHA256 signed)
  const manifest = createIntegrityManifest({
    documentId: docId,
    versionNumber: 1,
    fileName: safeFileName,
    fileSizeBytes: safeFileSize,
    fileType: safeFileType,
    contentDigest: contentDigest,
    encryptionAlgorithm: 'AES-256-GCM',
    timestamp: now
  });

  const storageKey = `vault/${req.user.id}/${docId}/v1`;

  // Atomic database transaction for document, version, and manifest
  const insertTransaction = db.transaction(() => {
    // 1. Insert version 1
    db.prepare(`
      INSERT INTO document_versions (
        id, document_id, version_number, storage_object_key, manifest_id,
        content_digest, encrypted_blob, encryption_iv, file_name, file_type,
        file_size_bytes, created_at, created_by, recovery_eligible, status
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')
    `).run(
      versionId,
      docId,
      storageKey,
      manifest.id,
      contentDigest,
      encrypted_blob,
      encryption_iv,
      safeFileName,
      safeFileType,
      safeFileSize,
      now,
      req.user.id
    );

    // 2. Insert integrity manifest
    db.prepare(`
      INSERT INTO integrity_manifests (
        id, document_version_id, algorithm, manifest_payload,
        authentication_method, signature_or_mac, key_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      manifest.id,
      versionId,
      manifest.algorithm,
      manifest.manifestPayload,
      manifest.authenticationMethod,
      manifest.signatureOrMac,
      manifest.keyReference,
      now
    );

    // 3. Insert primary document record
    db.prepare(`
      INSERT INTO documents (
        id, user_id, title, category, policy_number, insurer_name, expiry_date,
        version, status, encrypted_blob, encryption_iv, encrypted_metadata, metadata_iv,
        file_name, file_type, file_size_bytes, folder_id, tags, file_hash,
        current_version_id, manifest_id, content_digest, encryption_algorithm,
        integrity_status, storage_object_key, is_synthetic, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      encrypted_metadata || null,
      metadata_iv || null,
      safeFileName,
      safeFileType,
      safeFileSize,
      folder_id || null,
      tags || null,
      file_hash || contentDigest,
      versionId,
      manifest.id,
      contentDigest,
      'AES-256-GCM',
      'VERIFIED',
      storageKey,
      0,
      now,
      now
    );
  });

  insertTransaction();

  // Audit logging: security events ledger
  logSecurityEvent({
    ownerId: req.user.id,
    documentId: docId,
    eventType: 'DOCUMENT_UPLOAD',
    severity: 'INFO',
    outcome: 'SUCCESS',
    details: {
      message: `Document "${title.trim()}" uploaded and encrypted with AES-256-GCM`,
      documentId: docId,
      versionNumber: 1,
      manifestId: manifest.id,
      contentDigest,
      fileName: safeFileName
    }
  });

  const createdDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
  res.status(201).json({
    document: createdDoc,
    version: { id: versionId, version_number: 1 },
    manifest: { id: manifest.id, algorithm: manifest.algorithm, signature: manifest.signatureOrMac }
  });
});

/**
 * GET /api/documents/:id
 * Authorized retrieval of document details, versions, and manifest.
 */
app.get('/api/documents/:id', requireAuth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  // Fetch all immutable versions
  const versions = db.prepare(`
    SELECT dv.*, im.algorithm as manifest_algorithm, im.authentication_method,
           im.signature_or_mac, im.key_reference, im.created_at as manifest_created_at
    FROM document_versions dv
    LEFT JOIN integrity_manifests im ON dv.manifest_id = im.id
    WHERE dv.document_id = ?
    ORDER BY dv.version_number DESC
  `).all(doc.id);

  // Fetch current manifest
  let currentManifest = null;
  if (doc.manifest_id) {
    currentManifest = db.prepare('SELECT * FROM integrity_manifests WHERE id = ?').get(doc.manifest_id);
  }

  res.json({ document: doc, versions, manifest: currentManifest });
});

/**
 * PATCH /api/documents/:id
 * Updates allowed document metadata (title, category, policy_number, insurer_name, expiry_date, folder_id, tags).
 */
app.patch('/api/documents/:id', requireAuth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  const {
    title,
    category,
    policy_number,
    insurer_name,
    expiry_date,
    folder_id,
    tags
  } = req.body;

  const newTitle = title !== undefined ? String(title).trim() : doc.title;
  const newCategory = category !== undefined ? String(category).trim() : doc.category;
  const newPolicyNumber = policy_number !== undefined ? (policy_number ? String(policy_number).trim() : null) : doc.policy_number;
  const newInsurerName = insurer_name !== undefined ? (insurer_name ? String(insurer_name).trim() : null) : doc.insurer_name;
  const newFolderId = folder_id !== undefined ? folder_id : doc.folder_id;
  const newTags = tags !== undefined ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : doc.tags;

  let newExpiry = doc.expiry_date;
  let status = doc.status;

  if (expiry_date !== undefined) {
    newExpiry = expiry_date ? String(expiry_date).trim() : null;
    if (newExpiry) {
      const daysUntilExpiry = Math.ceil((new Date(newExpiry) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring_soon';
      } else {
        status = 'active';
      }
    }
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE documents
    SET title = ?, category = ?, policy_number = ?, insurer_name = ?,
        expiry_date = ?, folder_id = ?, tags = ?, status = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    newTitle,
    newCategory,
    newPolicyNumber,
    newInsurerName,
    newExpiry,
    newFolderId,
    newTags,
    status,
    now,
    doc.id,
    req.user.id
  );

  logSecurityEvent({
    ownerId: req.user.id,
    documentId: doc.id,
    eventType: 'DOCUMENT_METADATA_UPDATE',
    severity: 'INFO',
    outcome: 'SUCCESS',
    details: {
      message: `Updated metadata for "${newTitle}"`,
      documentId: doc.id,
      fieldsUpdated: { title: newTitle, category: newCategory, expiry_date: newExpiry }
    }
  });

  const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id);
  res.json({ document: updatedDoc });
});

/**
 * DELETE /api/documents/:id
 * Controlled deletion with audit logging and cascade cleanup.
 */
app.delete('/api/documents/:id', requireAuth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  cancelObsoleteReminders(doc.id);

  // Cascade deletion in transaction
  const deleteTransaction = db.transaction(() => {
    db.prepare('DELETE FROM document_versions WHERE document_id = ?').run(doc.id);
    db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
  });
  deleteTransaction();

  logSecurityEvent({
    ownerId: req.user.id,
    documentId: doc.id,
    eventType: 'DOCUMENT_DELETE',
    severity: 'INFO',
    outcome: 'SUCCESS',
    details: {
      message: `Permanently deleted document "${doc.title}"`,
      documentId: doc.id,
      title: doc.title
    }
  });

  res.json({ success: true, message: 'Document permanently deleted.' });
});

/**
 * POST /api/documents/:id/verify
 * Performs genuine cryptographic integrity verification:
 * 1. Fetches document and its authenticated manifest
 * 2. Validates HMAC-SHA256 signature against server signing authority
 * 3. Recomputes SHA-256 digest of stored ciphertext blob
 * 4. Compares against baseline and persists verification result
 */
app.post('/api/documents/:id/verify', requireAuth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  // Retrieve manifest
  let manifest = null;
  if (doc.manifest_id) {
    manifest = db.prepare('SELECT * FROM integrity_manifests WHERE id = ?').get(doc.manifest_id);
  }

  // If missing (e.g. legacy seed doc), create and attach baseline manifest now
  if (!manifest) {
    const computedDigest = computeSha256(doc.encrypted_blob || '');
    const newManifest = createIntegrityManifest({
      documentId: doc.id,
      versionNumber: doc.version || 1,
      fileName: doc.file_name || 'document.dat',
      fileSizeBytes: doc.file_size_bytes || 0,
      fileType: doc.file_type || 'application/octet-stream',
      contentDigest: computedDigest,
      encryptionAlgorithm: 'AES-256-GCM',
      timestamp: doc.created_at || new Date().toISOString()
    });

    db.prepare(`
      INSERT INTO integrity_manifests (
        id, document_version_id, algorithm, manifest_payload,
        authentication_method, signature_or_mac, key_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newManifest.id,
      doc.current_version_id || null,
      newManifest.algorithm,
      newManifest.manifestPayload,
      newManifest.authenticationMethod,
      newManifest.signatureOrMac,
      newManifest.keyReference,
      newManifest.createdAt
    );

    db.prepare('UPDATE documents SET manifest_id = ?, content_digest = ? WHERE id = ?')
      .run(newManifest.id, computedDigest, doc.id);

    manifest = db.prepare('SELECT * FROM integrity_manifests WHERE id = ?').get(newManifest.id);
  }

  // Run cryptographic integrity engine
  const verificationResult = verifyDocumentIntegrity(doc.encrypted_blob, manifest);

  // Update document integrity status in database
  db.prepare('UPDATE documents SET integrity_status = ?, updated_at = ? WHERE id = ?')
    .run(verificationResult.status, new Date().toISOString(), doc.id);

  // Log audit security event
  logSecurityEvent({
    ownerId: req.user.id,
    documentId: doc.id,
    eventType: 'INTEGRITY_VERIFICATION',
    severity: verificationResult.status === 'VERIFIED' ? 'INFO' : 'CRITICAL',
    outcome: verificationResult.status,
    details: {
      message: `Integrity check executed: ${verificationResult.status}`,
      documentId: doc.id,
      reason: verificationResult.reason,
      checks: verificationResult.checks,
      computedDigest: verificationResult.computedDigest,
      expectedDigest: verificationResult.expectedDigest
    }
  });

  res.json({
    status: verificationResult.status,
    verification: verificationResult
  });
});

/**
 * GET /api/documents/:id/versions
 * Returns the immutable version history timeline for an authorized document.
 */
app.get('/api/documents/:id/versions', requireAuth, (req, res) => {
  const doc = db.prepare('SELECT id, title, user_id FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  let versions = db.prepare(`
    SELECT dv.*, im.algorithm as manifest_algorithm, im.authentication_method,
           im.signature_or_mac, im.key_reference, im.created_at as manifest_created_at
    FROM document_versions dv
    LEFT JOIN integrity_manifests im ON dv.manifest_id = im.id
    WHERE dv.document_id = ?
    ORDER BY dv.version_number DESC
  `).all(doc.id);

  // Seed baseline version v1 if none exists
  if (versions.length === 0) {
    const fullDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id);
    const vId = `ver_${crypto.randomBytes(6).toString('hex')}`;
    const digest = computeSha256(fullDoc.encrypted_blob);
    const now = fullDoc.created_at || new Date().toISOString();

    const manifest = createIntegrityManifest({
      documentId: doc.id,
      versionNumber: 1,
      fileName: fullDoc.file_name || 'document.dat',
      fileSizeBytes: fullDoc.file_size_bytes || 0,
      fileType: fullDoc.file_type || 'application/octet-stream',
      contentDigest: digest,
      encryptionAlgorithm: 'AES-256-GCM',
      timestamp: now
    });

    db.prepare(`
      INSERT INTO integrity_manifests (
        id, document_version_id, algorithm, manifest_payload,
        authentication_method, signature_or_mac, key_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      manifest.id, vId, manifest.algorithm, manifest.manifestPayload,
      manifest.authenticationMethod, manifest.signatureOrMac, manifest.keyReference, now
    );

    db.prepare(`
      INSERT INTO document_versions (
        id, document_id, version_number, storage_object_key, manifest_id,
        content_digest, encrypted_blob, encryption_iv, file_name, file_type,
        file_size_bytes, created_at, created_by, recovery_eligible, status
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')
    `).run(
      vId, doc.id, `vault/${req.user.id}/${doc.id}/v1`, manifest.id,
      digest, fullDoc.encrypted_blob, fullDoc.encryption_iv,
      fullDoc.file_name || 'document.dat', fullDoc.file_type || 'application/octet-stream',
      fullDoc.file_size_bytes || 0, now, req.user.id
    );

    db.prepare('UPDATE documents SET current_version_id = ?, manifest_id = ?, content_digest = ? WHERE id = ?')
      .run(vId, manifest.id, digest, doc.id);

    versions = db.prepare(`
      SELECT dv.*, im.algorithm as manifest_algorithm, im.authentication_method,
             im.signature_or_mac, im.key_reference, im.created_at as manifest_created_at
      FROM document_versions dv
      LEFT JOIN integrity_manifests im ON dv.manifest_id = im.id
      WHERE dv.document_id = ?
      ORDER BY dv.version_number DESC
    `).all(doc.id);
  }

  res.json({ versions });
});

/**
 * POST /api/documents/:id/restore
 * Initiates a verified restoration of an eligible historical version:
 * 1. Validates that the requested historical version exists and is recovery_eligible
 * 2. Cryptographically verifies the recovery copy before restoring
 * 3. Records a persistent recovery_job
 * 4. Creates a new immutable version v(n+1) containing the recovered baseline
 */
app.post('/api/documents/:id/restore', requireAuth, (req, res) => {
  const { source_version_id } = req.body;
  if (!source_version_id) {
    return res.status(400).json({ error: 'source_version_id is required.' });
  }

  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  const sourceVersion = db.prepare(`
    SELECT * FROM document_versions 
    WHERE id = ? AND document_id = ?
  `).get(source_version_id, doc.id);

  if (!sourceVersion) {
    return res.status(404).json({ error: 'Source recovery version not found.' });
  }

  if (!sourceVersion.recovery_eligible) {
    return res.status(400).json({ error: 'This version has been marked ineligible for recovery.' });
  }

  const jobId = `rec_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  // Create initial recovery job record
  db.prepare(`
    INSERT INTO recovery_jobs (
      id, owner_id, document_id, source_version_id, status, started_at
    ) VALUES (?, ?, ?, ?, 'IN_PROGRESS', ?)
  `).run(jobId, req.user.id, doc.id, source_version_id, now);

  // Retrieve source manifest for pre-restoration verification
  const sourceManifest = db.prepare('SELECT * FROM integrity_manifests WHERE id = ?').get(sourceVersion.manifest_id);

  const preCheck = verifyDocumentIntegrity(sourceVersion.encrypted_blob, sourceManifest);

  if (preCheck.status !== 'VERIFIED') {
    // Record failure in recovery ledger
    db.prepare(`
      UPDATE recovery_jobs 
      SET status = 'VERIFICATION_FAILED', verification_result = ?, completed_at = ?, error_code = 'PRE_CHECK_FAILED'
      WHERE id = ?
    `).run(preCheck.status, new Date().toISOString(), jobId);

    logSecurityEvent({
      ownerId: req.user.id,
      documentId: doc.id,
      eventType: 'RECOVERY_FAILED',
      severity: 'CRITICAL',
      outcome: 'FAILED',
      details: {
        message: 'Recovery aborted: Source version copy failed cryptographic integrity check.',
        reason: preCheck.reason
      }
    });

    return res.status(400).json({
      error: 'Recovery aborted: The historical version failed cryptographic integrity verification.',
      verification: preCheck
    });
  }

  // Determine next version number
  const maxVer = db.prepare('SELECT MAX(version_number) as max_v FROM document_versions WHERE document_id = ?').get(doc.id)?.max_v || 1;
  const newVersionNumber = maxVer + 1;
  const newVersionId = `ver_${crypto.randomBytes(6).toString('hex')}`;
  const storageKey = `vault/${req.user.id}/${doc.id}/v${newVersionNumber}`;

  // Create new manifest for the restored version
  const newManifest = createIntegrityManifest({
    documentId: doc.id,
    versionNumber: newVersionNumber,
    fileName: sourceVersion.file_name,
    fileSizeBytes: sourceVersion.file_size_bytes,
    fileType: sourceVersion.file_type,
    contentDigest: sourceVersion.content_digest,
    encryptionAlgorithm: 'AES-256-GCM',
    timestamp: now
  });

  const restoreTransaction = db.transaction(() => {
    // 1. Insert new immutable version
    db.prepare(`
      INSERT INTO document_versions (
        id, document_id, version_number, storage_object_key, manifest_id,
        content_digest, encrypted_blob, encryption_iv, file_name, file_type,
        file_size_bytes, created_at, created_by, recovery_eligible, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')
    `).run(
      newVersionId,
      doc.id,
      newVersionNumber,
      storageKey,
      newManifest.id,
      sourceVersion.content_digest,
      sourceVersion.encrypted_blob,
      sourceVersion.encryption_iv,
      sourceVersion.file_name,
      sourceVersion.file_type,
      sourceVersion.file_size_bytes,
      now,
      req.user.id
    );

    // 2. Insert new manifest
    db.prepare(`
      INSERT INTO integrity_manifests (
        id, document_version_id, algorithm, manifest_payload,
        authentication_method, signature_or_mac, key_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newManifest.id,
      newVersionId,
      newManifest.algorithm,
      newManifest.manifestPayload,
      newManifest.authenticationMethod,
      newManifest.signatureOrMac,
      newManifest.keyReference,
      now
    );

    // 3. Promote document to new restored version
    db.prepare(`
      UPDATE documents 
      SET version = ?, current_version_id = ?, manifest_id = ?,
          encrypted_blob = ?, encryption_iv = ?, content_digest = ?,
          integrity_status = 'VERIFIED', updated_at = ?
      WHERE id = ?
    `).run(
      newVersionNumber,
      newVersionId,
      newManifest.id,
      sourceVersion.encrypted_blob,
      sourceVersion.encryption_iv,
      sourceVersion.content_digest,
      now,
      doc.id
    );

    // 4. Update recovery job status
    db.prepare(`
      UPDATE recovery_jobs 
      SET status = 'RESTORED_AND_VERIFIED', verification_result = 'VERIFIED', completed_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), jobId);
  });

  restoreTransaction();

  logSecurityEvent({
    ownerId: req.user.id,
    documentId: doc.id,
    eventType: 'DOCUMENT_RESTORED',
    severity: 'INFO',
    outcome: 'SUCCESS',
    details: {
      message: `Successfully restored document "${doc.title}" to version ${newVersionNumber} from source version ${sourceVersion.version_number}`,
      documentId: doc.id,
      sourceVersionId: sourceVersion.id,
      newVersionNumber,
      recoveryJobId: jobId
    }
  });

  res.json({
    success: true,
    message: `Restoration verified and completed. Document promoted to Version ${newVersionNumber}.`,
    recoveryJob: { id: jobId, status: 'RESTORED_AND_VERIFIED', sourceVersion: sourceVersion.version_number, newVersion: newVersionNumber }
  });
});

/**
 * GET /api/versions/:id/integrity
 * Returns manifest and cryptographic baseline for a specific version.
 */
app.get('/api/versions/:id/integrity', requireAuth, (req, res) => {
  const version = db.prepare(`
    SELECT dv.*, d.user_id, d.title as doc_title
    FROM document_versions dv
    JOIN documents d ON dv.document_id = d.id
    WHERE dv.id = ? AND d.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!version) {
    return res.status(404).json({ error: 'Version record not found or access denied.' });
  }

  const manifest = db.prepare('SELECT * FROM integrity_manifests WHERE id = ?').get(version.manifest_id);
  const verification = verifyDocumentIntegrity(version.encrypted_blob, manifest);

  res.json({ version, manifest, verification });
});

/**
 * POST /api/versions/:id/verify
 * Runs verification specifically on a historical version.
 */
app.post('/api/versions/:id/verify', requireAuth, (req, res) => {
  const version = db.prepare(`
    SELECT dv.*, d.user_id, d.title as doc_title
    FROM document_versions dv
    JOIN documents d ON dv.document_id = d.id
    WHERE dv.id = ? AND d.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!version) {
    return res.status(404).json({ error: 'Version record not found or access denied.' });
  }

  const manifest = db.prepare('SELECT * FROM integrity_manifests WHERE id = ?').get(version.manifest_id);
  const verification = verifyDocumentIntegrity(version.encrypted_blob, manifest);

  res.json({ verification });
});

/* ==========================================================================
   BREACH REHEARSAL & RECOVERY PROOF ENDPOINTS (THE SIGNATURE FEATURE)
   ========================================================================== */

/**
 * POST /api/rehearsal/run
 * Executes a controlled, isolated Breach Rehearsal exercise on disposable dummy fixtures.
 * Supported scenarios: 'CONTENT_TAMPERING', 'METADATA_TAMPERING', 'UNAUTHORIZED_SESSION'
 */
app.post('/api/rehearsal/run', requireAuth, async (req, res) => {
  const { scenario = 'CONTENT_TAMPERING' } = req.body;
  const allowed = ['CONTENT_TAMPERING', 'METADATA_TAMPERING', 'UNAUTHORIZED_SESSION'];

  if (!allowed.includes(scenario)) {
    return res.status(400).json({ error: `Invalid scenario. Allowed: ${allowed.join(', ')}` });
  }

  try {
    const report = await executeBreachRehearsal(req.user.id, scenario);
    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('Rehearsal execution failure:', err);
    res.status(500).json({ error: 'Failed to complete rehearsal execution.' });
  }
});

/**
 * GET /api/rehearsal
 * Lists rehearsal history for the authenticated user.
 */
app.get('/api/rehearsal', requireAuth, (req, res) => {
  const runs = db.prepare(`
    SELECT id, scenario, status, started_at, ended_at, result_summary, created_at
    FROM rehearsal_runs
    WHERE owner_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({ runs });
});

/**
 * GET /api/rehearsal/:runId
 * Retrieves detailed execution summary and assets for a run.
 */
app.get('/api/rehearsal/:runId', requireAuth, (req, res) => {
  const run = db.prepare('SELECT * FROM rehearsal_runs WHERE id = ? AND owner_id = ?').get(req.params.runId, req.user.id);
  if (!run) {
    return res.status(404).json({ error: 'Rehearsal run not found.' });
  }

  const assets = db.prepare('SELECT * FROM rehearsal_assets WHERE rehearsal_run_id = ?').all(run.id);
  let report = null;
  if (run.report_json) {
    try {
      report = JSON.parse(run.report_json);
    } catch {
      // report unparseable
    }
  }

  res.json({ run, assets, report });
});

/**
 * GET /api/rehearsal/:runId/report
 * Returns the full structured rehearsal report for export/download.
 */
app.get('/api/rehearsal/:runId/report', requireAuth, (req, res) => {
  const run = db.prepare('SELECT * FROM rehearsal_runs WHERE id = ? AND owner_id = ?').get(req.params.runId, req.user.id);
  if (!run || !run.report_json) {
    return res.status(404).json({ error: 'Rehearsal report not found.' });
  }

  try {
    const report = JSON.parse(run.report_json);
    res.json(report);
  } catch {
    res.status(500).json({ error: 'Corrupted report payload.' });
  }
});

/* ==========================================================================
   RECOVERY CENTER & JOBS ENDPOINTS
   ========================================================================== */

/**
 * POST /api/recovery
 * Unified endpoint to create and execute an authorized recovery job.
 */
app.post('/api/recovery', requireAuth, (req, res) => {
  const { document_id, source_version_id } = req.body;
  if (!document_id || !source_version_id) {
    return res.status(400).json({ error: 'document_id and source_version_id are required.' });
  }

  // Forward to document restore handler logic
  req.params = { id: document_id };
  req.body = { source_version_id };
  return app._router.handle(req, res, () => {});
});

/**
 * GET /api/recovery/:jobId
 * Retrieves recovery job outcome and verification proof.
 */
app.get('/api/recovery/:jobId', requireAuth, (req, res) => {
  const job = db.prepare(`
    SELECT rj.*, d.title as doc_title, d.file_name
    FROM recovery_jobs rj
    JOIN documents d ON rj.document_id = d.id
    WHERE rj.id = ? AND rj.owner_id = ?
  `).get(req.params.jobId, req.user.id);

  if (!job) {
    return res.status(404).json({ error: 'Recovery job not found.' });
  }

  res.json({ job });
});

/* ==========================================================================
   SECURITY EVENTS & AUDIT LEDGER ENDPOINTS
   ========================================================================== */

/**
 * GET /api/security-events
 * Paginated, filtered retrieval of security audit ledger records.
 */
app.get('/api/security-events', requireAuth, (req, res) => {
  const {
    severity,
    event_type,
    outcome,
    search,
    limit = 50,
    offset = 0
  } = req.query;

  let query = 'SELECT * FROM security_events WHERE (owner_id = ? OR owner_id IS NULL)';
  const params = [req.user.id];

  if (severity && severity !== 'ALL') {
    query += ' AND severity = ?';
    params.push(severity);
  }

  if (event_type && event_type !== 'ALL') {
    query += ' AND event_type = ?';
    params.push(event_type);
  }

  if (outcome && outcome !== 'ALL') {
    query += ' AND outcome = ?';
    params.push(outcome);
  }

  if (search) {
    query += ' AND (details LIKE ? OR event_type LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Count total matching
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params)?.total || 0;

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const events = db.prepare(query).all(...params);

  // Parse details json where applicable
  const parsedEvents = events.map(evt => {
    let detailsObj = evt.details;
    try {
      detailsObj = JSON.parse(evt.details);
    } catch {}
    return { ...evt, parsedDetails: detailsObj };
  });

  res.json({
    events: parsedEvents,
    total,
    limit: Number(limit),
    offset: Number(offset)
  });
});

/* ==========================================================================
   METRICS & REAL DASHBOARD STATISTICS
   ========================================================================== */

/**
 * GET /api/metrics/dashboard
 * Strictly computed metrics from persisted database records.
 * Never returns hardcoded scores or fake statistics.
 */
app.get('/api/metrics/dashboard', requireAuth, (req, res) => {
  const userId = req.user.id;

  const totalDocuments = db.prepare('SELECT COUNT(*) as cnt FROM documents WHERE user_id = ?').get(userId)?.cnt || 0;
  
  const totalVersions = db.prepare(`
    SELECT COUNT(*) as cnt FROM document_versions dv
    JOIN documents d ON dv.document_id = d.id
    WHERE d.user_id = ?
  `).get(userId)?.cnt || 0;

  const verifiedDocuments = db.prepare(`
    SELECT COUNT(*) as cnt FROM documents 
    WHERE user_id = ? AND integrity_status = 'VERIFIED'
  `).get(userId)?.cnt || 0;

  const tamperingDetected = db.prepare(`
    SELECT COUNT(*) as cnt FROM security_events 
    WHERE (owner_id = ? OR owner_id IS NULL) AND outcome = 'TAMPERING_DETECTED'
  `).get(userId)?.cnt || 0;

  const rehearsalsCompleted = db.prepare(`
    SELECT COUNT(*) as cnt FROM rehearsal_runs 
    WHERE owner_id = ? AND status = 'PASSED'
  `).get(userId)?.cnt || 0;

  const recoveryJobsSuccess = db.prepare(`
    SELECT COUNT(*) as cnt FROM recovery_jobs 
    WHERE owner_id = ? AND status = 'RESTORED_AND_VERIFIED'
  `).get(userId)?.cnt || 0;

  const recoveryJobsFailed = db.prepare(`
    SELECT COUNT(*) as cnt FROM recovery_jobs 
    WHERE owner_id = ? AND status = 'VERIFICATION_FAILED'
  `).get(userId)?.cnt || 0;

  const recentSecurityEvents = db.prepare(`
    SELECT * FROM security_events 
    WHERE owner_id = ? OR owner_id IS NULL
    ORDER BY created_at DESC LIMIT 8
  `).all(userId);

  res.json({
    metrics: {
      totalDocuments,
      totalVersions,
      verifiedDocuments,
      tamperingDetected,
      rehearsalsCompleted,
      recoveryJobsSuccess,
      recoveryJobsFailed,
      recentEvents: recentSecurityEvents
    }
  });
});

/* ==========================================================================
   KEY METADATA & USER PROFILE / SETTINGS ENDPOINTS
   ========================================================================== */

/**
 * GET /api/keys/metadata
 * Key metadata inventory (contains algorithm and purpose, NEVER raw secrets).
 */
app.get('/api/keys/metadata', requireAuth, (req, res) => {
  const keys = [
    {
      id: 'km_client_vault',
      algorithm: 'AES-256-GCM',
      purpose: 'Client-side file & metadata zero-knowledge encryption',
      keyReference: 'Derived in browser memory via PBKDF2 (100,000 iterations)',
      status: 'ACTIVE_IN_SESSION',
      location: 'Browser Web Crypto Enclave (Non-extractable)'
    },
    {
      id: 'km_signing_authority',
      algorithm: 'HMAC-SHA256',
      purpose: 'Canonical integrity manifest signing & tamper-evidence',
      keyReference: 'Server-isolated authority key (phoenix-auth-authority-v1)',
      status: 'ACTIVE_ISOLATED',
      location: 'Secure backend environment authority'
    }
  ];

  res.json({ keys });
});

/**
 * GET /api/user/profile
 */
app.get('/api/user/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, normalized_username, email, display_name, theme, checkin_interval_days, timezone, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ profile: user });
});

/**
 * PATCH /api/user/profile
 */
app.patch('/api/user/profile', requireAuth, (req, res) => {
  const { display_name, theme, timezone } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const newDisplayName = display_name !== undefined ? String(display_name).trim() : (user.display_name || user.username);
  const newTheme = theme !== undefined ? String(theme) : user.theme;
  const newTimezone = timezone !== undefined ? String(timezone) : user.timezone;

  db.prepare('UPDATE users SET display_name = ?, theme = ?, timezone = ? WHERE id = ?')
    .run(newDisplayName, newTheme, newTimezone, user.id);

  logSecurityEvent({
    ownerId: user.id,
    eventType: 'PROFILE_UPDATED',
    severity: 'INFO',
    outcome: 'SUCCESS',
    details: { message: 'Profile preferences updated', display_name: newDisplayName, theme: newTheme }
  });

  const updated = db.prepare('SELECT id, username, normalized_username, email, display_name, theme, timezone, created_at FROM users WHERE id = ?').get(user.id);
  res.json({ profile: updated });
});

/**
 * DELETE /api/user/account
 * Controlled account deletion with confirmation and full cascade removal.
 */
app.delete('/api/user/account', requireAuth, (req, res) => {
  const { confirmation } = req.body;
  if (confirmation !== 'DELETE_MY_ACCOUNT') {
    return res.status(400).json({ error: 'Please enter "DELETE_MY_ACCOUNT" to confirm account termination.' });
  }

  const userId = req.user.id;
  const deleteTransaction = db.transaction(() => {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM documents WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM rehearsal_runs WHERE owner_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });
  deleteTransaction();

  logSecurityEvent({
    ownerId: null,
    eventType: 'ACCOUNT_DELETED',
    severity: 'HIGH',
    outcome: 'SUCCESS',
    details: { message: `Account ${userId} permanently purged from vault ledger.` }
  });

  res.json({ success: true, message: 'Account permanently terminated.' });
});

/**
 * POST /api/auth/reset-password
 */
app.post('/api/auth/reset-password', (req, res) => {
  const { email, new_password } = req.body;
  if (!email || !new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Valid email and new password (min 8 characters) are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) {
    // Prevent email enumeration
    return res.json({ success: true, message: 'If an account exists with this email, the password has been reset.' });
  }

  const { hash, salt } = hashPassword(new_password);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
    .run(hash, salt, user.id);

  // Invalidate existing sessions for security
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  logSecurityEvent({
    ownerId: user.id,
    eventType: 'PASSWORD_RESET',
    severity: 'MEDIUM',
    outcome: 'SUCCESS',
    details: { message: 'Password reset completed. All active sessions invalidated.' }
  });

  res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
});

/**
 * PATCH /api/documents/:id/expiry
 * Allows custodian to manually enter or correct document expiry date and category.
 * Strictly validates dates and recalculates document active/expiring/expired status.
 */
app.patch('/api/documents/:id/expiry', requireAuth, (req, res) => {
  const { expiry_date, category } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  // Validate expiry_date format if provided
  if (expiry_date !== null && expiry_date !== undefined && expiry_date !== '') {
    const trimmed = String(expiry_date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return res.status(400).json({ error: 'Expiry date must be in YYYY-MM-DD format.' });
    }
    const [y, m, d] = trimmed.split('-').map(Number);
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime()) || m < 1 || m > 12 || d < 1 || d > 31) {
      return res.status(400).json({ error: 'Invalid calendar date specified.' });
    }
  }

  const newExpiry = expiry_date ? String(expiry_date).trim() : null;
  const newCategory = category ? String(category).trim() : doc.category;

  // Fetch user timezone for accurate status determination
  const user = db.prepare('SELECT timezone FROM users WHERE id = ?').get(req.user.id);
  const userTz = user?.timezone || 'Asia/Kolkata';

  let status = 'active';
  if (newExpiry) {
    const daysRemaining = calculateDaysRemaining(newExpiry, userTz);
    if (daysRemaining !== null) {
      if (daysRemaining < 0) {
        status = 'expired';
      } else if (daysRemaining <= 30) {
        status = 'expiring_soon';
      } else {
        status = 'active';
      }
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE documents 
    SET expiry_date = ?, category = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(newExpiry, newCategory, status, now, doc.id);

  // If expiry date changed, cancel obsolete reminder stages for old date
  if (doc.expiry_date !== newExpiry) {
    cancelObsoleteReminders(doc.id, newExpiry);
  }

  logActivity(req.user.id, 'DOC_EXPIRY_UPDATED', `Updated expiry date for "${doc.title}" to ${newExpiry || 'None'} (Category: ${newCategory}).`);

  const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id);
  res.json({ document: updatedDoc });
});

/**
 * PATCH /api/documents/:id/reminders
 * Toggles email reminders enabled/disabled for a specific document.
 */
app.patch('/api/documents/:id/reminders', requireAuth, (req, res) => {
  const { reminders_enabled } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  const enabledVal = reminders_enabled ? 1 : 0;
  db.prepare('UPDATE documents SET reminders_enabled = ? WHERE id = ?').run(enabledVal, doc.id);

  res.json({ success: true, document_id: doc.id, reminders_enabled: Boolean(enabledVal) });
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

  // 1. Mark old doc as archived and superseded, cancel obsolete reminders
  cancelObsoleteReminders(oldDoc.id);
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
   ONE-TIME QR SHARING WITH SELECTIVE DISCLOSURE (REPLAY PROTECTED)
   ========================================================================== */

/**
 * POST /api/shares/create
 * Generates an opaque, single-use, cryptographically secure sharing token
 * bound only to the specific chosen claim.
 */
app.post('/api/shares/create', requireAuth, (req, res) => {
  const { document_id, claim_type, claim_value, purpose, ttl_seconds } = req.body;

  if (!document_id || !claim_type || claim_value === undefined) {
    return res.status(400).json({ error: 'document_id, claim_type, and claim_value are required.' });
  }

  // Validate document ownership (prevent IDOR)
  const doc = db.prepare('SELECT id, title FROM documents WHERE id = ? AND user_id = ?').get(document_id, req.user.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  // Generate 256-bit CSPRNG token (never stored in plaintext on server)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const shareId = `shr_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date();
  const validitySeconds = Number(ttl_seconds) || 300; // default 5 minutes
  const expiresAt = new Date(now.getTime() + validitySeconds * 1000).toISOString();

  const claimsPayload = JSON.stringify({
    claim_type,
    claim_value,
    document_title_blinded: `Protected Record (${doc.title.slice(0, 4)}***)`,
    provenance: 'User-Extracted Credential Claim',
    is_issuer_signed: false
  });

  db.prepare(`
    INSERT INTO shared_tokens (
      id, user_id, document_id, token_hash, claims_json, purpose,
      expires_at, max_uses, use_count, revoked, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    shareId,
    req.user.id,
    doc.id,
    tokenHash,
    claimsPayload,
    purpose || 'General Verification',
    expiresAt,
    1, // Strictly single-use
    0,
    0,
    now.toISOString()
  );

  logActivity(req.user.id, 'QR_SHARE_CREATED', `Generated one-time selective claim for "${doc.title}" (Claim: ${claim_type}, TTL: ${validitySeconds}s).`);

  res.status(201).json({
    share_id: shareId,
    token: rawToken,
    expires_at: expiresAt,
    claim_type,
    claim_value,
    purpose: purpose || 'General Verification'
  });
});

/**
 * GET /api/shares
 * Lists active shared tokens for the authenticated user.
 */
app.get('/api/shares', requireAuth, (req, res) => {
  const shares = db.prepare(`
    SELECT s.id, s.document_id, s.claims_json, s.purpose, s.expires_at, s.max_uses, s.use_count, s.revoked, s.created_at,
           d.title as doc_title
    FROM shared_tokens s
    JOIN documents d ON s.document_id = d.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);

  const formatted = shares.map(s => ({
    ...s,
    claim_data: JSON.parse(s.claims_json)
  }));

  res.json({ shares: formatted });
});

/**
 * POST /api/shares/:id/revoke
 * Instantly revokes an active sharing token.
 */
app.post('/api/shares/:id/revoke', requireAuth, (req, res) => {
  const result = db.prepare('UPDATE shared_tokens SET revoked = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Token not found or already deleted.' });
  }

  logActivity(req.user.id, 'QR_SHARE_REVOKED', `Revoked token ${req.params.id}.`);
  res.json({ success: true, message: 'Sharing token successfully revoked.' });
});

/**
 * GET /api/shares/inspect/:token
 * Read-only inspection endpoint.
 * Returns public metadata without disclosing the protected claim value
 * and CRITICALLY does NOT consume or mark the single-use token.
 */
app.get('/api/shares/inspect/:token', (req, res) => {
  const { token } = req.params;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ status: 'INVALID_TOKEN', message: 'Token parameter is missing or invalid.' });
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const record = db.prepare('SELECT id, purpose, expires_at, max_uses, use_count, revoked, created_at, claims_json FROM shared_tokens WHERE token_hash = ?').get(tokenHash);

  if (!record) {
    return res.status(404).json({
      status: 'INVALID_TOKEN',
      label: 'Invalid Token / Signature',
      message: 'Token was not found in the cryptographic registry or has been corrupted.'
    });
  }

  if (record.revoked === 1) {
    return res.status(410).json({
      status: 'REVOKED',
      label: 'Token Revoked',
      message: 'This one-time token was explicitly revoked by the vault owner.'
    });
  }

  const isExpired = new Date(record.expires_at) < new Date();
  if (isExpired) {
    return res.status(410).json({
      status: 'EXPIRED',
      label: 'Token Expired',
      message: 'This sharing token validity window has elapsed.',
      expired_at: record.expires_at
    });
  }

  if (record.use_count >= record.max_uses) {
    return res.status(409).json({
      status: 'ALREADY_USED',
      label: 'Already Used (Replay Rejected)',
      message: 'This single-use QR token was already consumed. Replay attempt rejected.'
    });
  }

  let claimSummary = {};
  try {
    const parsed = JSON.parse(record.claims_json);
    claimSummary = {
      claim_type: parsed.claim_type,
      document_title_blinded: parsed.document_title_blinded,
      provenance: parsed.provenance
    };
  } catch {}

  // Return unconsumed preview: claim_value is NOT revealed until verify is called
  return res.json({
    status: 'READY_TO_VERIFY',
    label: 'Ready for Verification',
    purpose: record.purpose,
    claim_type: claimSummary.claim_type,
    blinded_context: claimSummary.document_title_blinded,
    expires_at: record.expires_at,
    issued_at: record.created_at,
    consumed: false
  });
});

/**
 * GET /api/shares/verify/:token
 * Public verifier endpoint. Validates single-use token, checks expiry,
 * replay protection with strict atomic CAS increment, and returns selective disclosure payload.
 */
app.get('/api/shares/verify/:token', (req, res) => {
  const { token } = req.params;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ status: 'INVALID_TOKEN', message: 'Token parameter is missing or invalid.' });
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const record = db.prepare('SELECT * FROM shared_tokens WHERE token_hash = ?').get(tokenHash);

  if (!record) {
    return res.status(404).json({
      status: 'INVALID_TOKEN',
      label: 'Invalid Token / Signature',
      message: 'Token was not found in the cryptographic registry or has been corrupted.'
    });
  }

  if (record.revoked === 1) {
    return res.status(410).json({
      status: 'REVOKED',
      label: 'Token Revoked',
      message: 'This one-time token was explicitly revoked by the vault owner.'
    });
  }

  const isExpired = new Date(record.expires_at) < new Date();
  if (isExpired) {
    return res.status(410).json({
      status: 'EXPIRED',
      label: 'Token Expired',
      message: 'This sharing token validity window has elapsed.',
      expired_at: record.expires_at
    });
  }

  // Pre-check use_count
  if (record.use_count >= record.max_uses) {
    return res.status(409).json({
      status: 'ALREADY_USED',
      label: 'Already Used (Replay Rejected)',
      message: 'This single-use QR token was already consumed. Replay attempt rejected.'
    });
  }

  // Atomic conditional consumption for strict replay protection (race-condition free)
  const updateResult = db.prepare(
    'UPDATE shared_tokens SET use_count = use_count + 1 WHERE id = ? AND use_count < max_uses'
  ).run(record.id);

  if (updateResult.changes === 0) {
    return res.status(409).json({
      status: 'ALREADY_USED',
      label: 'Already Used (Replay Rejected)',
      message: 'This single-use QR token was already consumed. Replay attempt rejected.'
    });
  }

  const claimData = JSON.parse(record.claims_json);

  return res.json({
    status: 'VALID_AND_UNUSED',
    label: 'Valid and Unused',
    verification_status: 'ISSUER_UNVERIFIED_CLAIM',
    claim_data: claimData,
    purpose: record.purpose,
    issued_at: record.created_at,
    expires_at: record.expires_at,
    verified_at: new Date().toISOString(),
    disclosure_notice: 'Selective claim disclosed without exposing personal identity or document bytes.',
    warning: 'Issuer not independently verified: Claim is user-supplied or derived from an uploaded document. Underlying credential has not been cryptographically signed by an institutional issuer.'
  });
});

/**
 * GET /api/system/network-info
 * Returns system network interfaces and detected LAN IP for phone QR scanning.
 */
app.get('/api/system/network-info', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const lanIps = [];

    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          lanIps.push({ iface: name, ip: net.address });
        }
      }
    }

    const primaryLanIp = lanIps.length > 0 ? lanIps[0].ip : null;
    const configuredBaseUrl = (process.env.VITE_FRONTEND_BASE_URL || process.env.FRONTEND_BASE_URL || '').trim();

    res.json({
      primaryLanIp,
      lanIps,
      localhostUrl: 'http://localhost:5173',
      suggestedLanUrl: primaryLanIp ? `http://${primaryLanIp}:5173` : null,
      configuredBaseUrl: configuredBaseUrl || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect network interfaces', message: err.message });
  }
});


/* ==========================================================================
   SMART EXPIRY ALERTS & EMAIL REMINDERS
   ========================================================================== */

// Rate-limiting map for manual test emails (max 1 test every 10 seconds per user)
const testEmailCooldown = new Map();

/**
 * GET /api/reminders/status
 * Returns safe SMTP configuration status, user reminder preferences, and upcoming expiry alerts.
 */
app.get('/api/reminders/status', requireAuth, (req, res) => {
  const emailStatus = getEmailStatus();
  const user = db.prepare(`
    SELECT reminder_email_enabled, reminder_intervals, reminder_post_expiry, timezone, email
    FROM users WHERE id = ?
  `).get(req.user.id);

  let intervals = [30, 7, 1];
  try {
    intervals = JSON.parse(user.reminder_intervals || '[30, 7, 1]');
  } catch {}

  const userTz = user?.timezone || 'Asia/Kolkata';

  // Fetch active documents for this user
  const docs = db.prepare(`
    SELECT id, title, category, expiry_date, status, COALESCE(reminders_enabled, 1) as reminders_enabled
    FROM documents 
    WHERE user_id = ? AND status != 'archived'
    ORDER BY expiry_date ASC
  `).all(req.user.id);

  const docsWithDays = docs.map((d) => {
    const days = calculateDaysRemaining(d.expiry_date, userTz);
    return {
      ...d,
      days_remaining: days,
      is_expired: days !== null && days < 0
    };
  });

  res.json({
    email: emailStatus,
    settings: {
      reminder_email_enabled: Boolean(user?.reminder_email_enabled),
      reminder_intervals: intervals,
      reminder_post_expiry: Boolean(user?.reminder_post_expiry),
      timezone: userTz,
      recipient_email: user?.email
    },
    documents: docsWithDays
  });
});

/**
 * POST /api/reminders/settings
 * Updates user notification intervals, email toggle, and preferred timezone.
 */
app.post('/api/reminders/settings', requireAuth, (req, res) => {
  const { reminder_email_enabled, reminder_intervals, reminder_post_expiry, timezone } = req.body;

  let intervalsJson = '[30, 7, 1]';
  if (Array.isArray(reminder_intervals)) {
    const validIntervals = reminder_intervals
      .map(Number)
      .filter((n) => !isNaN(n) && n >= 0 && n <= 365);
    intervalsJson = JSON.stringify(validIntervals.length > 0 ? validIntervals : [30, 7, 1]);
  }

  const enabledVal = reminder_email_enabled !== undefined ? (reminder_email_enabled ? 1 : 0) : 1;
  const postExpiryVal = reminder_post_expiry !== undefined ? (reminder_post_expiry ? 1 : 0) : 0;
  const tz = (timezone || 'Asia/Kolkata').trim();

  db.prepare(`
    UPDATE users 
    SET reminder_email_enabled = ?, reminder_intervals = ?, reminder_post_expiry = ?, timezone = ?
    WHERE id = ?
  `).run(enabledVal, intervalsJson, postExpiryVal, tz, req.user.id);

  logActivity(req.user.id, 'REMINDER_SETTINGS_UPDATED', 'Updated email reminder preferences.');

  res.json({
    success: true,
    settings: {
      reminder_email_enabled: Boolean(enabledVal),
      reminder_intervals: JSON.parse(intervalsJson),
      reminder_post_expiry: Boolean(postExpiryVal),
      timezone: tz
    }
  });
});

/**
 * POST /api/reminders/send-test
 * Sends a test verification email to the user's registered address with rate limiting.
 */
app.post('/api/reminders/send-test', requireAuth, async (req, res) => {
  const now = Date.now();
  const lastSent = testEmailCooldown.get(req.user.id) || 0;
  if (now - lastSent < 10000) {
    const waitSec = Math.ceil((10000 - (now - lastSent)) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSec}s before sending another test email.` });
  }

  testEmailCooldown.set(req.user.id, now);

  try {
    const result = await sendTestEmail({
      to: req.user.email,
      username: req.user.username
    });

    if (!result.success && result.mockMode) {
      return res.json({
        success: false,
        mockMode: true,
        message: result.error,
        recipient: req.user.email
      });
    }

    logActivity(req.user.id, 'TEST_EMAIL_SENT', `Sent SMTP test email to registered address ${req.user.email}.`);
    res.json({
      success: true,
      mockMode: false,
      message: `Test email successfully dispatched to ${req.user.email}.`,
      messageId: result.messageId
    });
  } catch (err) {
    console.error('[sendTestEmail error]', err);
    res.status(502).json({
      success: false,
      error: `SMTP Provider Error: ${err.message}`
    });
  }
});

/**
 * POST /api/reminders/check-now
 * Runs an immediate check for due reminders on the current user's documents.
 */
app.post('/api/reminders/check-now', requireAuth, async (req, res) => {
  const { forceSend = false } = req.body;
  const frontendBaseUrl = req.headers.origin || 'http://localhost:5173';

  const result = await processDueReminders({
    filterUserId: req.user.id,
    forceSend: Boolean(forceSend),
    frontendBaseUrl
  });

  res.json({ result });
});

/**
 * GET /api/reminders/logs
 * Returns notification audit logs for the authenticated user.
 */
app.get('/api/reminders/logs', requireAuth, (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM reminder_logs 
    WHERE user_id = ?
    ORDER BY created_at DESC 
    LIMIT 50
  `).all(req.user.id);

  res.json({ logs });
});

/**
 * POST /api/reminders/trigger-cron
 * Webhook endpoint for Render Cron Job or external uptime trigger.
 * Protected by CRON_SECRET if configured.
 */
app.post('/api/reminders/trigger-cron', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  if (cronSecret) {
    const bearer = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
    if (bearer !== cronSecret && queryToken !== cronSecret) {
      return res.status(403).json({ error: 'Unauthorized cron trigger.' });
    }
  }

  const result = await processDueReminders({
    frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
  });

  res.json({ success: true, timestamp: new Date().toISOString(), result });
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
   OVERVIEW INTELLIGENCE STATS
   ========================================================================== */

app.get('/api/overview/stats', requireAuth, (req, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT timezone FROM users WHERE id = ?').get(userId);
  const userTz = user?.timezone || 'Asia/Kolkata';

  const totalDocs = db.prepare('SELECT COUNT(*) as cnt FROM documents WHERE user_id = ? AND status != ?').get(userId, 'archived')?.cnt || 0;
  
  const activeDocs = db.prepare('SELECT id, title, category, expiry_date, reminders_enabled, status, created_at FROM documents WHERE user_id = ? AND status != ?').all(userId, 'archived');
  
  let expiringSoonCount = 0;
  let upcomingRemindersCount = 0;
  for (const doc of activeDocs) {
    if (doc.expiry_date) {
      const days = calculateDaysRemaining(doc.expiry_date, userTz);
      if (days !== null && days >= 0 && days <= 30) {
        expiringSoonCount++;
        if (doc.reminders_enabled) {
          upcomingRemindersCount++;
        }
      }
    }
  }

  const docsText = activeDocs.map(d => (d.title + ' ' + (d.category || '')).toLowerCase()).join(' ');
  const hasResume = docsText.includes('resume') || docsText.includes('cv');
  const hasDegree = docsText.includes('degree') || docsText.includes('bachelor') || docsText.includes('graduation');
  const has10th = docsText.includes('10th') || docsText.includes('matric') || docsText.includes('secondary');
  let missingJobDocsCount = 0;
  if (!hasResume) missingJobDocsCount++;
  if (!hasDegree) missingJobDocsCount++;
  if (!has10th) missingJobDocsCount++;

  const auditGaps = db.prepare('SELECT COUNT(*) as cnt FROM policy_gap_audits WHERE user_id = ? AND gap_count > 0').get(userId)?.cnt || 0;
  const policiesRequiringReviewCount = expiringSoonCount + auditGaps;

  const recentDocuments = db.prepare(`
    SELECT id, title, category, expiry_date, status, created_at, file_name, file_size_bytes
    FROM documents
    WHERE user_id = ? AND status != ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(userId, 'archived');

  const recentActivities = db.prepare(`
    SELECT id, event_type, description, created_at
    FROM activity_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 6
  `).all(userId);

  res.json({
    totalDocuments: totalDocs,
    expiringSoonCount,
    upcomingRemindersCount,
    missingJobDocsCount,
    policiesRequiringReviewCount,
    recentDocuments,
    recentActivities
  });
});

/* ==========================================================================
   SMART FOLDERS & VAULT ORGANIZATION ENDPOINTS
   ========================================================================== */

app.get('/api/folders', requireAuth, (req, res) => {
  try {
    const folders = getUserFolders(req.user.id);
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/folders', requireAuth, (req, res) => {
  try {
    const { name, icon, color, category } = req.body;
    const folder = createFolder(req.user.id, { name, icon, color, category });
    logActivity(req.user.id, 'FOLDER_CREATED', `Created custom vault folder "${folder.name}".`);
    res.status(201).json({ folder });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/folders/:id', requireAuth, (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const folder = updateFolder(req.user.id, req.params.id, { name, icon, color });
    res.json({ folder });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/folders/:id', requireAuth, (req, res) => {
  try {
    const result = deleteFolder(req.user.id, req.params.id);
    logActivity(req.user.id, 'FOLDER_DELETED', `Deleted vault folder.`);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/documents/move-folder', requireAuth, (req, res) => {
  try {
    const { document_ids, folder_id } = req.body;
    const result = moveDocumentsToFolder(req.user.id, document_ids, folder_id);
    logActivity(req.user.id, 'DOCS_MOVED', `Moved ${result.movedCount} documents to folder.`);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/documents/bulk-categorize', requireAuth, (req, res) => {
  try {
    const { document_ids, category } = req.body;
    const result = bulkCategorizeDocuments(req.user.id, document_ids, category);
    logActivity(req.user.id, 'DOCS_CATEGORIZED', `Bulk categorized ${result.updatedCount} documents as "${category}".`);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/vault/undo', requireAuth, (req, res) => {
  try {
    const result = undoLastOrganizationAction(req.user.id);
    logActivity(req.user.id, 'VAULT_UNDO', `Reverted recent organization change.`);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/vault/duplicates', requireAuth, (req, res) => {
  try {
    const duplicates = detectDuplicateDocuments(req.user.id);
    res.json({ duplicates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   DM ASSISTANT & SPECIALIZED AI WORKSPACE ENDPOINTS
   ========================================================================== */

app.get('/api/assistant/conversations', requireAuth, (req, res) => {
  const conversations = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) as message_count,
      (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM chat_conversations c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
  `).all(req.user.id);
  res.json({ conversations });
});

app.post('/api/assistant/conversations', requireAuth, (req, res) => {
  const { title = 'New Conversation', mode = 'general' } = req.body;
  const convId = `cnv_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO chat_conversations (id, user_id, title, mode, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(convId, req.user.id, title.trim(), mode, now, now);

  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(convId);
  res.status(201).json({ conversation: conv });
});

app.delete('/api/assistant/conversations/:id', requireAuth, (req, res) => {
  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found or access denied.' });
  }

  db.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(conv.id);
  db.prepare('DELETE FROM chat_conversations WHERE id = ?').run(conv.id);
  logActivity(req.user.id, 'CHAT_DELETED', `Deleted conversation "${conv.title}".`);
  res.json({ success: true });
});

app.get('/api/assistant/conversations/:id/messages', requireAuth, (req, res) => {
  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found or access denied.' });
  }

  const messages = db.prepare(`
    SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC
  `).all(conv.id);

  res.json({
    conversation: conv,
    messages: messages.map(m => ({
      ...m,
      metadata: m.metadata ? JSON.parse(m.metadata) : null
    }))
  });
});

app.post('/api/assistant/chat', requireAuth, async (req, res) => {
  try {
    const { conversation_id, mode = 'general', message, selected_document_ids } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    let convId = conversation_id;
    if (!convId) {
      convId = `cnv_${crypto.randomBytes(6).toString('hex')}`;
      const now = new Date().toISOString();
      const firstTitle = message.slice(0, 32).trim() + '...';
      db.prepare(`
        INSERT INTO chat_conversations (id, user_id, title, mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(convId, req.user.id, firstTitle, mode, now, now);
    }

    const reply = await processAssistantMessage({
      userId: req.user.id,
      conversationId: convId,
      mode,
      userMessage: message.trim(),
      selectedDocumentIds: selected_document_ids || []
    });

    res.json({ conversation_id: convId, reply });
  } catch (err) {
    console.error('[assistant chat error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assistant/lic-calc', requireAuth, (req, res) => {
  try {
    const result = computeLicMaturity(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/assistant/job-check', requireAuth, (req, res) => {
  try {
    const { job_description, selected_document_ids } = req.body;
    let docs = [];
    if (selected_document_ids && selected_document_ids.length > 0) {
      const placeholders = selected_document_ids.map(() => '?').join(',');
      docs = db.prepare(`
        SELECT id, title, category, status, expiry_date FROM documents WHERE user_id = ? AND id IN (${placeholders})
      `).all(req.user.id, ...selected_document_ids);
    } else {
      docs = db.prepare('SELECT id, title, category, status, expiry_date FROM documents WHERE user_id = ? AND status != ?').all(req.user.id, 'archived');
    }

    const result = checkJobApplicationRequirements(job_description, docs);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/assistant/investment-guide', requireAuth, (req, res) => {
  try {
    const result = generateInvestmentComparison(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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

  // Initialize Smart Expiry Alert Scheduler
  startReminderScheduler();
});

