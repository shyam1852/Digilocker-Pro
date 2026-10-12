import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { encryptData, decryptData } from '../utils/crypto';

const VaultContext = createContext();

export function VaultProvider({ children }) {
  const { token, vaultKey, user } = useAuth();

  const [documents, setDocuments] = useState([]);
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
      const [docsRes, renRes, hlthRes, clmRes, actRes, emgRes] = await Promise.all([
        fetch('/api/documents', { headers: authHeaders() }),
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
    // Perform AES-256-GCM encryption in the browser
    const { ciphertextBase64, ivBase64 } = await encryptData(fileBuffer, vaultKey);

    const payload = {
      title: metadata.title || file.name,
      category: metadata.category || 'Other Records',
      policy_number: metadata.policy_number || '',
      insurer_name: metadata.insurer_name || '',
      expiry_date: metadata.expiry_date || null,
      encrypted_blob: ciphertextBase64,
      encryption_iv: ivBase64,
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
  const dispatchRenewal = async (docId, currentPremium) => {
    const res = await fetch('/api/renewals/dispatch', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ document_id: docId, current_premium: currentPremium })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to dispatch renewal agent');
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
      const err = await res.json();
      throw new Error(err.error || 'Failed to confirm renewal');
    }
    await refreshAll();
  };

  // Run policy health check
  const runHealthCheck = async (docId) => {
    const res = await fetch('/api/health-checks/run', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ document_id: docId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to run policy health check');
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

  return (
    <VaultContext.Provider value={{
      documents,
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
