import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Shield,
  Search,
  ExternalLink,
  ChevronRight,
  GitCommit,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

export default function VersionHistoryPage() {
  const { token } = useAuth();
  const { documents, refreshAll } = useVault();

  const [selectedDocId, setSelectedDocId] = useState('');
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionForCompare, setSelectedVersionForCompare] = useState(null);

  // Restore State
  const [restoringVersionId, setRestoringVersionId] = useState(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('');
  const [restoreErrorMsg, setRestoreErrorMsg] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Filter
  const [search, setSearch] = useState('');

  // Default selection
  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // Fetch versions when selectedDocId changes
  useEffect(() => {
    if (!selectedDocId || !token) return;

    async function loadVersions() {
      setLoadingVersions(true);
      setRestoreSuccessMsg('');
      setRestoreErrorMsg('');
      try {
        const res = await fetch(`/api/documents/${selectedDocId}/versions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setVersions(data.versions || []);
        }
      } catch (err) {
        console.error('Failed to load version history:', err);
      } finally {
        setLoadingVersions(false);
      }
    }

    loadVersions();
  }, [selectedDocId, token]);

  const handleInitiateRestore = (version) => {
    setRestoringVersionId(version);
    setRestoreModalOpen(true);
    setRestoreSuccessMsg('');
    setRestoreErrorMsg('');
  };

  const handleConfirmRestore = async () => {
    if (!restoringVersionId || !selectedDocId || !token) return;

    setRestoreLoading(true);
    setRestoreErrorMsg('');
    try {
      const res = await fetch(`/api/documents/${selectedDocId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ source_version_id: restoringVersionId.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Restoration failed pre-check verification.');
      }

      setRestoreSuccessMsg(data.message || 'Restoration completed and promoted to new version.');
      setRestoreModalOpen(false);

      // Refresh version list and vault
      const vRes = await fetch(`/api/documents/${selectedDocId}/versions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVersions(vData.versions || []);
      }
      refreshAll();
    } catch (err) {
      setRestoreErrorMsg(err.message);
    } finally {
      setRestoreLoading(false);
    }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid var(--status-info)',
            color: 'var(--status-info)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <History size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Immutable Document Version History
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Persistent, tamper-evident document version lineage with cryptographic baselines and audited restoration.
            </p>
          </div>
        </div>
      </div>

      {restoreSuccessMsg && (
        <div style={{
          background: 'var(--status-success-bg)',
          border: '1px solid var(--status-success)',
          color: 'var(--status-success)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{restoreSuccessMsg}</span>
        </div>
      )}

      {restoreErrorMsg && (
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
          <span>{restoreErrorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(420px, 2fr)', gap: '1.5rem' }}>
        {/* Left Column: Document Selector */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          height: 'fit-content'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem 0' }}>
            Vault Document Lineage
          </h3>

          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredDocs.map(doc => {
              const isSelected = doc.id === selectedDocId;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {doc.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Current Version: <strong style={{ color: 'var(--accent)' }}>v{doc.version || 1}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Version History Timeline */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem'
        }}>
          {selectedDoc ? (
            <>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                  {selectedDoc.title}
                </h2>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Doc ID: <code>{selectedDoc.id}</code></span>
                  <span>•</span>
                  <span>Category: {selectedDoc.category}</span>
                  <span>•</span>
                  <span>Total Versions Recorded: {versions.length}</span>
                </div>
              </div>

              {loadingVersions ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Loading immutable version timeline...
                </div>
              ) : versions.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No historical versions found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {versions.map((ver, idx) => {
                    const isCurrent = ver.version_number === (selectedDoc.version || 1);
                    return (
                      <div
                        key={ver.id}
                        style={{
                          background: 'var(--bg-surface)',
                          border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              background: isCurrent ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                              color: isCurrent ? 'var(--text-inverse)' : 'var(--text-primary)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              v{ver.version_number}
                            </span>
                            {isCurrent && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                                (ACTIVE CURRENT BASELINE)
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isCurrent && ver.recovery_eligible && (
                              <button
                                onClick={() => handleInitiateRestore(ver)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.35rem 0.75rem',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: '1px solid var(--status-info)',
                                  color: 'var(--status-info)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <RotateCcw size={13} />
                                Restore to New Version
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Version Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Created:</span>{' '}
                            {new Date(ver.created_at).toLocaleString()}
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>File Size:</span>{' '}
                            {(ver.file_size_bytes / 1024).toFixed(1)} KB ({ver.file_name})
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Storage Key:</span>{' '}
                            <code style={{ fontSize: '0.7rem' }}>{ver.storage_object_key || 'vault/' + ver.document_id + '/v' + ver.version_number}</code>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: 'var(--text-muted)' }}>SHA-256 Digest:</span>{' '}
                            <code style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>{ver.content_digest}</code>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a document to view version history.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Version Restoration */}
      {restoreModalOpen && restoringVersionId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            maxWidth: '500px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--status-info)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                <RotateCcw size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Confirm Version Restoration
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              You are about to restore <strong>v{restoringVersionId.version_number}</strong> of <em>"{selectedDoc?.title}"</em>.
              PHOENIX will cryptographically verify this recovery copy's digest against its authenticated manifest before promoting it as <strong>v{(selectedDoc?.version || 1) + 1}</strong>.
            </p>

            <div style={{
              background: 'var(--bg-input)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              marginBottom: '1.5rem',
              color: 'var(--text-muted)'
            }}>
              Source Digest: {restoringVersionId.content_digest}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setRestoreModalOpen(false)}
                disabled={restoreLoading}
                style={{
                  padding: '0.55rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={restoreLoading}
                style={{
                  padding: '0.55rem 1.25rem',
                  background: 'var(--status-info)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: restoreLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {restoreLoading ? 'Verifying & Restoring...' : 'Verify & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
