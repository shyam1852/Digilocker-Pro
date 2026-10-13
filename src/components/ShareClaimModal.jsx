import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Eye,
  Laptop,
  Smartphone,
  Globe,
  Download,
  RotateCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ShareClaimModal({ document: doc, isOpen, onClose, onShareCreated }) {
  const { token: authToken } = useAuth();

  const [claimType, setClaimType] = useState('expiry_date');
  const [purpose, setPurpose] = useState('Healthcare / Hospital TPA Verification');
  const [ttlSeconds, setTtlSeconds] = useState(300); // 5 minutes

  const [generating, setGenerating] = useState(false);
  const [generatedShare, setGeneratedShare] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Configurable Frontend Base URL State
  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const envBaseUrl = (import.meta.env.VITE_FRONTEND_BASE_URL || '').trim();
  const savedBaseUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('dmlocker_qr_base_url') : null;

  const [baseUrl, setBaseUrl] = useState(savedBaseUrl || envBaseUrl || defaultOrigin);
  const [lanUrl, setLanUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrGenerating, setQrGenerating] = useState(false);

  // Fetch host network interfaces (LAN IP) for seamless phone scanning over Wi-Fi
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/system/network-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.suggestedLanUrl) {
          setLanUrl(data.suggestedLanUrl);
          // If the user hasn't explicitly chosen a custom URL and current origin is localhost,
          // suggest LAN URL option prominently
        }
      })
      .catch(() => {
        // Fallback silently if offline
      });
  }, [isOpen]);

  // Clean trailing slash from base URL
  const cleanBaseUrl = (baseUrl || defaultOrigin).replace(/\/+$/, '');

  // Full verification URL encoded in the QR code
  const verifierUrl = generatedShare
    ? `${cleanBaseUrl}/verify?token=${generatedShare.token}`
    : '';

  // Generate genuine, scannable QR code using the 'qrcode' library whenever verifierUrl changes
  useEffect(() => {
    if (!verifierUrl) {
      setQrDataUrl('');
      return;
    }

    let isSubscribed = true;
    setQrGenerating(true);

    QRCode.toDataURL(verifierUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a', // Deep slate for high contrast scannability
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (isSubscribed) {
          setQrDataUrl(url);
          setQrGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate genuine QR code:', err);
        if (isSubscribed) {
          setError('Failed to render genuine QR code: ' + err.message);
          setQrGenerating(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [verifierUrl]);

  if (!isOpen || !doc) return null;

  // Resolve claim value based on type
  const getClaimValue = (type) => {
    switch (type) {
      case 'expiry_date':
        return doc.expiry_date || '2027-10-15';
      case 'status':
        return doc.status === 'active' ? 'Active & In Good Standing' : 'Expiring Soon';
      case 'insurer':
        return doc.insurer_name || 'Underwriter Schedule';
      case 'category':
        return doc.category || 'General Document';
      default:
        return 'Verified Document Claim';
    }
  };

  const claimValue = getClaimValue(claimType);

  const handleBaseUrlChange = (newUrl) => {
    setBaseUrl(newUrl);
    try {
      localStorage.setItem('dmlocker_qr_base_url', newUrl);
    } catch {}
  };

  const handleGenerateQr = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/shares/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          document_id: doc.id,
          claim_type: claimType,
          claim_value: claimValue,
          purpose,
          ttl_seconds: Number(ttlSeconds)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create share token');
      }

      const data = await res.json();
      setGeneratedShare(data);
      if (onShareCreated) onShareCreated();
    } catch (err) {
      setError(err.message || 'Failed to generate one-time share');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (!verifierUrl) return;
    navigator.clipboard.writeText(verifierUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `dm-locker-qr-${doc.policy_number || 'claim'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-mark" style={{ width: '32px', height: '32px' }}>
              <QrCode size={16} />
            </div>
            <div>
              <h2 className="modal-title">One-Time Selective QR Sharing</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Genuine Scannable QR • Replay Protected • Zero PDF Exposure
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

        {error && (
          <div
            style={{
              padding: '0.65rem',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              marginBottom: '1rem',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}
          >
            {error}
          </div>
        )}

        {/* Configuration Bar: Target Frontend Base URL */}
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1rem',
            fontSize: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Frontend Base URL (Network Routing)
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              Determines where the QR points
            </span>
          </div>

          {/* Quick Preset Selector Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleBaseUrlChange('http://localhost:5173')}
              className={`btn btn-sm ${cleanBaseUrl === 'http://localhost:5173' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
              title="Use for local testing in browser on this laptop"
            >
              <Laptop size={12} />
              <span>Localhost (Laptop)</span>
            </button>

            {lanUrl && (
              <button
                type="button"
                onClick={() => handleBaseUrlChange(lanUrl)}
                className={`btn btn-sm ${cleanBaseUrl === lanUrl ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                title="Use to scan with your physical phone camera on the same Wi-Fi"
              >
                <Smartphone size={12} />
                <span>Wi-Fi / Phone ({lanUrl.replace('http://', '').replace(':5173', '')})</span>
              </button>
            )}

            {envBaseUrl && envBaseUrl !== 'http://localhost:5173' && envBaseUrl !== lanUrl && (
              <button
                type="button"
                onClick={() => handleBaseUrlChange(envBaseUrl)}
                className={`btn btn-sm ${cleanBaseUrl === envBaseUrl ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                title="Use configured public/production HTTPS domain"
              >
                <Globe size={12} />
                <span>Configured Domain</span>
              </button>
            )}
          </div>

          {/* Editable Base URL Control */}
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="e.g. http://192.168.1.10:5173 or https://app.dmlocker.pro"
            className="input-control"
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.6rem',
              fontFamily: 'var(--font-mono)'
            }}
          />
        </div>

        {!generatedShare ? (
          <div>
            {/* Target Document Summary */}
            <div
              style={{
                padding: '0.75rem 0.85rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-regular)',
                marginBottom: '1rem'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Source Vault Record
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {doc.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {doc.category} • Policy ID: {doc.policy_number || 'Confidential'}
              </div>
            </div>

            {/* Claim Selection */}
            <div className="input-group">
              <label className="input-label">Select Specific Claim to Disclose</label>
              <select
                value={claimType}
                onChange={(e) => setClaimType(e.target.value)}
                className="input-control"
              >
                <option value="expiry_date">Validity & Expiry Date ({doc.expiry_date || '2027-10-15'})</option>
                <option value="status">Policy Active Status (Active & In Good Standing)</option>
                <option value="insurer">Underwriting Entity ({doc.insurer_name || 'Underwriter'})</option>
                <option value="category">Category Classification ({doc.category})</option>
              </select>
            </div>

            {/* Purpose & Window */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Audience / Purpose Binding</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Traffic Police or Hospital TPA"
                  className="input-control"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Validity Lifetime (TTL)</label>
                <select
                  value={ttlSeconds}
                  onChange={(e) => setTtlSeconds(Number(e.target.value))}
                  className="input-control"
                >
                  <option value={300}>5 Minutes (Recommended)</option>
                  <option value={900}>15 Minutes</option>
                  <option value={3600}>1 Hour</option>
                </select>
              </div>
            </div>

            {/* Selective Disclosure Preview */}
            <div
              style={{
                padding: '0.85rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Eye size={14} />
                <span>Exact Disclosure Preview (Zero Other Data Shared)</span>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <strong>Claim Disclosed:</strong> {claimType.replace('_', ' ').toUpperCase()} &rarr;{' '}
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{claimValue}</span>
                </div>
                <div>
                  <strong>Purpose:</strong> {purpose}
                </div>
                <div style={{ color: 'var(--status-danger)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                  &bull; Original PDF, document bytes, encryption key, and personal ID will NOT be revealed.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateQr}
                disabled={generating}
                className="btn btn-primary"
              >
                {generating ? 'Generating QR...' : 'Generate One-Time QR'}
              </button>
            </div>
          </div>
        ) : (
          /* Generated Genuine Share QR View */
          <div style={{ textAlign: 'center' }}>
            {/* Genuine Scannable QR Code Frame */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                display: 'inline-block',
                margin: '0 auto 0.75rem auto',
                border: '2px solid var(--border-regular)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
            >
              {qrGenerating || !qrDataUrl ? (
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: '#64748b'
                  }}
                >
                  <RotateCw size={24} className="animate-spin" />
                  <span style={{ fontSize: '0.75rem' }}>Encoding genuine QR...</span>
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt="One-Time Selective Claim QR Code"
                  width="200"
                  height="200"
                  style={{
                    display: 'block',
                    imageRendering: 'pixelated',
                    borderRadius: '4px'
                  }}
                />
              )}
            </div>

            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Genuine One-Time Scannable QR Ready
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Expires in {Math.round(ttlSeconds / 60)} minutes • Not consumed on scan • Consumed only on verification
            </div>

            {/* Encoded URL Display with Copy Action */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '0.85rem'
              }}
            >
              <input
                type="text"
                readOnly
                value={verifierUrl}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={copyLink}
                className="btn btn-secondary btn-sm"
                title="Copy full verification link to clipboard"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Truthful Verifier Warning Banner */}
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                marginBottom: '1rem'
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: '#ca8a04',
                  marginBottom: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <AlertTriangle size={13} />
                <span>Truthful Verifier Note:</span>
              </div>
              The verifier will be informed that this claim is document-derived, not certified by an official root institutional key. Single-use replay protection is active.
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => window.open(verifierUrl, '_blank', 'noopener,noreferrer')}
                className="btn btn-primary btn-sm"
                title="Open verifier page in a new window"
              >
                <ExternalLink size={13} />
                <span>Open in Verifier Window</span>
              </button>

              <button
                type="button"
                onClick={downloadQrCode}
                className="btn btn-secondary btn-sm"
                title="Download QR code image as PNG"
              >
                <Download size={13} />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
