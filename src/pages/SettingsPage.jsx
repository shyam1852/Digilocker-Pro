import React, { useState, useEffect } from 'react';
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
  History,
  Trash2,
  Lock,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import ExpiryAlertsManager from '../components/ExpiryAlertsManager';

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const { emergencyStatus, updateEmergencySettings } = useVault();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'keys' | 'reminders' | 'danger'

  // Profile Form
  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Emergency Form
  const [nomineeName, setNomineeName] = useState(user?.nominee?.name || 'Priya Keshri');
  const [nomineeEmail, setNomineeEmail] = useState(user?.nominee?.email || 'priya.k@example.com');
  const [nomineePhone, setNomineePhone] = useState(user?.nominee?.phone || '+91 98765 43210');
  const [intervalDays, setIntervalDays] = useState(user?.checkin_interval_days || 30);
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState('');

  // Key Metadata State
  const [keys, setKeys] = useState([]);
  const [copiedSalt, setCopiedSalt] = useState(false);

  // Account Deletion State
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/keys/metadata', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.keys) setKeys(data.keys);
      })
      .catch(() => {});
  }, [token]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ display_name: displayName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');
      setProfileMsg('Profile display name updated successfully.');
    } catch (err) {
      setProfileMsg(`Update failed: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmergency = async (e) => {
    e.preventDefault();
    setSavingEmergency(true);
    setEmergencyMsg('');
    try {
      await updateEmergencySettings({
        switch_enabled: true,
        checkin_interval_days: intervalDays,
        nominee_name: nomineeName,
        nominee_email: nomineeEmail,
        nominee_phone: nomineePhone
      });
      setEmergencyMsg('Emergency preferences updated and synced successfully.');
    } catch (err) {
      setEmergencyMsg(`Update failed: ${err.message}`);
    } finally {
      setSavingEmergency(false);
    }
  };

  const copyVaultSalt = () => {
    if (user?.vault_salt) {
      navigator.clipboard.writeText(user.vault_salt);
      setCopiedSalt(true);
      setTimeout(() => setCopiedSalt(false), 2000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE_MY_ACCOUNT') {
      setDeleteError('Please type "DELETE_MY_ACCOUNT" to confirm.');
      return;
    }

    setDeletingAccount(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ confirmation: deleteConfirmation })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed.');
      logout();
    } catch (err) {
      setDeleteError(err.message);
      setDeletingAccount(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('profile')}
          className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem' }}
        >
          <User size={14} />
          <span>Profile & Custodian Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('keys')}
          className={`btn btn-sm ${activeTab === 'keys' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem' }}
        >
          <KeyRound size={14} />
          <span>Encryption Keys & Trust Model</span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`btn btn-sm ${activeTab === 'reminders' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem' }}
        >
          <Bell size={14} />
          <span>Notifications & Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('danger')}
          className={`btn btn-sm ${activeTab === 'danger' ? 'btn-danger' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem' }}
        >
          <Trash2 size={14} />
          <span>Account Termination</span>
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {profileMsg && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: profileMsg.includes('failed') ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
              color: profileMsg.includes('failed') ? 'var(--status-danger)' : 'var(--status-success)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem'
            }}>
              {profileMsg}
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
              Custodian Profile Details
            </h3>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
              <div>
                <label className="input-label">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="input-control"
                  placeholder="Enter display name"
                />
              </div>

              <div>
                <label className="input-label">Username (Immutable)</label>
                <input
                  type="text"
                  readOnly
                  value={`@${user?.username || ''}`}
                  className="input-control"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                />
              </div>

              <div>
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  readOnly
                  value={user?.email || ''}
                  className="input-control"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                />
              </div>

              <button type="submit" disabled={savingProfile} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
                {savingProfile ? 'Saving...' : 'Update Display Name'}
              </button>
            </form>
          </div>

          {/* Emergency Nominee Card */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
              Emergency Access & Nominee Settings
            </h3>
            {emergencyMsg && (
              <div style={{ padding: '0.5rem', marginBottom: '1rem', color: 'var(--status-success)', fontSize: '0.8rem' }}>
                {emergencyMsg}
              </div>
            )}
            <form onSubmit={handleSaveEmergency} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="input-label">Nominee Name</label>
                <input type="text" value={nomineeName} onChange={e => setNomineeName(e.target.value)} className="input-control" />
              </div>
              <div>
                <label className="input-label">Nominee Email</label>
                <input type="email" value={nomineeEmail} onChange={e => setNomineeEmail(e.target.value)} className="input-control" />
              </div>
              <div>
                <label className="input-label">Heartbeat Timeout Interval</label>
                <select value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))} className="input-control">
                  <option value="1">1 Day (Test Simulation)</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={savingEmergency} className="btn btn-primary btn-sm">
                  {savingEmergency ? 'Saving...' : 'Save Emergency Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Keys & Cryptographic Guidance */}
      {activeTab === 'keys' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key Inventory */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              Active Cryptographic Keys Inventory
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Zero-knowledge architecture inventory. Raw encryption keys are never stored on the server or transmitted over the wire.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {keys.map(k => (
                <div
                  key={k.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Lock size={15} color="var(--accent)" />
                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{k.algorithm}</strong>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--status-success)'
                    }}>
                      {k.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{k.purpose}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location: {k.location}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Vault Salt */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              User Vault Cryptographic Salt
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
              Used in PBKDF2 (100,000 rounds) key derivation. Publicly safe to view; necessary for manual offline recovery tools.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '600px' }}>
              <input
                type="text"
                readOnly
                value={user?.vault_salt || ''}
                className="input-control"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--bg-surface)' }}
              />
              <button onClick={copyVaultSalt} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                {copiedSalt ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
                <span>{copiedSalt ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reminders */}
      {activeTab === 'reminders' && (
        <ExpiryAlertsManager />
      )}

      {/* Tab: Danger / Account Termination */}
      {activeTab === 'danger' && (
        <div className="card" style={{ border: '1px solid var(--status-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Trash2 size={20} color="var(--status-danger)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-danger)', margin: 0 }}>
              Permanent Account Termination
            </h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
            Terminating your account permanently purges your vault documents, version history, integrity manifests, rehearsal runs, and authentication credentials from the ledger. This action is <strong>irreversible</strong>.
          </p>

          {deleteError && (
            <div style={{ padding: '0.65rem', background: 'var(--status-danger-bg)', color: 'var(--status-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {deleteError}
            </div>
          )}

          <div style={{ maxWidth: '400px', marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Type <strong>DELETE_MY_ACCOUNT</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={e => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE_MY_ACCOUNT"
              className="input-control"
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount || deleteConfirmation !== 'DELETE_MY_ACCOUNT'}
            className="btn btn-danger btn-sm"
            style={{ opacity: deleteConfirmation === 'DELETE_MY_ACCOUNT' ? 1 : 0.5 }}
          >
            {deletingAccount ? 'Purging Account...' : 'Permanently Terminate Account'}
          </button>
        </div>
      )}
    </div>
  );
}
