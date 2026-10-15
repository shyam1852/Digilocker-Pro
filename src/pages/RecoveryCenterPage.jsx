import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Lock,
  ArrowRight,
  RefreshCw,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

export default function RecoveryCenterPage() {
  const { token } = useAuth();
  const { documents, refreshAll } = useVault();

  const [selectedDocId, setSelectedDocId] = useState('');
  const [docVersions, setDocVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [recoveryJobs, setRecoveryJobs] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Workflow state
  const [step, setStep] = useState(1); // 1: Select, 2: Pre-Check, 3: Execute & Complete
  const [preCheckResult, setPreCheckResult] = useState(null);
  const [preChecking, setPreChecking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreOutcome, setRestoreOutcome] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial selection
  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // Load versions for selected document
  useEffect(() => {
    if (!selectedDocId || !token) return;

    async function loadDocVersions() {
      setLoadingVersions(true);
      try {
        const res = await fetch(`/api/documents/${selectedDocId}/versions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const vers = data.versions || [];
          setDocVersions(vers);
          if (vers.length > 1) {
            // Select older version by default if available
            setSelectedVersionId(vers[1].id);
          } else if (vers.length > 0) {
            setSelectedVersionId(vers[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load document versions for recovery:', err);
      } finally {
        setLoadingVersions(false);
      }
    }

    loadDocVersions();
  }, [selectedDocId, token]);

  // Run pre-restoration verification
  const handlePreCheck = async () => {
    if (!selectedVersionId || !token) return;

    setPreChecking(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/versions/${selectedVersionId}/integrity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect recovery baseline.');
      }
      setPreCheckResult(data.verification);
      setStep(2);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPreChecking(false);
    }
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    if (!selectedDocId || !selectedVersionId || !token) return;

    setRestoring(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/documents/${selectedDocId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ source_version_id: selectedVersionId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Recovery execution was rejected by verification engine.');
      }

      setRestoreOutcome(data);
      setStep(3);
      refreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setRestoring(false);
    }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const selectedVersion = docVersions.find(v => v.id === selectedVersionId);

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid var(--status-info)',
            color: 'var(--status-info)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <RotateCcw size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Autonomous Vault Recovery Center
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Controlled version rollback and recovery proof. Every recovery copy is cryptographically audited before promotion.
            </p>
          </div>
        </div>

        {/* Operational Security Disclaimer */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginTop: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Lock size={15} color="var(--accent)" />
          <span>
            <strong>Zero-Knowledge Safety Guarantee:</strong> Never overwrites trusted baselines with unverified copies. Restorations generate a new immutable version increment.
          </span>
        </div>
      </div>

      {errorMsg && (
        <div style={{
          background: 'var(--status-danger-bg)',
          border: '1px solid var(--status-danger)',
          color: 'var(--status-danger)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Workflow Container */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem'
      }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 1 ? 'var(--accent)' : 'var(--text-muted)' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 1 ? 'var(--accent)' : 'var(--bg-surface)', color: step >= 1 ? 'var(--text-inverse)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>1</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>1. Target Selection</span>
          </div>
          <ArrowRight size={16} color="var(--border-regular)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 2 ? 'var(--accent)' : 'var(--text-muted)' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 2 ? 'var(--accent)' : 'var(--bg-surface)', color: step >= 2 ? 'var(--text-inverse)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>2. Cryptographic Pre-Check</span>
          </div>
          <ArrowRight size={16} color="var(--border-regular)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 3 ? 'var(--status-success)' : 'var(--text-muted)' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 3 ? 'var(--status-success)' : 'var(--bg-surface)', color: step >= 3 ? '#ffffff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>3</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>3. Verified Restoration</span>
          </div>
        </div>

        {/* STEP 1: SELECT DOCUMENT & HISTORICAL VERSION */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
              Select Document & Recovery Copy
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Target Vault Document:
                </label>
                <select
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.title} (Current: v{d.version || 1})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Select Recovery Copy / Historical Version:
                </label>
                <select
                  value={selectedVersionId}
                  onChange={e => setSelectedVersionId(e.target.value)}
                  disabled={loadingVersions || docVersions.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  {docVersions.map(v => (
                    <option key={v.id} value={v.id}>
                      Version {v.version_number} — {new Date(v.created_at).toLocaleDateString()} ({v.file_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedVersion && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.8rem'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Selected Recovery Copy Metadata
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <div>Storage Reference: <code style={{ color: 'var(--text-primary)' }}>{selectedVersion.storage_object_key || 'vault/' + selectedVersion.document_id + '/v' + selectedVersion.version_number}</code></div>
                  <div>Content Digest: <code style={{ color: 'var(--text-primary)' }}>{selectedVersion.content_digest?.substring(0, 24)}...</code></div>
                  <div>Created Timestamp: {new Date(selectedVersion.created_at).toLocaleString()}</div>
                  <div>Recovery Eligibility: <strong style={{ color: selectedVersion.recovery_eligible ? 'var(--status-success)' : 'var(--status-danger)' }}>{selectedVersion.recovery_eligible ? 'ELIGIBLE' : 'INELIGIBLE'}</strong></div>
                </div>
              </div>
            )}

            <button
              onClick={handlePreCheck}
              disabled={preChecking || !selectedVersionId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: preChecking ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} className={preChecking ? 'spin-animation' : ''} />
              {preChecking ? 'Executing Pre-Check...' : 'Run Cryptographic Pre-Check'}
            </button>
          </div>
        )}

        {/* STEP 2: PRE-CHECK RESULTS & CONFIRMATION */}
        {step === 2 && preCheckResult && (
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
              Cryptographic Pre-Restoration Verification
            </h2>

            <div style={{
              background: preCheckResult.status === 'VERIFIED' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
              border: `1px solid ${preCheckResult.status === 'VERIFIED' ? 'var(--status-success)' : 'var(--status-danger)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {preCheckResult.status === 'VERIFIED' ? (
                  <CheckCircle2 size={20} color="var(--status-success)" />
                ) : (
                  <AlertTriangle size={20} color="var(--status-danger)" />
                )}
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: preCheckResult.status === 'VERIFIED' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                  {preCheckResult.status === 'VERIFIED' ? 'RECOVERY COPY PRE-CHECK PASSED' : 'RECOVERY COPY INTEGRITY CHECK FAILED'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                {preCheckResult.reason}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '0.65rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Back to Selection
              </button>

              {preCheckResult.status === 'VERIFIED' && (
                <button
                  onClick={handleExecuteRestore}
                  disabled={restoring}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    background: 'var(--status-info)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: restoring ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RotateCcw size={15} />
                  {restoring ? 'Executing Restoration...' : 'Execute Verified Restoration'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: RESTORATION COMPLETED */}
        {step === 3 && restoreOutcome && (
          <div>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--status-success)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <CheckCircle2 size={36} color="var(--status-success)" style={{ margin: '0 auto 0.75rem auto' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--status-success)', margin: '0 0 0.5rem 0' }}>
                Document Restoration Completed & Verified!
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                {restoreOutcome.message}
              </p>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setRestoreOutcome(null);
                setPreCheckResult(null);
              }}
              style={{
                padding: '0.65rem 1.25rem',
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Start Another Recovery Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
