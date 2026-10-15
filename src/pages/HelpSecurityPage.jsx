import React from 'react';
import {
  HelpCircle,
  ShieldCheck,
  Lock,
  RotateCcw,
  Flame,
  AlertTriangle,
  Key,
  FileCode,
  Layers,
  Database,
  CheckCircle2
} from 'lucide-react';

export default function HelpSecurityPage() {
  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid var(--status-info)',
          color: 'var(--status-info)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-md)'
        }}>
          <HelpCircle size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            PHOENIX Security Architecture & Trust Model
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Comprehensive architectural documentation, cryptographic boundaries, trust models, and operational guidance.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Client-Side Encryption Workflow */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Lock size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              1. Zero-Knowledge Client-Side Encryption
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
            When you deposit a document into PHOENIX, encryption happens entirely inside your browser memory using the standard <strong>Web Crypto API</strong> before any bytes leave your machine:
          </p>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, paddingLeft: '1.25rem', margin: 0 }}>
            <li><strong>Key Derivation:</strong> Your master vault passphrase derives a 256-bit AES vault key using <code>PBKDF2-HMAC-SHA256</code> with <strong>100,000 rounds</strong> and an isolated cryptographically secure user salt.</li>
            <li><strong>Cipher Algorithm:</strong> Files are encrypted with <code>AES-256-GCM</code> (Galois/Counter Mode) producing a 128-bit authentication tag.</li>
            <li><strong>Nonce Uniqueness:</strong> Every single encryption operation draws a fresh 12-byte (96-bit) cryptographically random IV from <code>crypto.getRandomValues()</code>. Nonces are never reused.</li>
            <li><strong>Zero Plaintext Transmission:</strong> The backend server and persistent database store only ciphertext blobs. The server never receives your master passphrase or unencrypted files.</li>
          </ul>
        </div>

        {/* Section 2: Tamper-Evident Integrity Manifests */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={18} color="var(--status-success)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              2. Tamper-Evident Manifests & Canonical Serialization
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
            Storing a plain hash next to a document in the same table offers weak protection because an attacker with database write access could replace both the file and the hash. PHOENIX defends against this:
          </p>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, paddingLeft: '1.25rem', margin: 0 }}>
            <li><strong>Deterministic Serialization:</strong> Metadata payloads are canonicalized (RFC 8785 key-sorting) ensuring that JSON objects always produce an identical byte sequence.</li>
            <li><strong>HMAC-SHA256 Signing Authority:</strong> Integrity manifests are authenticated using an isolated backend signing authority secret (<code>phoenix-auth-authority-v1</code>).</li>
            <li><strong>Verification Check:</strong> During verification, PHOENIX validates the manifest signature against the signing authority AND recalculates the SHA-256 digest of stored ciphertext. Any altered byte triggers immediate <code>TAMPERING DETECTED</code>.</li>
          </ul>
        </div>

        {/* Section 3: Breach Rehearsal & Recovery Proof */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Flame size={18} color="var(--status-danger)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              3. Breach Rehearsal & Recovery Proof Centerpiece
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
            PHOENIX’s signature capability is the <strong>Breach Rehearsal & Recovery Proof</strong> module:
          </p>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, paddingLeft: '1.25rem', margin: 0 }}>
            <li><strong>Isolated Test Assets:</strong> Rehearsals strictly operate on isolated dummy documents and disposable test manifests. Production user files are never touched or modified.</li>
            <li><strong>Adversarial Simulations:</strong> Scenarios include Content Tampering (corrupting ciphertext bytes), Metadata Forgery (altering manifest hashes), and Unauthorized Session Boundary testing.</li>
            <li><strong>Automated Containment:</strong> When tampering is detected, the compromised asset is quarantined (<code>CONTAINED_UNDER_INVESTIGATION</code>) and CRITICAL security audit events are logged.</li>
            <li><strong>Recovery Proof:</strong> The system validates trusted recovery copies, restores them, and re-verifies post-restoration integrity to mathematically prove operational resilience.</li>
          </ul>
        </div>

        {/* Section 4: Honest Trust Model & Security Limitations */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={18} color="var(--status-danger)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--status-danger)', margin: 0 }}>
              4. Honest Trust Model & Critical Limitations
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
            As senior cybersecurity architects, we uphold strict cryptographic transparency. PHOENIX never claims invulnerability:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Passphrase Irrecoverability:</strong> Because PHOENIX is zero-knowledge, if you lose your master passphrase, your encrypted document plaintexts cannot be decrypted by anyone, including the server administrators.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Server Signing Key Scope:</strong> The manifest HMAC signing key is held by the backend server. It protects against direct database tampering by unauthorized users or SQL injection. However, an attacker who achieves root shell compromise of the backend server could theoretically access the signing secret. In enterprise production, this key should be hosted in an external Hardware Security Module (HSM) or Cloud KMS.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Client Endpoint Security:</strong> Client-side encryption relies on a secure browser environment. Malware, keyloggers, or malicious browser extensions on the client machine could compromise keys in memory before encryption occurs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
