import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Palette,
  Bell,
  Clock,
  KeyRound,
  LogOut,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import ExpiryAlertsManager from '../components/ExpiryAlertsManager';
import ActivityLogPage from './ActivityLogPage';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { emergencyStatus, updateEmergencySettings } = useVault();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'reminders' | 'audit'

  const [nomineeName, setNomineeName] = useState(user?.nominee?.name || 'Priya Keshri');
  const [nomineeEmail, setNomineeEmail] = useState(user?.nominee?.email || 'priya.k@example.com');
  const [nomineePhone, setNomineePhone] = useState(user?.nominee?.phone || '+91 98765 43210');
  const [intervalDays, setIntervalDays] = useState(user?.checkin_interval_days || 30);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedSalt, setCopiedSalt] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateEmergencySettings({
        switch_enabled: true,
        checkin_interval_days: intervalDays,
        nominee_name: nomineeName,
        nominee_email: nomineeEmail,
        nominee_phone: nomineePhone
      });
      setMessage('Settings updated and synced successfully.');
    } catch (err) {
      setMessage(`Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyVaultSalt = () => {
    if (user?.vault_salt) {
      navigator.clipboard.writeText(user.vault_salt);
      setCopiedSalt(true);
      setTimeout(() => setCopiedSalt(false), 2000);
    }
  };

  return (
    <div className="page-container">
      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('profile')}
          className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <User size={14} />
          <span>Profile & Vault Encryption</span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`btn btn-sm ${activeTab === 'reminders' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <Bell size={14} />
          <span>Smart Expiry & Email Reminders</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <History size={14} />
          <span>Security Audit Log</span>
        </button>
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {message && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: message.includes('failed') ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
              color: message.includes('failed') ? 'var(--status-danger)' : 'var(--status-success)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle size={15} />
              <span>{message}</span>
            </div>
          )}

          {/* Account Profile Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} style={{ color: 'var(--accent)' }} />
                <h3 className="card-title">Custodian Identity</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '600px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Normalized Username</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>@{user?.username}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered Email</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Cryptographic Salt Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={16} style={{ color: 'var(--accent)' }} />
                <h3 className="card-title">Cryptographic Vault Salt</h3>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Used in client-side PBKDF2-HMAC-SHA256 (100,000 iterations) derivation. Publicly safe to view; necessary for manual offline recovery tools.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '600px' }}>
              <input
                type="text"
                readOnly
                value={user?.vault_salt || ''}
                className="input-control"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', backgroundColor: 'var(--bg-surface)' }}
              />
              <button
                type="button"
                onClick={copyVaultSalt}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                {copiedSalt ? <Check size={14} style={{ color: 'var(--status-success)' }} /> : <Copy size={14} />}
                <span>{copiedSalt ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Nominee & Heartbeat Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} style={{ color: 'var(--status-warning)' }} />
                <h3 className="card-title">Emergency Access & Nominee Defaults</h3>
              </div>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="input-label">Authorized Nominee Name</label>
                  <input
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    className="input-control"
                  />
                </div>
                <div>
                  <label className="input-label">Nominee Email Address</label>
                  <input
                    type="email"
                    value={nomineeEmail}
                    onChange={(e) => setNomineeEmail(e.target.value)}
                    className="input-control"
                  />
                </div>
                <div>
                  <label className="input-label">Nominee Phone</label>
                  <input
                    type="text"
                    value={nomineePhone}
                    onChange={(e) => setNomineePhone(e.target.value)}
                    className="input-control"
                  />
                </div>
              </div>

              <div className="input-group" style={{ maxWidth: '280px', marginBottom: '1.25rem' }}>
                <label className="input-label">Dead Man's Switch Timeout Interval</label>
                <select
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value))}
                  className="input-control"
                >
                  <option value="1">1 Day (Test Simulation)</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  {saving ? 'Updating...' : 'Save Emergency Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Session Security */}
          <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogOut size={16} style={{ color: 'var(--status-danger)' }} />
                <h3 className="card-title" style={{ color: 'var(--status-danger)' }}>Session Security</h3>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Terminating the session permanently flushes the in-memory AES-256-GCM vault key from browser memory.
            </p>

            <button onClick={logout} className="btn btn-danger btn-sm">
              <LogOut size={13} />
              <span>Lock Vault & Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <ExpiryAlertsManager />
      )}

      {activeTab === 'audit' && (
        <ActivityLogPage />
      )}
    </div>
  );
}
