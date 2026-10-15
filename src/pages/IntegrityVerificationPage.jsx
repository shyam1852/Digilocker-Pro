import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Key,
  Hash,
  Clock,
  Search,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { sha256Hex } from '../utils/crypto';

export default function IntegrityVerificationPage() {
  const { token } = useAuth();
  const { documents, refreshAll } = useVault();

  const [selectedDocId, setSelectedDocId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' | 'manual'
  const [searchFilter, setSearchFilter] = useState('');

  // Manual Hash Calculator State
  const [manualInput, setManualInput] = useState('');
  const [manualHash, setManualHash] = useState('');
  const [expectedHashInput, setExpectedHashInput] = useState('');
  const [manualMatch, setManualMatch] = useState(null);

  // Set default selection
  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // Run real verification on backend
  const handleVerify = async (docId) => {
    const idToVerify = docId || selectedDocId;
    if (!idToVerify || !token) return;

    setVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch(`/api/documents/${idToVerify}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setVerificationResult(data.verification || { status: data.status, reason: 'Verification completed' });
      // Refresh vault records to reflect status changes
      refreshAll();
    } catch (err) {
      setVerificationResult({
        status: 'VERIFICATION_FAILED',
        reason: err.message || 'Network error executing verification engine.'
      });
    } finally {
      setVerifying(false);
    }
  };

  // Compute manual SHA-256 using Web Crypto
  const handleManualCalculate = async (text) => {
    setManualInput(text);
    if (!text) {
      setManualHash('');
      setManualMatch(null);
      return;
    }
    try {
      const hash = await sha256Hex(text);
      setManualHash(hash);
      if (expectedHashInput.trim()) {
        setManualMatch(hash.toLowerCase() === expectedHashInput.trim().toLowerCase());
      }
    } catch {
      setManualHash('Error calculating digest');
    }
  };

  const handleExpectedHashChange = (val) => {
    setExpectedHashInput(val);
    if (manualHash && val.trim()) {
      setManualMatch(manualHash.toLowerCase() === val.trim().toLowerCase());
    } else {
      setManualMatch(null);
    }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (d.category && d.category.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const verifiedCount = documents.filter(d => d.integrity_status === 'VERIFIED').length;
  const tamperedCount = documents.filter(d => d.integrity_status === 'TAMPERING_DETECTED').length;

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--status-success)',
            color: 'var(--status-success)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Tamper-Evident Cryptographic Integrity Verification
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Canonical JSON manifests (RFC 8785) signed with HMAC-SHA256 authority. Detects unauthorized storage tampering down to single-byte mutations.
            </p>
          </div>
        </div>

        {/* Real Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginTop: '1.25rem'
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audited Documents</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{documents.length}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified Baselines</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)', marginTop: '0.25rem' }}>{verifiedCount}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tampering Alerts</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: tamperedCount > 0 ? 'var(--status-danger)' : 'var(--text-muted)', marginTop: '0.25rem' }}>{tamperedCount}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signing Authority</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Lock size={14} color="var(--status-success)" /> HMAC-SHA256 Isolated
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-regular)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('vault')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'vault' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'vault' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'vault' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Vault Document Verifier
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'manual' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'manual' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Client-Side SHA-256 Calculator
        </button>
      </div>

      {/* Vault Document Verifier Mode */}
      {activeTab === 'vault' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(400px, 1.8fr)', gap: '1.5rem' }}>
          {/* Document Picker Panel */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            height: 'fit-content'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem 0' }}>
              Select Vault Document
            </h3>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredDocs.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No documents found in vault.
                </div>
              ) : (
                filteredDocs.map(doc => {
                  const isSelected = doc.id === selectedDocId;
                  const isTampered = doc.integrity_status === 'TAMPERING_DETECTED';

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setVerificationResult(null);
                      }}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {doc.title}
                        </div>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          background: isTampered ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
                          color: isTampered ? 'var(--status-danger)' : 'var(--status-success)'
                        }}>
                          {doc.integrity_status || 'VERIFIED'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        <span>v{doc.version || 1}</span>
                        <span>•</span>
                        <span>{doc.file_name}</span>
                        <span>•</span>
                        <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Verification Inspection & Execution Panel */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem'
          }}>
            {selectedDoc ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {selectedDoc.title}
                    </h2>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Version {selectedDoc.version || 1} • Registered {new Date(selectedDoc.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerify()}
                    disabled={verifying}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 1.15rem',
                      background: 'var(--accent)',
                      color: 'var(--text-inverse)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: verifying ? 'not-allowed' : 'pointer',
                      opacity: verifying ? 0.7 : 1
                    }}
                  >
                    <RefreshCw size={15} className={verifying ? 'spin-animation' : ''} />
                    {verifying ? 'Auditing Hash...' : 'Verify Cryptographic Integrity'}
                  </button>
                </div>

                {/* Stored Integrity Metadata Snapshot */}
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                    Authenticated Baseline Metadata
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Algorithm:</span>{' '}
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>SHA-256 + HMAC</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Encryption:</span>{' '}
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>AES-256-GCM</span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Baseline SHA-256 Digest:</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        background: 'var(--bg-surface)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        wordBreak: 'break-all'
                      }}>
                        {selectedDoc.content_digest || 'Generated on first live verification audit'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Verification Result Box */}
                {verificationResult ? (
                  <div style={{
                    background: verificationResult.status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${verificationResult.status === 'VERIFIED' ? 'var(--status-success)' : 'var(--status-danger)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                      {verificationResult.status === 'VERIFIED' ? (
                        <CheckCircle2 size={20} color="var(--status-success)" />
                      ) : (
                        <AlertTriangle size={20} color="var(--status-danger)" />
                      )}
                      <span style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: verificationResult.status === 'VERIFIED' ? 'var(--status-success)' : 'var(--status-danger)'
                      }}>
                        {verificationResult.status === 'VERIFIED' ? 'INTEGRITY VERIFIED: CONTENT UNTOUCHED' : 'TAMPERING DETECTED: CRYPTOGRAPHIC MISMATCH'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
                      {verificationResult.reason}
                    </p>

                    {/* Cryptographic Checks Breakdown */}
                    {verificationResult.checks && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Verification Checklist:</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                          {verificationResult.checks.manifestPresent ? <CheckCircle2 size={14} color="var(--status-success)" /> : <AlertTriangle size={14} color="var(--status-danger)" />}
                          <span>Authenticated Manifest Present in Enclave</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                          {verificationResult.checks.signatureValid ? <CheckCircle2 size={14} color="var(--status-success)" /> : <AlertTriangle size={14} color="var(--status-danger)" />}
                          <span>HMAC-SHA256 Signing Authority Signature Valid</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                          {verificationResult.checks.contentDigestMatch ? <CheckCircle2 size={14} color="var(--status-success)" /> : <AlertTriangle size={14} color="var(--status-danger)" />}
                          <span>Recomputed Ciphertext Digest Matches Stored Baseline</span>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.85rem' }}>
                      <Clock size={13} />
                      <span>Verified at: {new Date(verificationResult.verifiedAt || Date.now()).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '2.5rem',
                    textAlign: 'center',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)'
                  }}>
                    <Key size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Click "Verify Cryptographic Integrity" to execute a live audit against stored ciphertext.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a document from the left panel to inspect its cryptographic manifest.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Client-Side SHA-256 Calculator Mode */}
      {activeTab === 'manual' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
            Client-Side SHA-256 Web Crypto Calculator
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
            Verify byte integrity directly inside your browser's Web Crypto enclave without sending any data over the network.
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Payload String / Text Content:
            </label>
            <textarea
              rows={4}
              value={manualInput}
              onChange={e => handleManualCalculate(e.target.value)}
              placeholder="Paste arbitrary text or encrypted payload here..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.75rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Computed SHA-256 Digest (On-Device):
            </label>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.85rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: manualHash ? 'var(--text-primary)' : 'var(--text-muted)',
              wordBreak: 'break-all',
              minHeight: '22px'
            }}>
              {manualHash || 'Awaiting input...'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Expected Baseline Hash (Optional Comparison):
            </label>
            <input
              type="text"
              value={expectedHashInput}
              onChange={e => handleExpectedHashChange(e.target.value)}
              placeholder="Paste target 64-character hex hash to compare..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem'
              }}
            />

            {manualMatch !== null && (
              <div style={{
                marginTop: '0.85rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: manualMatch ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                color: manualMatch ? 'var(--status-success)' : 'var(--status-danger)'
              }}>
                {manualMatch ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{manualMatch ? 'MATCH: Hashes are cryptographically identical.' : 'MISMATCH: Digest differs from expected baseline.'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
