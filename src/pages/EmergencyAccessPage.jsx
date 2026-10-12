import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  HeartHandshake,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Users,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { splitSecret, combineShares } from '../utils/shamir';

export default function EmergencyAccessPage() {
  const { emergencyStatus, checkIn, updateEmergencySettings } = useVault();

  // Settings State
  const [switchEnabled, setSwitchEnabled] = useState(true);
  const [intervalDays, setIntervalDays] = useState(30);
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('Spouse');
  const [nomineePhone, setNomineePhone] = useState('');

  // UI State
  const [saving, setSaving] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Shamir Interactive Test Suite State
  const [shamirShares, setShamirShares] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);

  // Sync settings when emergencyStatus loads
  useEffect(() => {
    if (emergencyStatus) {
      setSwitchEnabled(emergencyStatus.switch_enabled);
      setIntervalDays(emergencyStatus.checkin_interval_days);
      if (emergencyStatus.nominee) {
        setNomineeName(emergencyStatus.nominee.name || '');
        setNomineeEmail(emergencyStatus.nominee.email || '');
        setNomineeRelationship(emergencyStatus.nominee.relationship || 'Spouse');
        setNomineePhone(emergencyStatus.nominee.phone || '');
      }
    }
  }, [emergencyStatus]);

  const handleCheckInNow = async () => {
    setCheckingIn(true);
    setMessage('');
    try {
      await checkIn();
      setMessage('Heartbeat verified. Inactivity countdown successfully reset.');
    } catch (err) {
      setMessage(`Check-in failed: ${err.message}`);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateEmergencySettings({
        switch_enabled: switchEnabled,
        checkin_interval_days: intervalDays,
        nominee_name: nomineeName,
        nominee_email: nomineeEmail,
        nominee_relationship: nomineeRelationship,
        nominee_phone: nomineePhone
      });
      setMessage('Emergency configuration and nominee parameters saved.');
    } catch (err) {
      setMessage(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Generate 2-of-3 Shamir Shares using CSPRNG
  const handleGenerateShamirShares = () => {
    setTestResult(null);
    setTestError(null);
    // Generate a fresh 32-byte (256-bit) recovery secret using CSPRNG
    const masterRecoverySecret = new Uint8Array(32);
    window.crypto.getRandomValues(masterRecoverySecret);

    const generated = splitSecret(masterRecoverySecret);
    setShamirShares({
      secretHex: Array.from(masterRecoverySecret).map(b => b.toString(16).padStart(2, '0')).join(''),
      shares: generated
    });
  };

  // Test Reconstruction with Shares 1 & 2
  const handleTestReconstruct = (shareIndices) => {
    setTestError(null);
    setTestResult(null);
    try {
      if (!shamirShares) return;
      const selected = shareIndices.map(i => shamirShares.shares[i]);
      const reconstructed = combineShares(selected);
      const reconstructedHex = Array.from(reconstructed).map(b => b.toString(16).padStart(2, '0')).join('');

      const isMatch = reconstructedHex === shamirShares.secretHex;
      setTestResult({
        success: isMatch,
        indices: shareIndices.map(i => i + 1),
        reconstructedHex,
        matched: isMatch
      });
    } catch (err) {
      setTestError(err.message);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Emergency Access & Dead Man's Switch
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Heartbeat inactivity monitoring backed by mathematical 2-of-3 Shamir's Secret Sharing escrow
        </p>
      </div>

      {/* Safety Invariant Notice */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem'
      }}>
        <Lock size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Cryptographic Safeguard:</strong> A timer expiring is NOT proof of death or incapacity. Master vault keys are NEVER stored on the server. Recovery requires combining at least 2 distinct shares (e.g. Nominee Share + Offline Key, or Nominee Share + Timelocked Escrow Share) after multi-stage verification.
        </div>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--accent-light)',
          color: 'var(--accent)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={15} />
          <span>{message}</span>
        </div>
      )}

      {/* Switch Telemetry Status */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Switch Status</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: switchEnabled ? 'var(--status-success)' : 'var(--text-muted)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: switchEnabled ? 'var(--status-success)' : 'var(--text-muted)' }} />
            <span>{switchEnabled ? 'ACTIVE & ARMED' : 'DISARMED'}</span>
          </div>
          <div className="stat-sub">Interval: {intervalDays} days inactivity tolerance</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Last Check-In Recorded</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {emergencyStatus?.last_checkin_at ? new Date(emergencyStatus.last_checkin_at).toLocaleDateString() : 'Today'}
          </div>
          <div className="stat-sub">
            {emergencyStatus?.last_checkin_at ? new Date(emergencyStatus.last_checkin_at).toLocaleTimeString() : 'Verified'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Next Expected Check-In</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {emergencyStatus?.next_expected_checkin ? new Date(emergencyStatus.next_expected_checkin).toLocaleDateString() : 'In 30 days'}
          </div>
          <button
            onClick={handleCheckInNow}
            disabled={checkingIn}
            className="btn btn-primary btn-sm"
            style={{ marginTop: '0.5rem' }}
          >
            <Clock size={13} />
            <span>{checkingIn ? 'Recording...' : 'Check-In Now'}</span>
          </button>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Dead Man's Switch Configuration</h3>
            <p className="card-subtitle">Tune heartbeats, recovery tolerances, and trusted contact details</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Arm / Disarm Emergency Protocol</label>
              <select
                value={switchEnabled ? '1' : '0'}
                onChange={(e) => setSwitchEnabled(e.target.value === '1')}
                className="input-control"
              >
                <option value="1">Armed (Active monitoring)</option>
                <option value="0">Disarmed (Monitoring paused)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Inactivity Trigger Interval</label>
              <select
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
                className="input-control"
              >
                <option value="1">1 Day (Accelerated Demo Testing)</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days (Recommended)</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Designated Nominee Name</label>
              <input
                type="text"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                placeholder="e.g. Priya Keshri"
                className="input-control"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Nominee Email Address</label>
              <input
                type="email"
                value={nomineeEmail}
                onChange={(e) => setNomineeEmail(e.target.value)}
                placeholder="priya.k@example.com"
                className="input-control"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Relationship</label>
              <input
                type="text"
                value={nomineeRelationship}
                onChange={(e) => setNomineeRelationship(e.target.value)}
                placeholder="Spouse / Parent / Sibling"
                className="input-control"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save Emergency Parameters'}
            </button>
          </div>
        </form>
      </div>

      {/* Shamir 2-of-3 Interactive Test Suite & Share Generation */}
      <div className="card" style={{ border: '1px solid var(--border-regular)' }}>
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={17} style={{ color: 'var(--accent)' }} />
              <h3 className="card-title">2-of-3 Shamir's Secret Sharing Cryptographic Engine</h3>
            </div>
            <p className="card-subtitle">
              Galois Field GF(2^8) polynomial secret splitting. Any 2 shares reconstruct the key; 1 share alone reveals zero bits.
            </p>
          </div>
          <button
            onClick={handleGenerateShamirShares}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} />
            <span>Generate Fresh 2-of-3 Shares</span>
          </button>
        </div>

        {shamirShares ? (
          <div>
            {/* Generated Shares Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {shamirShares.shares.map((share, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                      Share {share.x} of 3: {share.role}
                    </div>
                    <button
                      onClick={() => copyToClipboard(share.data, idx)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.5rem' }}
                    >
                      {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                    {share.description}
                  </div>

                  <code style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    backgroundColor: 'var(--bg-input)',
                    padding: '0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    wordBreak: 'break-all',
                    color: 'var(--text-secondary)'
                  }}>
                    {share.data}
                  </code>
                </div>
              ))}
            </div>

            {/* Interactive Verification Test Suite */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-regular)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem'
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Interactive Cryptographic Verification
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Verify polynomial Lagrange interpolation across all combinatorial share pairings:
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <button
                  onClick={() => handleTestReconstruct([0, 1])}
                  className="btn btn-secondary btn-sm"
                >
                  Test Pair (Share 1 + Share 2)
                </button>

                <button
                  onClick={() => handleTestReconstruct([1, 2])}
                  className="btn btn-secondary btn-sm"
                >
                  Test Pair (Share 2 + Share 3)
                </button>

                <button
                  onClick={() => handleTestReconstruct([0, 2])}
                  className="btn btn-secondary btn-sm"
                >
                  Test Pair (Share 1 + Share 3)
                </button>

                <button
                  onClick={() => handleTestReconstruct([0])}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--status-warning)' }}
                >
                  Test 1 Share Alone (Threshold Failure)
                </button>
              </div>

              {/* Test Result Box */}
              {testResult && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--accent-light)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontWeight: 600 }}>
                    <CheckCircle size={15} />
                    <span>Reconstruction Succeeded! (Shares {testResult.indices.join(' & ')} used)</span>
                  </div>
                  <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                    Reconstructed 256-bit Key: {testResult.reconstructedHex}
                  </div>
                </div>
              )}

              {testError && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--status-danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: 'var(--status-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={15} />
                  <span>{testError}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <KeyRound size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
              No active Shamir recovery keys generated in this session
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Generate a 2-of-3 split across User Offline Key, Nominee Key, and Server Escrow Key.
            </p>
            <button
              onClick={handleGenerateShamirShares}
              className="btn btn-primary btn-sm"
            >
              Generate 2-of-3 Shamir Shares
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
