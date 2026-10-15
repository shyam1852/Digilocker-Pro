import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, ArrowRight, UserCheck, KeyRound, ChevronLeft, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function AuthPage({ initialIsSignup = false, onBackToLanding }) {
  const { login, register } = useAuth();
  const [isSignup, setIsSignup] = useState(initialIsSignup);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [identifier, setIdentifier] = useState('');

  // UI / Error State
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const clearErrors = () => {
    setGeneralError('');
    setFieldErrors({});
  };

  const handleQuickDemoFill = () => {
    setIsSignup(false);
    clearErrors();
    setIdentifier('shyamkeshri');
    setPassword('Password123!');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetNewPass || resetNewPass.length < 8) {
      setResetMsg('Please provide your email and a password of at least 8 characters.');
      return;
    }
    setResetLoading(true);
    setResetMsg('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, new_password: resetNewPass })
      });
      const data = await res.json();
      setResetMsg(data.message || 'Password reset successfully.');
    } catch (err) {
      setResetMsg(`Error: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    if (!identifier.trim() || !password) {
      setGeneralError('Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setGeneralError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const trimmedUser = username.trim();
    const newFieldErrors = {};

    // 1. Frontend validation
    if (!trimmedUser) {
      newFieldErrors.username = 'Please choose a username.';
    } else if (trimmedUser.length < 3 || trimmedUser.length > 30) {
      newFieldErrors.username = 'Username must be between 3 and 30 characters.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUser)) {
      newFieldErrors.username = 'Only letters, numbers, underscores, and hyphens allowed.';
    }

    if (!email.trim()) {
      newFieldErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newFieldErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newFieldErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newFieldErrors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      newFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setLoading(true);
    try {
      await register(trimmedUser, email.trim(), password);
    } catch (err) {
      // Inline field error handling (especially username uniqueness)
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setGeneralError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      backgroundColor: 'var(--bg-app)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.25rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-mark" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)' }}>
              <Shield size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                PHOENIX
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                The Self-Defending Document Vault
              </div>
            </div>
          </div>
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-surface)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setIsSignup(false); clearErrors(); }}
            style={{
              flex: 1,
              padding: '0.45rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: !isSignup ? 'var(--bg-card)' : 'transparent',
              color: !isSignup ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: !isSignup ? 600 : 500,
              fontSize: '0.825rem',
              cursor: 'pointer',
              boxShadow: !isSignup ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignup(true); clearErrors(); }}
            style={{
              flex: 1,
              padding: '0.45rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: isSignup ? 'var(--bg-card)' : 'transparent',
              color: isSignup ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: isSignup ? 600 : 500,
              fontSize: '0.825rem',
              cursor: 'pointer',
              boxShadow: isSignup ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Global Error Banner */}
        {generalError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger)',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <AlertCircle size={16} />
            <span>{generalError}</span>
          </div>
        )}

        {/* Form Elements */}
        {!isSignup ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="login-identifier">Username or Email</label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. shyamkeshri"
                className="input-control"
                required
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" htmlFor="login-password">Master Passphrase</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot Passphrase?
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-control"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.65rem' }}
            >
              {loading ? 'Decrypting Vault Key...' : 'Unlock Vault'}
              {!loading && <ArrowRight size={15} />}
            </button>

            {/* Quick Demo Fill Button */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
              >
                <KeyRound size={13} />
                Quick-Fill Demo Account (@shyamkeshri)
              </button>
            </div>
          </form>
        ) : (
          /* REGISTRATION FORM (Strict Unique Username Enforcement) */
          <form onSubmit={handleSignupSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-username">
                Username <span style={{ color: 'var(--text-muted)' }}>(Case-insensitive unique handle)</span>
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors({ ...fieldErrors, username: null });
                  }
                }}
                placeholder="e.g. shyamkeshri"
                className={`input-control ${fieldErrors.username ? 'error' : ''}`}
                required
              />
              {/* Mandatory Exact Inline Error Display */}
              {fieldErrors.username && (
                <div className="input-error-text" role="alert">
                  <AlertCircle size={13} />
                  <span>{fieldErrors.username}</span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-email">Email Address</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors({ ...fieldErrors, email: null });
                  }
                }}
                placeholder="you@domain.com"
                className={`input-control ${fieldErrors.email ? 'error' : ''}`}
                required
              />
              {fieldErrors.email && (
                <div className="input-error-text" role="alert">
                  <AlertCircle size={13} />
                  <span>{fieldErrors.email}</span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-password">
                Master Passphrase <span style={{ color: 'var(--text-muted)' }}>(Min. 8 characters)</span>
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`input-control ${fieldErrors.password ? 'error' : ''}`}
                required
              />
              {fieldErrors.password && (
                <div className="input-error-text" role="alert">
                  <AlertCircle size={13} />
                  <span>{fieldErrors.password}</span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="signup-confirm-password">Confirm Master Passphrase</label>
              <input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`input-control ${fieldErrors.confirmPassword ? 'error' : ''}`}
                required
              />
              {fieldErrors.confirmPassword && (
                <div className="input-error-text" role="alert">
                  <AlertCircle size={13} />
                  <span>{fieldErrors.confirmPassword}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.65rem' }}
            >
              {loading ? 'Initializing Client Vault...' : 'Create Encrypted Vault'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        )}

        {/* Security Disclosure Notice */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.75rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start',
          border: '1px solid var(--border-subtle)'
        }}>
          <Lock size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
          <div>
            <strong>Zero-Knowledge Architecture:</strong> Your master passphrase derives a 256-bit AES-GCM vault key locally in your browser using PBKDF2 (100,000 iterations). Your raw passphrase is never transmitted or stored.
          </div>
        </div>

        {/* Bottom Theme Switcher on Auth Page */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Appearance Theme
          </span>
          <ThemeSwitcher style={{ width: '220px' }} />
        </div>
      </div>

      {/* Reset Passphrase Modal */}
      {showResetModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              width: '100%',
              maxWidth: '420px',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Reset Vault Passphrase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowResetModal(false); setResetMsg(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              Enter your registered email address and define a new Master Passphrase. This updates your account credentials in the vault ledger.
            </p>

            {resetMsg && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: resetMsg.includes('success') ? 'rgba(16,185,129,0.1)' : 'var(--status-danger-bg)',
                color: resetMsg.includes('success') ? 'var(--status-success, #10b981)' : 'var(--status-danger)',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                border: '1px solid var(--border-subtle)'
              }}>
                {resetMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label className="input-label" htmlFor="reset-email">Registered Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="e.g. shyam@example.com"
                  className="input-control"
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label className="input-label" htmlFor="reset-password">New Passphrase (Min 8 chars)</label>
                <input
                  id="reset-password"
                  type="password"
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-control"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setResetMsg(''); }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn btn-primary btn-sm"
                >
                  {resetLoading ? 'Resetting...' : 'Update Passphrase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
