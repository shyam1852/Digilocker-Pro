import React, { useState } from 'react';
import { X, UploadCloud, Lock, FileText, CheckCircle, AlertCircle, KeyRound, Unlock } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Health Insurance',
  'Life Insurance',
  'Vehicle Insurance',
  'Identity Documents',
  'Claim Documents',
  'Other Records'
];

export default function DocumentUploadModal({ isOpen, onClose }) {
  const { uploadDocument } = useVault();
  const { vaultKey, unlockVault, user } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Health Insurance');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState(null);

  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleUnlock = async (pass) => {
    const passwordToUse = pass || unlockPassphrase;
    if (!passwordToUse) {
      setError('Please enter your master passphrase to unlock.');
      return false;
    }
    setUnlocking(true);
    setError('');
    try {
      await unlockVault(passwordToUse);
      setError('');
      return true;
    } catch (err) {
      setError(err.message || 'Passphrase verification failed.');
      return false;
    } finally {
      setUnlocking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select or drag a document file to encrypt and store.');
      return;
    }
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    // Auto-unlock if passphrase provided or if demo account
    if (!vaultKey) {
      let unlocked = false;
      if (unlockPassphrase) {
        unlocked = await handleUnlock(unlockPassphrase);
      } else if (user?.username === 'shyamkeshri') {
        unlocked = await handleUnlock('Password123!');
      }
      if (!unlocked) {
        setError('Vault is locked. Please enter your master passphrase below to unlock in-memory encryption.');
        return;
      }
    }

    setEncrypting(true);
    try {
      await uploadDocument(file, {
        title: title.trim(),
        category,
        policy_number: policyNumber.trim(),
        insurer_name: insurerName.trim(),
        expiry_date: expiryDate || null
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Encryption or upload failed.');
    } finally {
      setEncrypting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-mark" style={{ width: '30px', height: '30px' }}>
              <Lock size={15} />
            </div>
            <div>
              <h2 className="modal-title">Deposit Encrypted Document</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Client-Side AES-256-GCM Zero-Knowledge Storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Vault Unlock Card if key not in memory */}
        {!vaultKey && (
          <div style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-regular)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
              <KeyRound size={15} style={{ color: 'var(--accent)' }} />
              <span>Vault Locked in Current Session</span>
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Enter your master passphrase to activate client-side AES-256-GCM encryption:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                value={unlockPassphrase}
                onChange={(e) => setUnlockPassphrase(e.target.value)}
                placeholder="Enter Master Passphrase"
                className="input-control"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUnlock();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleUnlock()}
                disabled={unlocking}
                className="btn btn-primary btn-sm"
                style={{ padding: '0 0.85rem' }}
              >
                <Unlock size={13} />
                <span>{unlocking ? 'Unlocking...' : 'Unlock Vault'}</span>
              </button>
            </div>
            {user?.username === 'shyamkeshri' && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleUnlock('Password123!')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                >
                  Quick-Unlock Demo Vault (Password123!)
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger)',
            fontSize: '0.78rem',
            marginBottom: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Drag & Drop Area */}
          <div
            style={{
              border: '2px dashed var(--border-regular)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem 1rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              marginBottom: '1.25rem',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <input
              type="file"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%'
              }}
            />
            <UploadCloud size={28} style={{ color: 'var(--accent)', margin: '0 auto 0.5rem auto' }} />
            {file ? (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB • Ready for AES-256 encryption
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Click or drag files here to encrypt
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Supports PDF, PNG, JPG, DOCX, JSON, or any binary record (Max 50MB)
                </div>
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Star Health Comprehensive Schedule 2026"
              className="input-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-control"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Policy / Record Identifier</label>
              <input
                type="text"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="e.g. POL-99214"
                className="input-control"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="input-group">
              <label className="input-label">Insurer or Issuer</label>
              <input
                type="text"
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
                placeholder="e.g. HDFC Ergo / Govt of India"
                className="input-control"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Expiry or Renewal Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="input-control"
              />
            </div>
          </div>

          <div style={{
            padding: '0.65rem 0.75rem',
            backgroundColor: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.72rem',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1.25rem'
          }}>
            <Lock size={13} />
            <span>Files are encrypted in browser memory with AES-256-GCM prior to transfer.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={encrypting}
              className="btn btn-primary"
            >
              {encrypting ? 'Encrypting & Storing...' : 'Encrypt & Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
