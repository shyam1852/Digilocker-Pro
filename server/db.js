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
`);

export default db;
