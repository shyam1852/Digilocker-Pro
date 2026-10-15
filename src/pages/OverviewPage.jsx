import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Flame,
  RotateCcw,
  History,
  Clock,
  RefreshCw,
  UploadCloud,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
  Lock,
  Sparkles,
  Briefcase,
  FolderLock,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

export default function OverviewPage({ onNavigate, onOpenUpload }) {
  const { user, token } = useAuth();
  const { documents, refreshAll } = useVault();

  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const fetchDashboardMetrics = async () => {
    if (!token) return;
    setLoadingMetrics(true);
    try {
      const res = await fetch('/api/metrics/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, [token, documents.length]);

  const totalDocs = metrics?.totalDocuments ?? documents.length;
  const totalVersions = metrics?.totalVersions ?? documents.length;
  const verifiedDocs = metrics?.verifiedDocuments ?? documents.filter(d => d.integrity_status === 'VERIFIED').length;
  const tamperingCount = metrics?.tamperingDetected ?? documents.filter(d => d.integrity_status === 'TAMPERING_DETECTED').length;
  const rehearsalsPassed = metrics?.rehearsalsCompleted ?? 0;
  const recoverySucceeded = metrics?.recoveryJobsSuccess ?? 0;
  const recentEvents = metrics?.recentEvents ?? [];

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.08) 100%)',
        border: '1px solid var(--border-regular)',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-success)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PHOENIX Zero-Knowledge Security Enclave
            </span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
            Welcome, @{user?.display_name || user?.username || 'Security Officer'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            AES-256-GCM client-side vault is active. Cryptographic manifests and automated containment are armed.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('rehearsal')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Flame size={15} />
            <span>Start Breach Rehearsal</span>
          </button>
          <button
            onClick={onOpenUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={15} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Real Persistent Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Documents */}
        <div
          onClick={() => onNavigate('vault')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Documents in Vault</span>
            <Shield size={16} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
            {totalDocs}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            AES-256-GCM Encrypted &rarr;
          </div>
        </div>

        {/* Total Versions */}
        <div
          onClick={() => onNavigate('versions')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recorded Versions</span>
            <History size={16} color="var(--status-info)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-info)', marginTop: '0.35rem' }}>
            {totalVersions}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Immutable Lineage &rarr;
          </div>
        </div>

        {/* Cryptographically Verified */}
        <div
          onClick={() => onNavigate('integrity')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Baseline</span>
            <ShieldCheck size={16} color="var(--status-success)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: '0.35rem' }}>
            {verifiedDocs}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            SHA-256 Digest Match &rarr;
          </div>
        </div>

        {/* Tampering Alerts */}
        <div
          onClick={() => onNavigate('integrity')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tampering Alerts</span>
            <AlertTriangle size={16} color={tamperingCount > 0 ? 'var(--status-danger)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: tamperingCount > 0 ? 'var(--status-danger)' : 'var(--text-muted)', marginTop: '0.35rem' }}>
            {tamperingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {tamperingCount === 0 ? 'Zero Violations Detected' : 'Requires Investigation &rarr;'}
          </div>
        </div>

        {/* Breach Rehearsals Completed */}
        <div
          onClick={() => onNavigate('rehearsal')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drills Completed</span>
            <Flame size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444', marginTop: '0.35rem' }}>
            {rehearsalsPassed}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Breach Drills Passed &rarr;
          </div>
        </div>

        {/* Recovery Proofs Verified */}
        <div
          onClick={() => onNavigate('recovery')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Restores</span>
            <RotateCcw size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#8b5cf6', marginTop: '0.35rem' }}>
            {recoverySucceeded}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Recovery Jobs Verified &rarr;
          </div>
        </div>
      </div>

      {/* Quick Access Security Actions Strip */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Core Security Workstations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate('rehearsal')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Flame size={16} color="#ef4444" />
            <span>Breach Rehearsal Console</span>
          </button>

          <button
            onClick={() => onNavigate('integrity')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <ShieldCheck size={16} color="var(--status-success)" />
            <span>Cryptographic Integrity Workstation</span>
          </button>

          <button
            onClick={() => onNavigate('versions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <History size={16} color="var(--status-info)" />
            <span>Version History Lineage</span>
          </button>

          <button
            onClick={() => onNavigate('recovery')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <RotateCcw size={16} color="#8b5cf6" />
            <span>Recovery Center Wizard</span>
          </button>
        </div>
      </div>

      {/* Two Columns: Recent Security Events & Vault Document Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)', gap: '1.5rem' }}>
        {/* Recent Security Events Ledger */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Recent Security Audit Events
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live ledger records</div>
            </div>
            <button
              onClick={() => onNavigate('events')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              View All Events &rarr;
            </button>
          </div>

          {recentEvents.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No audit events recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentEvents.slice(0, 6).map(evt => (
                <div
                  key={evt.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: evt.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: evt.severity === 'CRITICAL' ? 'var(--status-danger)' : 'var(--status-info)'
                    }}>
                      {evt.severity}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {evt.event_type}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vault Status Overview */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Vault Documents & Integrity
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest records</div>
            </div>
            <button
              onClick={() => onNavigate('vault')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Open Vault &rarr;
            </button>
          </div>

          {documents.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Your vault is currently empty.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {documents.slice(0, 5).map(doc => (
                <div
                  key={doc.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      v{doc.version || 1} • {doc.category || 'General'}
                    </div>
                  </div>

                  <span style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: doc.integrity_status === 'TAMPERING_DETECTED' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
                    color: doc.integrity_status === 'TAMPERING_DETECTED' ? 'var(--status-danger)' : 'var(--status-success)'
                  }}>
                    {doc.integrity_status || 'VERIFIED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
