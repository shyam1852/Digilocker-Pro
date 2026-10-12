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
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { emergencyStatus, updateEmergencySettings } = useVault();

  const [nomineeName, setNomineeName] = useState(user?.nominee?.name || 'Priya Keshri');
  const [nomineeEmail, setNomineeEmail] = useState(user?.nominee?.email || 'priya.k@example.com');
  const [nomineePhone, setNomineePhone] = useState(user?.nominee?.phone || '+91 98765 43210');
  const [intervalDays, setIntervalDays] = useState(user?.checkin_interval_days || 30);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState(true);

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
    <div className="page-container" style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Account Settings & Cryptographic Preferences
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Manage authenticated identity, zero-knowledge vault parameters, and recovery nominees
        </p>
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

      {/* Account Profile Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="card-title">Identity & Vault Credentials</h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="input-label">Unique Username (Immutable Identifier)</label>
            <input
              type="text"
              value={`@${user?.username || 'shyamkeshri'}`}
              disabled
              className="input-control"
              style={{ backgroundColor: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Enforced unique constraint in SQLite: <code>{user?.normalized_username}</code>
            </span>
          </div>

          <div>
            <label className="input-label">Registered Account Email</label>
            <input
              type="email"
              value={user?.email || 'shyam.keshri@dmlocker.internal'}
              disabled
              className="input-control"
              style={{ backgroundColor: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Used for critical recovery notifications
            </span>
          </div>
        </div>

        {/* Cryptographic Vault Salt */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '0.85rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              PBKDF2 Client Vault Salt
            </div>
            <button onClick={copyVaultSalt} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
              {copiedSalt ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedSalt ? 'Copied' : 'Copy Salt'}</span>
            </button>
          </div>
          <code style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            wordBreak: 'break-all'
          }}>
            {user?.vault_salt || '36df3c646d99cd19507328ce00ef9ff9'}
          </code>
        </div>
      </div>

      {/* Theme & Visual Appearance Preference */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="card-title">Theme & Appearance</h3>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Choose your interface theme. Your preference is preserved across devices and synchronized to your account profile.
        </p>

        <div style={{ maxWidth: '280px' }}>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Emergency Nominee Configuration */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="card-title">Designated Nominee & Escrow Parameters</h3>
          </div>
        </div>

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="input-label">Nominee Full Name</label>
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
              <label className="input-label">Nominee Phone (SMS alerts)</label>
              <input
                type="text"
                value={nomineePhone}
                onChange={(e) => setNomineePhone(e.target.value)}
                className="input-control"
              />
            </div>
          </div>

          <div className="input-group" style={{ maxWidth: '260px', marginBottom: '1.25rem' }}>
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
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Updating...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Security Actions & Logout */}
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
  );
}
