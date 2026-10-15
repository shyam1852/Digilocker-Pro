import React from 'react';
import {
  Shield,
  ShieldCheck,
  Flame,
  Lock,
  RotateCcw,
  History,
  FileCheck2,
  ArrowRight,
  Terminal,
  AlertTriangle,
  Layers,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

export default function LandingPage({ onGoToAuth }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Navigation Bar */}
      <header style={{
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Shield size={20} strokeWidth={2.4} />
          </div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              PHOENIX
            </span>
            <span style={{ fontSize: '0.7rem', marginLeft: '0.4rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
              VAULT
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onGoToAuth(false)}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid var(--border-regular)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => onGoToAuth(true)}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-inverse)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Create Vault Account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '4rem 1.5rem',
        maxWidth: '960px',
        margin: '0 auto',
        textAlign: 'center',
        flex: 1
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.85rem',
          borderRadius: '999px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--status-danger)',
          fontSize: '0.75rem',
          fontWeight: 700,
          marginBottom: '1.5rem',
          letterSpacing: '0.05em'
        }}>
          <Flame size={14} />
          <span>BREACH REHEARSAL & RECOVERY PROOF</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          margin: '0 0 1.25rem 0',
          color: 'var(--text-primary)'
        }}>
          The Self-Defending Document Vault
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: '720px',
          margin: '0 auto 2.5rem auto'
        }}>
          Store confidential files with client-side AES-256-GCM zero-knowledge encryption, detect storage tampering with canonical SHA-256 manifests, and mathematically prove recovery readiness through automated breach rehearsals.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onGoToAuth(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1.75rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)'
            }}
          >
            <span>Enter Secure Vault</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => onGoToAuth(false, true)}
            style={{
              padding: '0.85rem 1.5rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-regular)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Launch Demo Enclave
          </button>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section style={{
        padding: '3rem 1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Pillar 1 */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--status-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Lock size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              Zero-Knowledge AES-256-GCM
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Files are encrypted in browser memory with PBKDF2 (100,000 rounds) before transmission. Decryption keys never touch the server or persistent storage.
            </p>
          </div>

          {/* Pillar 2 */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--status-info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              Canonical Manifests (RFC 8785)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Tamper-evident verification recalculates SHA-256 digests and validates HMAC-SHA256 signatures against an isolated signing authority to catch any storage mutation.
            </p>
          </div>

          {/* Pillar 3 */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--status-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Flame size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              Breach Rehearsal & Recovery Proof
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Controlled adversarial breach drills execute live content tampering, metadata forgery, and credential containment demonstrations with verifiable recovery proof.
            </p>
          </div>
        </div>
      </section>

      {/* Security Limitations Section */}
      <section style={{
        padding: '2rem 1.5rem 4rem 1.5rem',
        maxWidth: '960px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={18} color="var(--status-warning)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-warning)', margin: 0 }}>
              Transparent Security Limitations
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 0.5rem 0' }}>
            PHOENIX is built on honest cryptographic boundaries. It does not claim protection against compromised client endpoints (e.g. keyloggers in browser extensions) or loss of user master passphrases. Rehearsals run on isolated dummy assets and verify the application's actual cryptographic and recovery code paths.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        PHOENIX — The Self-Defending Document Vault • Zero-Knowledge Cryptography Enclave
      </footer>
    </div>
  );
}
