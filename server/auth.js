import crypto from 'crypto';
import db from './db.js';

/**
 * Normalizes username: trims outer whitespace and converts to lowercase.
 * This ensures "Shyam", "shyam", and " SHYAM " collide deterministically.
 */
export function normalizeUsername(rawUsername) {
  if (typeof rawUsername !== 'string') return '';
  return rawUsername.trim().toLowerCase();
}

/**
 * Validates display username format.
 * Allowed: 3-30 characters, alphanumeric, underscores, hyphens.
 */
export function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  const trimmed = username.trim();
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(trimmed);
}

/**
 * Validates email format.
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Hashes password using scrypt with salt.
 */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Verifies a candidate password against stored hash and salt.
 */
export function verifyPassword(password, hash, salt) {
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

/**
 * Generates a cryptographically random session token (32 bytes hex).
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Authentication middleware for Express.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice(7).trim();
  const session = db.prepare(`
    SELECT s.token, s.user_id, s.expires_at, u.id, u.username, u.normalized_username, 
           u.email, u.vault_salt, u.theme, u.checkin_interval_days, u.last_checkin_at,
           u.switch_enabled, u.nominee_name, u.nominee_email, u.nominee_relationship, u.nominee_phone
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const now = new Date().toISOString();
  if (session.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  req.user = {
    id: session.id,
    username: session.username,
    normalized_username: session.normalized_username,
    email: session.email,
    vault_salt: session.vault_salt,
    theme: session.theme,
    checkin_interval_days: session.checkin_interval_days,
    last_checkin_at: session.last_checkin_at,
    switch_enabled: Boolean(session.switch_enabled),
    nominee: {
      name: session.nominee_name,
      email: session.nominee_email,
      relationship: session.nominee_relationship,
      phone: session.nominee_phone
    }
  };
  req.sessionToken = token;

  next();
}
