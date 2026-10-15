import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dmlocker.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    normalized_username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    vault_salt TEXT NOT NULL,
    theme TEXT DEFAULT 'system',
    checkin_interval_days INTEGER DEFAULT 30,
    last_checkin_at TEXT NOT NULL,
    switch_enabled INTEGER DEFAULT 1,
    nominee_name TEXT DEFAULT 'Priya Keshri',
    nominee_email TEXT DEFAULT 'priya.k@example.com',
    nominee_relationship TEXT DEFAULT 'Spouse',
    nominee_phone TEXT DEFAULT '+91 98765 43210',
    created_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_normalized_username ON users(normalized_username);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    policy_number TEXT,
    insurer_name TEXT,
    expiry_date TEXT,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    encrypted_blob TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    is_synthetic INTEGER DEFAULT 0,
    parent_document_id TEXT,
    superseded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS renewal_workflows (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL,
    is_simulation INTEGER DEFAULT 1,
    old_premium REAL,
    new_quote_premium REAL,
    insurer_portal_url TEXT,
    quote_ref TEXT,
    agent_telemetry TEXT,
    approved_at TEXT,
    superseded_version_id TEXT,
    new_version_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS policy_health_checks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL,
    is_simulation INTEGER DEFAULT 1,
    source_url TEXT,
    retrieved_date TEXT,
    original_policy_summary TEXT,
    retrieved_terms_summary TEXT,
    clause_comparisons TEXT,
    user_reviewed INTEGER DEFAULT 0,
    user_notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS nominee_claims (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL,
    nominee_name TEXT NOT NULL,
    checklist_items TEXT,
    insurer_guidelines_url TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shamir_shares (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    share_index INTEGER NOT NULL,
    encrypted_share_data TEXT NOT NULL,
    escrow_status TEXT DEFAULT 'locked',
    timelock_unlock_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    is_simulation INTEGER DEFAULT 0,
    ip_address TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shared_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    claims_json TEXT NOT NULL,
    purpose TEXT,
    expires_at TEXT NOT NULL,
    max_uses INTEGER DEFAULT 1,
    use_count INTEGER DEFAULT 0,
    revoked INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_shared_tokens_hash ON shared_tokens(token_hash);

  CREATE TABLE IF NOT EXISTS policy_gap_audits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    policy_category TEXT NOT NULL,
    encrypted_audit_blob TEXT NOT NULL,
    audit_iv TEXT NOT NULL,
    findings_summary TEXT NOT NULL,
    gap_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reminder_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    document_title TEXT NOT NULL,
    document_category TEXT,
    expiry_date TEXT NOT NULL,
    interval_days INTEGER NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL,
    message_id TEXT,
    error_message TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_dedup 
  ON reminder_logs (document_id, expiry_date, interval_days) 
  WHERE status = 'SENT';

  CREATE INDEX IF NOT EXISTS idx_reminder_logs_user ON reminder_logs (user_id);
  CREATE INDEX IF NOT EXISTS idx_reminder_logs_doc ON reminder_logs (document_id);

  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Folder',
    color TEXT DEFAULT 'default',
    category TEXT,
    is_system INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_folders_user ON folders (user_id);

  CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'general',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations (user_id);

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages (conversation_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id);

  CREATE TABLE IF NOT EXISTS organization_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_org_history_user ON organization_history (user_id);
`);

// Safe non-destructive column migrations
function safeAddColumn(table, column, typeDef) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`).run();
  } catch {
    // Column already exists or table locked - safe to continue
  }
}

safeAddColumn('documents', 'encrypted_metadata', 'TEXT');
safeAddColumn('documents', 'metadata_iv', 'TEXT');
safeAddColumn('documents', 'reminders_enabled', 'INTEGER DEFAULT 1');
safeAddColumn('documents', 'folder_id', 'TEXT');
safeAddColumn('documents', 'tags', "TEXT DEFAULT '[]'");
safeAddColumn('documents', 'file_hash', 'TEXT');

safeAddColumn('users', 'reminder_email_enabled', 'INTEGER DEFAULT 1');
safeAddColumn('users', 'reminder_intervals', "TEXT DEFAULT '[30, 7, 1]'");
safeAddColumn('users', 'reminder_post_expiry', 'INTEGER DEFAULT 0');
safeAddColumn('users', 'timezone', "TEXT DEFAULT 'Asia/Kolkata'");

export const DEFAULT_SYSTEM_FOLDERS = [
  { name: 'Identity & Personal', category: 'Identity & Government ID', icon: 'UserCheck', color: '#3b82f6' },
  { name: 'Healthcare', category: 'Health & Medical', icon: 'HeartPulse', color: '#10b981' },
  { name: 'Education & Certificates', category: 'Education & Academics', icon: 'GraduationCap', color: '#8b5cf6' },
  { name: 'Career & Employment', category: 'Career & Employment', icon: 'Briefcase', color: '#6366f1' },
  { name: 'Life Insurance & LIC', category: 'Life Insurance', icon: 'ShieldCheck', color: '#f59e0b' },
  { name: 'Health Insurance', category: 'Health Insurance', icon: 'Activity', color: '#06b6d4' },
  { name: 'Vehicle & Driving', category: 'Vehicle Insurance', icon: 'Car', color: '#ec4899' },
  { name: 'Banking & Finance', category: 'Financial Documents', icon: 'Landmark', color: '#14b8a6' },
  { name: 'Tax & Government', category: 'Tax Documents', icon: 'Receipt', color: '#f97316' },
  { name: 'Property & Legal', category: 'Legal & Property', icon: 'FileText', color: '#64748b' },
  { name: 'Family & Nominee', category: 'Family Records', icon: 'Users', color: '#a855f7' },
  { name: 'Other / Unclassified', category: 'Other Records', icon: 'Folder', color: '#94a3b8' }
];

export function ensureUserDefaultFolders(userId) {
  if (!userId) return;
  const count = db.prepare('SELECT COUNT(*) as cnt FROM folders WHERE user_id = ?').get(userId)?.cnt || 0;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO folders (id, user_id, name, icon, color, category, is_system, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const now = new Date().toISOString();
    const insertMany = db.transaction((folders) => {
      for (const f of folders) {
        insert.run(
          `fld_${Math.random().toString(36).substring(2, 10)}`,
          userId,
          f.name,
          f.icon,
          f.color,
          f.category,
          now
        );
      }
    });
    insertMany(DEFAULT_SYSTEM_FOLDERS);
  }
}

export default db;

