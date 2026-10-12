import crypto from 'crypto';
import db from './db.js';
import { hashPassword, normalizeUsername } from './auth.js';

export function seedDemoData() {
  const existingUser = db.prepare('SELECT id FROM users WHERE normalized_username = ?').get('shyamkeshri');
  
  if (existingUser) {
    return existingUser.id;
  }

  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const rawUsername = 'shyamkeshri';
  const normalized = normalizeUsername(rawUsername);
  const email = 'shyam.keshri@dmlocker.internal';
  const { hash, salt } = hashPassword('Password123!');
  const vaultSalt = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  // Insert base user
  db.prepare(`
    INSERT INTO users (
      id, username, normalized_username, email, password_hash, password_salt, 
      vault_salt, theme, checkin_interval_days, last_checkin_at, switch_enabled,
      nominee_name, nominee_email, nominee_relationship, nominee_phone, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    rawUsername,
    normalized,
    email,
    hash,
    salt,
    vaultSalt,
    'system',
    30,
    now,
    1,
    'Priya Keshri',
    'priya.keshri@example.com',
    'Spouse',
    '+91 98765 43210',
    now
  );

  // Seed sample synthetic encrypted documents (Synthetic fixtures clearly flagged)
  const sampleDocs = [
    {
      id: `doc_${crypto.randomBytes(6).toString('hex')}`,
      title: 'Star Health Comprehensive Care Policy',
      category: 'Health Insurance',
      policy_number: 'SH-2024-998241',
      insurer_name: 'Star Health & Allied Insurance',
      expiry_date: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString().split('T')[0], // expiring in 18 days
      version: 1,
      status: 'expiring_soon',
      encrypted_blob: Buffer.from('SYNTHETIC_CIPHERTEXT:STAR_HEALTH_POLICY_SCHEDULE_2024_COVERAGE_15LAKHS').toString('base64'),
      encryption_iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      file_name: 'Star_Health_Schedule_2024.pdf',
      file_type: 'application/pdf',
      file_size_bytes: 421800,
      is_synthetic: 1
    },
    {
      id: `doc_${crypto.randomBytes(6).toString('hex')}`,
      title: 'HDFC Life Click 2 Protect Life Cover',
      category: 'Life Insurance',
      policy_number: 'HDFC-LIFE-4418092',
      insurer_name: 'HDFC Life Insurance Co.',
      expiry_date: new Date(Date.now() + 320 * 24 * 3600 * 1000).toISOString().split('T')[0],
      version: 1,
      status: 'active',
      encrypted_blob: Buffer.from('SYNTHETIC_CIPHERTEXT:HDFC_LIFE_CLICK2PROTECT_SUM_ASSURED_1CR').toString('base64'),
      encryption_iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      file_name: 'HDFC_Term_Policy_Document.pdf',
      file_type: 'application/pdf',
      file_size_bytes: 852100,
      is_synthetic: 1
    },
    {
      id: `doc_${crypto.randomBytes(6).toString('hex')}`,
      title: 'ICICI Lombard Comprehensive Motor Vehicle Cover',
      category: 'Vehicle Insurance',
      policy_number: 'IL-MOT-8823100',
      insurer_name: 'ICICI Lombard General Insurance',
      expiry_date: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString().split('T')[0], // expiring in 8 days
      version: 2,
      status: 'expiring_soon',
      encrypted_blob: Buffer.from('SYNTHETIC_CIPHERTEXT:ICICI_MOTOR_POLICY_HONDA_CITY_ZERO_DEP').toString('base64'),
      encryption_iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      file_name: 'Motor_Policy_2025_Renewed.pdf',
      file_type: 'application/pdf',
      file_size_bytes: 312000,
      is_synthetic: 1
    },
    {
      id: `doc_${crypto.randomBytes(6).toString('hex')}`,
      title: 'Government Identity & PAN Card Archive',
      category: 'Identity Documents',
      policy_number: 'ID-PAN-90214',
      insurer_name: 'Government of India',
      expiry_date: '2035-12-31',
      version: 1,
      status: 'active',
      encrypted_blob: Buffer.from('SYNTHETIC_CIPHERTEXT:PRIMARY_IDENTITY_PAN_VERIFIED').toString('base64'),
      encryption_iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
      file_name: 'PAN_Card_Encrypted_Copy.pdf',
      file_type: 'application/pdf',
      file_size_bytes: 184500,
      is_synthetic: 1
    }
  ];

  const insertDoc = db.prepare(`
    INSERT INTO documents (
      id, user_id, title, category, policy_number, insurer_name, expiry_date,
      version, status, encrypted_blob, encryption_iv, file_name, file_type,
      file_size_bytes, is_synthetic, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const doc of sampleDocs) {
    insertDoc.run(
      doc.id,
      userId,
      doc.title,
      doc.category,
      doc.policy_number,
      doc.insurer_name,
      doc.expiry_date,
      doc.version,
      doc.status,
      doc.encrypted_blob,
      doc.encryption_iv,
      doc.file_name,
      doc.file_type,
      doc.file_size_bytes,
      doc.is_synthetic,
      now,
      now
    );
  }

  // Seed initial audit log entry
  db.prepare(`
    INSERT INTO activity_logs (
      id, user_id, event_type, description, is_simulation, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `act_${crypto.randomBytes(6).toString('hex')}`,
    userId,
    'AUTH_SIGNUP',
    'Account registered and primary AES-256 vault initialized.',
    1,
    '127.0.0.1',
    now
  );

  console.log(`[Seed] Demo user "shyamkeshri" and 4 synthetic documents created successfully.`);
  return userId;
}
