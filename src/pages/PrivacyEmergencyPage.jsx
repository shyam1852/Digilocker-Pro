import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Users,
  QrCode,
  ShieldCheck,
  Lock,
  HeartHandshake
} from 'lucide-react';
import EmergencyAccessPage from './EmergencyAccessPage';
import NomineeClaimPage from './NomineeClaimPage';
import VerifierPage from './VerifierPage';

export default function PrivacyEmergencyPage({ onOpenUpload }) {
  const [activeTab, setActiveTab] = useState('emergency'); // 'emergency' | 'claims' | 'verifier'

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Privacy & Emergency Access Hub</h1>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Inactivity heartbeats, 2-of-3 Shamir's Secret Sharing, authorized nominee claim assembly & one-time selective QR disclosure
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('emergency')}
          className={`btn btn-sm ${activeTab === 'emergency' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <ShieldAlert size={14} />
          <span>Dead Man's Switch & Shamir Recovery</span>
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`btn btn-sm ${activeTab === 'claims' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <Users size={14} />
          <span>Nominee Claim Assembly Pack</span>
        </button>

        <button
          onClick={() => setActiveTab('verifier')}
          className={`btn btn-sm ${activeTab === 'verifier' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <QrCode size={14} />
          <span>One-Time Selective QR Verifier</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'emergency' && <EmergencyAccessPage />}
        {activeTab === 'claims' && <NomineeClaimPage onOpenUpload={onOpenUpload} />}
        {activeTab === 'verifier' && <VerifierPage />}
      </div>
    </div>
  );
}
