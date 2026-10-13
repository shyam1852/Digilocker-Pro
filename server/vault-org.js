import db, { ensureUserDefaultFolders } from './db.js';
import crypto from 'crypto';

/**
 * DM LOCKER PRO — SMART VAULT ORGANIZATION & FOLDER ENGINE
 * 
 * Requirements:
 * - Smart folders & custom folders
 * - Bulk categorization with review
 * - Undo support for recent organization changes
 * - Duplicate detection (by SHA-256 hash or name + size)
 * - Zero-knowledge preservation: Operates solely on document metadata, never touches encrypted file blobs
 */

/**
 * Get all folders for user (auto-seeds defaults if empty)
 */
export function getUserFolders(userId) {
  ensureUserDefaultFolders(userId);
  const folders = db.prepare(`
    SELECT f.*, 
      (SELECT COUNT(*) FROM documents d WHERE d.user_id = f.user_id AND (d.folder_id = f.id OR (d.folder_id IS NULL AND d.category = f.category))) as document_count
    FROM folders f
    WHERE f.user_id = ?
    ORDER BY f.is_system DESC, f.name ASC
  `).all(userId);

  return folders;
}

/**
 * Create custom folder
 */
export function createFolder(userId, { name, icon = 'Folder', color = '#3b82f6', category = 'Custom' }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Folder name is required.');
  }

  const trimmed = name.trim();
  const folderId = `fld_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO folders (id, user_id, name, icon, color, category, is_system, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(folderId, userId, trimmed, icon, color, category, now);

  return db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
}

/**
 * Update folder name / icon / color
 */
export function updateFolder(userId, folderId, { name, icon, color }) {
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(folderId, userId);
  if (!folder) {
    throw new Error('Folder not found or access denied.');
  }

  const newName = name ? name.trim() : folder.name;
  const newIcon = icon || folder.icon;
  const newColor = color || folder.color;

  db.prepare(`
    UPDATE folders
    SET name = ?, icon = ?, color = ?
    WHERE id = ?
  `).run(newName, newIcon, newColor, folderId);

  return db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
}

/**
 * Delete folder (moves documents back to unclassified)
 */
export function deleteFolder(userId, folderId) {
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(folderId, userId);
  if (!folder) {
    throw new Error('Folder not found or access denied.');
  }

  // Clear folder_id on documents in this folder
  db.prepare('UPDATE documents SET folder_id = NULL WHERE user_id = ? AND folder_id = ?').run(userId, folderId);
  db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);

  return { success: true };
}

/**
 * Move documents to folder with undo history recording
 */
export function moveDocumentsToFolder(userId, documentIds = [], folderId = null) {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new Error('At least one document ID must be specified.');
  }

  // Fetch previous folder states for rollback
  const placeholders = documentIds.map(() => '?').join(',');
  const previousDocs = db.prepare(`
    SELECT id, folder_id, category FROM documents WHERE user_id = ? AND id IN (${placeholders})
  `).all(userId, ...documentIds);

  if (previousDocs.length === 0) {
    throw new Error('No valid documents found for the current user.');
  }

  // Record undo history
  const historyId = `org_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO organization_history (id, user_id, action_type, payload, created_at)
    VALUES (?, ?, 'MOVE_FOLDER', ?, ?)
  `).run(
    historyId,
    userId,
    JSON.stringify({
      previousState: previousDocs.map(d => ({ id: d.id, folder_id: d.folder_id })),
      targetFolderId: folderId
    }),
    now
  );

  // Perform update
  const updateStmt = db.prepare('UPDATE documents SET folder_id = ?, updated_at = ? WHERE id = ? AND user_id = ?');
  const updateMany = db.transaction((docs) => {
    for (const d of docs) {
      updateStmt.run(folderId, now, d.id, userId);
    }
  });
  updateMany(previousDocs);

  return {
    success: true,
    movedCount: previousDocs.length,
    undoToken: historyId
  };
}

/**
 * Bulk categorize documents with undo history
 */
export function bulkCategorizeDocuments(userId, documentIds = [], newCategory) {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new Error('At least one document ID must be specified.');
  }
  if (!newCategory || !newCategory.trim()) {
    throw new Error('New category is required.');
  }

  const placeholders = documentIds.map(() => '?').join(',');
  const previousDocs = db.prepare(`
    SELECT id, category FROM documents WHERE user_id = ? AND id IN (${placeholders})
  `).all(userId, ...documentIds);

  if (previousDocs.length === 0) {
    throw new Error('No valid documents found.');
  }

  const historyId = `org_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO organization_history (id, user_id, action_type, payload, created_at)
    VALUES (?, ?, 'BULK_CATEGORIZE', ?, ?)
  `).run(
    historyId,
    userId,
    JSON.stringify({
      previousState: previousDocs.map(d => ({ id: d.id, category: d.category })),
      targetCategory: newCategory
    }),
    now
  );

  const updateStmt = db.prepare('UPDATE documents SET category = ?, updated_at = ? WHERE id = ? AND user_id = ?');
  const updateMany = db.transaction((docs) => {
    for (const d of docs) {
      updateStmt.run(newCategory, now, d.id, userId);
    }
  });
  updateMany(previousDocs);

  return {
    success: true,
    updatedCount: previousDocs.length,
    undoToken: historyId
  };
}

/**
 * Undo last organization action
 */
export function undoLastOrganizationAction(userId) {
  const lastAction = db.prepare(`
    SELECT * FROM organization_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  if (!lastAction) {
    return { success: false, message: 'No recent organization changes to undo.' };
  }

  const payload = JSON.parse(lastAction.payload);
  const now = new Date().toISOString();

  if (lastAction.action_type === 'MOVE_FOLDER') {
    const revertStmt = db.prepare('UPDATE documents SET folder_id = ?, updated_at = ? WHERE id = ? AND user_id = ?');
    const revertMany = db.transaction((items) => {
      for (const item of items) {
        revertStmt.run(item.folder_id, now, item.id, userId);
      }
    });
    revertMany(payload.previousState);
  } else if (lastAction.action_type === 'BULK_CATEGORIZE') {
    const revertStmt = db.prepare('UPDATE documents SET category = ?, updated_at = ? WHERE id = ? AND user_id = ?');
    const revertMany = db.transaction((items) => {
      for (const item of items) {
        revertStmt.run(item.category, now, item.id, userId);
      }
    });
    revertMany(payload.previousState);
  }

  // Delete reverted history record
  db.prepare('DELETE FROM organization_history WHERE id = ?').run(lastAction.id);

  return {
    success: true,
    revertedAction: lastAction.action_type,
    revertedItemsCount: payload.previousState?.length || 0
  };
}

/**
 * Detect duplicate documents in user's vault
 * Criteria: Identical file_hash OR identical (file_name + file_size_bytes)
 */
export function detectDuplicateDocuments(userId) {
  const docs = db.prepare(`
    SELECT id, title, category, file_name, file_size_bytes, file_hash, created_at
    FROM documents
    WHERE user_id = ? AND status != 'archived'
    ORDER BY created_at ASC
  `).all(userId);

  const seen = new Map();
  const duplicateGroups = [];

  for (const doc of docs) {
    const key = doc.file_hash || `${doc.file_name.toLowerCase()}_${doc.file_size_bytes}`;
    if (seen.has(key)) {
      const existing = seen.get(key);
      let group = duplicateGroups.find(g => g.key === key);
      if (!group) {
        group = { key, original: existing, duplicates: [] };
        duplicateGroups.push(group);
      }
      group.duplicates.push(doc);
    } else {
      seen.set(key, doc);
    }
  }

  return duplicateGroups;
}
