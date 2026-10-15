import React, { useState } from 'react';
import { X, Lock, Download, Trash2, Calendar, FileText, ShieldAlert, CheckCircle, Eye, Edit2, Check } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { downloadFile } from '../utils/crypto';

export default function DocumentDetailModal({ document, isOpen, onClose }) {
  const { decryptDocument, deleteDocument, updateDocumentExpiry } = useVault();
  const [decrypting, setDecrypting] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [isEditingExpiry, setIsEditingExpiry] = useState(false);
  const [expiryInput, setExpiryInput] = useState(document?.expiry_date || '');
  const [savingExpiry, setSavingExpiry] = useState(false);

  if (!isOpen || !document) return null;

  const handleDecryptAndDownload = async () => {
    setError('');
    setDecrypting(true);
    try {
      const decryptedBuffer = await decryptDocument(document);
      downloadFile(decryptedBuffer, document.file_name, document.file_type);
    } catch (err) {
      setError(err.message || 'Decryption failed. Please verify vault key.');
    } finally {
      setDecrypting(false);
    }
  };

  const handleDecryptAndPreview = async () => {
    setError('');
    setDecrypting(true);
    try {
      const decryptedBuffer = await decryptDocument(document);
      const text = new TextDecoder().decode(decryptedBuffer);
      setPreviewContent(text.slice(0, 1000) + (text.length > 1000 ? '\n...[Truncated]' : ''));
    } catch (err) {
      setError(err.message || 'Decryption failed.');
    } finally {
      setDecrypting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(document.id);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-mark" style={{ width: '32px', height: '32px' }}>
              <FileText size={16} />
            </div>
            <div>
              <h2 className="modal-title">{document.title}</h2>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.15rem' }}>
                <span className="badge badge-info">{document.category}</span>
                <span className="badge badge-success">v{document.version}</span>
                {document.is_synthetic === 1 && (
                  <span className="badge badge-simulation">DEMO FIXTURE</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.65rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger)',
            fontSize: '0.78rem',
            marginBottom: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            {error}
          </div>
        )}

        {/* Metadata Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '0.85rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Insurer / Issuer:</span>{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{document.insurer_name || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Policy / Identifier:</span>{' '}
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{document.policy_number || 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
            <strong style={{ textTransform: 'capitalize', color: document.status === 'active' ? 'var(--status-success)' : 'var(--status-warning)' }}>
              {document.status}
            </strong>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Expiry Date:</span>
              {!isEditingExpiry && (
                <button
                  type="button"
                  onClick={() => {
                    setExpiryInput(document.expiry_date || '');
                    setIsEditingExpiry(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: 0
                  }}
                >
                  <Edit2 size={11} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingExpiry ? (
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                <input
                  type="date"
                  value={expiryInput}
                  onChange={(e) => setExpiryInput(e.target.value)}
                  className="input-control"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', fontFamily: 'var(--font-mono)' }}
                />
                <button
                  type="button"
                  disabled={savingExpiry}
                  onClick={async () => {
                    setSavingExpiry(true);
                    setError('');
                    try {
                      await updateDocumentExpiry(document.id, expiryInput || null, document.category);
                      setIsEditingExpiry(false);
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setSavingExpiry(false);
                    }
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                >
                  {savingExpiry ? '...' : <Check size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingExpiry(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <strong style={{ color: 'var(--text-primary)' }}>{document.expiry_date || 'No Expiration Set'}</strong>
            )}
          </div>
        </div>

        {/* Cryptographic Ledger & Ciphertext Summary */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Lock size={13} style={{ color: 'var(--accent)' }} />
              <span>Cryptographic Envelope & Integrity Baseline</span>
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: document.integrity_status === 'TAMPERING_DETECTED' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
              color: document.integrity_status === 'TAMPERING_DETECTED' ? 'var(--status-danger)' : 'var(--status-success)'
            }}>
              {document.integrity_status || 'VERIFIED'}
            </span>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Algorithm:</span> AES-256-GCM (Zero-Knowledge, 128-bit Tag)
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>SHA-256 Content Digest:</span>{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-primary)' }}>
                {document.content_digest || 'SHA-256 baseline registered in manifest'}
              </code>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Initialization Vector (IV):</span>{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', background: 'var(--bg-surface)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                {document.encryption_iv}
              </code>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Encrypted Payload Size:</span>{' '}
              {(document.file_size_bytes / 1024).toFixed(1)} KB (Ciphertext bytes stored on disk)
            </div>
          </div>
        </div>

        {/* Decrypted Preview Content if toggled */}
        {previewContent && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            marginBottom: '1.25rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            whiteSpace: 'pre-wrap',
            maxHeight: '160px',
            overflowY: 'auto',
            color: 'var(--text-primary)'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '0.4rem' }}>
              ✓ Decrypted In-Memory Preview:
            </div>
            {previewContent}
          </div>
        )}

        {/* Modal Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-danger)' }}>Confirm permanent deletion?</span>
              <button onClick={handleDelete} className="btn btn-danger btn-sm">Yes, Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-secondary btn-sm">Cancel</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--status-danger)' }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleDecryptAndPreview}
              disabled={decrypting}
              className="btn btn-secondary btn-sm"
            >
              <Eye size={13} />
              <span>{decrypting ? 'Decrypting...' : 'Preview'}</span>
            </button>

            <button
              type="button"
              onClick={handleDecryptAndDownload}
              disabled={decrypting}
              className="btn btn-primary btn-sm"
            >
              <Download size={13} />
              <span>{decrypting ? 'Decrypting...' : 'Decrypt & Download'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
