import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { encryptData, decryptData, encryptDocumentPackage, decryptMetadata } from '../utils/crypto';

const VaultContext = createContext();

export function VaultProvider({ children }) {
  const { token, vaultKey, user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [healthChecks, setHealthChecks] = useState([]);
  const [claims, setClaims] = useState([]);
  const [activities, setActivities] = useState([]);
  const [emergencyStatus, setEmergencyStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  // Load all user records
  const refreshAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [docsRes, fldRes, dupRes, renRes, hlthRes, clmRes, actRes, emgRes] = await Promise.all([
        fetch('/api/documents', { headers: authHeaders() }),
        fetch('/api/folders', { headers: authHeaders() }),
        fetch('/api/vault/duplicates', { headers: authHeaders() }),
        fetch('/api/renewals', { headers: authHeaders() }),
        fetch('/api/health-checks', { headers: authHeaders() }),
        fetch('/api/nominee-claims', { headers: authHeaders() }),
        fetch('/api/activities', { headers: authHeaders() }),
        fetch('/api/emergency/status', { headers: authHeaders() })
      ]);

      if (docsRes.ok) {
        const d = await docsRes.json();
        setDocuments(d.documents);
      }
      if (fldRes.ok) {
        const f = await fldRes.json();
        setFolders(f.folders || []);
      }
      if (dupRes.ok) {
        const dp = await dupRes.json();
        setDuplicates(dp.duplicates || []);
      }
      if (renRes.ok) {
        const r = await renRes.json();
        setRenewals(r.workflows);
      }
      if (hlthRes.ok) {
        const h = await hlthRes.json();
        setHealthChecks(h.checks);
      }
      if (clmRes.ok) {
        const c = await clmRes.json();
        setClaims(c.claims);
      }
      if (actRes.ok) {
        const a = await actRes.json();
        setActivities(a.activities);
      }
      if (emgRes.ok) {
        const e = await emgRes.json();
        setEmergencyStatus(e);
      }
    } catch (err) {
      console.error('Failed to refresh vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    if (token) {
      refreshAll();
    }
  }, [token, refreshAll]);

  // Upload and client-side encrypt a document
  const uploadDocument = async (file, metadata) => {
    if (!vaultKey) {
      throw new Error('Vault is locked. Decryption/Encryption key not loaded into client memory.');
    }

    const fileBuffer = await file.arrayBuffer();
    // Perform AES-256-GCM encryption in the browser with independent nonces for file and metadata
    const {
      encrypted_blob,
      encryption_iv,
      encrypted_metadata,
      metadata_iv
    } = await encryptDocumentPackage(fileBuffer, {
      title: metadata.title || file.name,
      policy_number: metadata.policy_number || '',
      insurer_name: metadata.insurer_name || '',
      expiry_date: metadata.expiry_date || null,
      category: metadata.category || 'Other Records',
      coverage_terms: metadata.coverage_terms || null,
      extracted_fields: metadata.extracted_fields || null
    }, vaultKey);

    const payload = {
      title: metadata.title || file.name,
      category: metadata.category || 'Other Records',
      policy_number: metadata.policy_number || '',
      insurer_name: metadata.insurer_name || '',
      expiry_date: metadata.expiry_date || null,
      encrypted_blob,
      encryption_iv,
      encrypted_metadata,
      metadata_iv,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size_bytes: file.size
    };

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    await refreshAll();

  };

  // Decrypt document on client
  const decryptDocument = async (doc) => {
    // Check if it's a synthetic fixture with mock ciphertext
    if (doc.encrypted_blob && doc.encrypted_blob.startsWith('SYNTHETIC_CIPHERTEXT')) {
      const plain = atob(doc.encrypted_blob).replace('SYNTHETIC_CIPHERTEXT:', '');
      return new TextEncoder().encode(`[SYNTHETIC VERIFIED FIXTURE]\nDocument: ${doc.title}\nPolicy: ${doc.policy_number}\nPayload: ${plain}`).buffer;
    }

    if (!vaultKey) {
      throw new Error('Vault encryption key not active in browser. Please re-authenticate.');
    }

    return await decryptData(doc.encrypted_blob, doc.encryption_iv, vaultKey);
  };

  // Delete document
  const deleteDocument = async (id) => {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete document');
    await refreshAll();
  };

  // Dispatch renewal workflow
  const dispatchRenewal = async (docId, currentPremium, targetUrl) => {
    const res = await fetch('/api/renewals/dispatch', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        document_id: docId,
        current_premium: currentPremium,
        target_url: targetUrl || undefined
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to dispatch renewal agent (${res.status})`);
    }
    const data = await res.json();
    await refreshAll();
    return data;
  };

  // Confirm renewal
  const confirmRenewal = async (workflowId) => {
    const res = await fetch(`/api/renewals/${workflowId}/confirm`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to confirm renewal');
    }
    await refreshAll();
  };

  // Run policy health check
  const runHealthCheck = async (docId, targetUrl) => {
    const res = await fetch('/api/health-checks/run', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        document_id: docId,
        target_url: targetUrl || undefined
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to run policy health check (${res.status})`);
    }
    const data = await res.json();
    await refreshAll();
    return data;
  };

  // Review health check
  const reviewHealthCheck = async (checkId, userNotes) => {
    const res = await fetch(`/api/health-checks/${checkId}/review`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ user_notes: userNotes })
    });
    if (!res.ok) throw new Error('Failed to save review notes');
    await refreshAll();
  };

  // Prepare nominee claim
  const prepareClaim = async (docId) => {
    const res = await fetch('/api/nominee-claims/prepare', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ document_id: docId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to prepare claim');
    }
    const data = await res.json();
    await refreshAll();
    return data;
  };

  // Emergency check-in
  const checkIn = async () => {
    const res = await fetch('/api/emergency/checkin', {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Check-in failed');
    await refreshAll();
  };

  // Update emergency settings
  const updateEmergencySettings = async (settings) => {
    const res = await fetch('/api/emergency/settings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    await refreshAll();
  };

  // Update document expiry date and category
  const updateDocumentExpiry = async (docId, expiryDate, category) => {
    const res = await fetch(`/api/documents/${docId}/expiry`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ expiry_date: expiryDate, category })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update expiry date');
    }
    const data = await res.json();
    await refreshAll();
    return data.document;
  };

  // Toggle reminders on a specific document
  const toggleDocumentReminders = async (docId, enabled) => {
    const res = await fetch(`/api/documents/${docId}/reminders`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ reminders_enabled: enabled })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to toggle reminders');
    }
    await refreshAll();
  };

  // Create custom folder
  const createFolder = async (folderData) => {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(folderData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create folder');
    }
    const data = await res.json();
    await refreshAll();
    return data.folder;
  };

  // Update folder
  const updateFolder = async (folderId, folderData) => {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(folderData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update folder');
    }
    await refreshAll();
  };

  // Delete folder
  const deleteFolder = async (folderId) => {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete folder');
    }
    await refreshAll();
  };

  // Move documents to folder
  const moveDocuments = async (documentIds, folderId) => {
    const res = await fetch('/api/documents/move-folder', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ document_ids: documentIds, folder_id: folderId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to move documents');
    }
    const data = await res.json();
    await refreshAll();
    return data;
  };

  // Bulk categorize documents
  const bulkCategorize = async (documentIds, category) => {
    const res = await fetch('/api/documents/bulk-categorize', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ document_ids: documentIds, category })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to categorize documents');
    }
    const data = await res.json();
    await refreshAll();
    return data;
  };

  // Undo last organization action
  const undoLastAction = async () => {
    const res = await fetch('/api/vault/undo', {
      method: 'POST',
      headers: authHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to undo action');
    }
    const data = await res.json();
    await refreshAll();
    return data;
  };

  // Refresh duplicates
  const refreshDuplicates = async () => {
    const res = await fetch('/api/vault/duplicates', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setDuplicates(data.duplicates || []);
      return data.duplicates;
    }
  };

  return (
    <VaultContext.Provider value={{
      documents,
      folders,
      duplicates,
      renewals,
      healthChecks,
      claims,
      activities,
      emergencyStatus,
      loading,
      refreshAll,
      uploadDocument,
      decryptDocument,
      deleteDocument,
      updateDocumentExpiry,
      toggleDocumentReminders,
      createFolder,
      updateFolder,
      deleteFolder,
      moveDocuments,
      bulkCategorize,
      undoLastAction,
      refreshDuplicates,
      dispatchRenewal,
      confirmRenewal,
      runHealthCheck,
      reviewHealthCheck,
      prepareClaim,
      checkIn,
      updateEmergencySettings
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within a VaultProvider');
  return context;
}
