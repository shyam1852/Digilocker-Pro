import React from 'react';
import {
  Shield,
  Clock,
  RefreshCw,
  Activity,
  UploadCloud,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useVault } from '../context/VaultContext';

export default function OverviewPage({ onNavigate, onOpenUpload }) {
  const { documents, renewals, healthChecks, activities } = useVault();

  // Compute operational statistics from real data
  const totalDocs = documents.length;
  const expiringSoonDocs = documents.filter((d) => {
    if (!d.expiry_date || d.status === 'archived') return false;
    const days = Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  });

  const activeRenewals = renewals.filter((r) => r.status === 'quote_ready' || r.status === 'running');
  const pendingHealthChecks = healthChecks.filter((h) => h.status === 'Requires Review' || h.user_reviewed === 0);

  return (
    <div className="page-container">
      {/* Top Operational Metrics */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">
            <span>Documents in Custody</span>
            <Shield size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-value">{totalDocs}</div>
          <div className="stat-sub">AES-256-GCM Encrypted Vault</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>Expiring Within 30 Days</span>
            <Clock size={15} style={{ color: expiringSoonDocs.length > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }} />
          </div>
          <div className="stat-value" style={{ color: expiringSoonDocs.length > 0 ? 'var(--status-warning)' : 'inherit' }}>
            {expiringSoonDocs.length}
          </div>
          <div className="stat-sub">Requires renewal intervention</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>Renewal Workflows</span>
            <RefreshCw size={15} style={{ color: 'var(--status-info)' }} />
          </div>
          <div className="stat-value">{activeRenewals.length}</div>
          <div className="stat-sub">TinyFish agent quotes ready</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <span>Policy Health Reviews</span>
            <Activity size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-value">{pendingHealthChecks.length}</div>
          <div className="stat-sub">Clause discrepancies flagged</div>
        </div>
      </div>

      {/* Quick Operational Actions Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Quick Operations</h2>
            <p className="card-subtitle">Direct actions for cryptographic vault & automated agents</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <button
            onClick={onOpenUpload}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
          >
            <UploadCloud size={16} style={{ color: 'var(--accent)' }} />
            <span>Deposit Document</span>
          </button>

          <button
            onClick={() => onNavigate('renewal')}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
          >
            <RefreshCw size={16} style={{ color: 'var(--status-info)' }} />
            <span>Start Renewal Workflow</span>
          </button>

          <button
            onClick={() => onNavigate('health')}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
          >
            <Activity size={16} style={{ color: 'var(--accent)' }} />
            <span>Run Policy Health Check</span>
          </button>

          <button
            onClick={() => onNavigate('claims')}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
          >
            <FileText size={16} style={{ color: 'var(--status-warning)' }} />
            <span>Assemble Nominee Claim</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Deadlines & Recent Activities */}
      <div className="grid-2">
        {/* Deadlines / Expiring Documents */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Calendar size={16} style={{ color: 'var(--status-warning)' }} />
                <span>Upcoming Deadlines & Expiries</span>
              </h2>
              <p className="card-subtitle">Monitored documents approaching expiration</p>
            </div>
            <button onClick={() => onNavigate('vault')} className="btn btn-secondary btn-sm">
              View All
            </button>
          </div>

          {expiringSoonDocs.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--status-success)', margin: '0 auto 0.5rem auto' }} />
              <div>No documents nearing expiry within 30 days.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {expiringSoonDocs.map((doc) => {
                const days = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.75rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {doc.insurer_name} • Expires {doc.expiry_date}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-warning">{days} days remaining</span>
                      <button
                        onClick={() => onNavigate('renewal')}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        Renew
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Log */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Vault Activity</h2>
              <p className="card-subtitle">Cryptographic operations & agent dispatch ledger</p>
            </div>
            <button onClick={() => onNavigate('activities')} className="btn btn-secondary btn-sm">
              Full Audit
            </button>
          </div>

          {activities.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              No recorded events yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '0.55rem 0.65rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    fontSize: '0.775rem'
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {act.description}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {new Date(act.created_at).toLocaleString()}
                    </div>
                  </div>
                  {act.is_simulation === 1 ? (
                    <span className="badge badge-simulation">SIMULATION</span>
                  ) : (
                    <span className="badge badge-success">REAL</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
