import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Sparkles,
  Briefcase,
  FolderLock,
  Mail,
  ChevronRight,
  HeartPulse
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

export default function OverviewPage({ onNavigate, onOpenUpload }) {
  const { user } = useAuth();
  const { documents, renewals, activities } = useVault();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/overview/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('dmlocker_token') || ''}`
      }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, [documents.length]);

  const totalDocs = stats?.totalDocuments ?? documents.length;
  const expiringSoonCount = stats?.expiringSoonCount ?? documents.filter(d => {
    if (!d.expiry_date || d.status === 'archived') return false;
    const days = Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  }).length;

  const upcomingRemindersCount = stats?.upcomingRemindersCount ?? expiringSoonCount;
  const missingJobDocsCount = stats?.missingJobDocsCount ?? 0;
  const policiesRequiringReviewCount = stats?.policiesRequiringReviewCount ?? expiringSoonCount;

  return (
    <div className="page-container">
      {/* Welcome & Security Status Banner */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Zero-Knowledge Enclave Active
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
            Welcome back, @{user?.username || 'Custodian'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Client-side AES-256-GCM vault is unlocked. Keys reside exclusively in your browser memory.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onNavigate('assistant')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.4rem' }}
          >
            <Sparkles size={14} style={{ color: '#3b82f6' }} />
            <span>Open DM Assistant</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.4rem' }}
          >
            <UploadCloud size={14} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid (Part 2.1) */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {/* Total Documents */}
        <div
          className="stat-card"
          onClick={() => onNavigate('vault')}
          style={{ cursor: 'pointer' }}
          title="Click to view My Vault"
        >
          <div className="stat-label">
            <span>Documents in Vault</span>
            <Shield size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-value">{totalDocs}</div>
          <div className="stat-sub">Client-Side Encrypted Records &rarr;</div>
        </div>

        {/* Expiring Soon */}
        <div
          className="stat-card"
          onClick={() => onNavigate('renewals')}
          style={{ cursor: 'pointer' }}
          title="Click to view Renewals & Expiry Alerts"
        >
          <div className="stat-label">
            <span>Expiring Soon (30 Days)</span>
            <Clock size={15} style={{ color: expiringSoonCount > 0 ? '#f59e0b' : 'var(--text-muted)' }} />
          </div>
          <div className="stat-value" style={{ color: expiringSoonCount > 0 ? '#f59e0b' : 'inherit' }}>
            {expiringSoonCount}
          </div>
          <div className="stat-sub">
            {upcomingRemindersCount} Scheduled Email Alerts &rarr;
          </div>
        </div>

        {/* Missing Job Documents */}
        <div
          className="stat-card"
          onClick={() => onNavigate('career')}
          style={{ cursor: 'pointer' }}
          title="Click to view Career & Education Checker"
        >
          <div className="stat-label">
            <span>Job Docs Missing</span>
            <Briefcase size={15} style={{ color: missingJobDocsCount > 0 ? '#ef4444' : '#10b981' }} />
          </div>
          <div className="stat-value" style={{ color: missingJobDocsCount > 0 ? '#ef4444' : '#10b981' }}>
            {missingJobDocsCount}
          </div>
          <div className="stat-sub">
            {missingJobDocsCount === 0 ? 'All Core Credentials Available' : 'Degree / Resume / 10th Marksheet Check &rarr;'}
          </div>
        </div>

        {/* Policies Requiring Review */}
        <div
          className="stat-card"
          onClick={() => onNavigate('healthcare')}
          style={{ cursor: 'pointer' }}
          title="Click to view Healthcare & Policy Audits"
        >
          <div className="stat-label">
            <span>Policies Needing Review</span>
            <Activity size={15} style={{ color: '#06b6d4' }} />
          </div>
          <div className="stat-value">{policiesRequiringReviewCount}</div>
          <div className="stat-sub">Health & Motor Policy Clauses &rarr;</div>
        </div>
      </div>

      {/* Quick Action Operations Strip */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
          Quick Hub Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
          <button
            onClick={onOpenUpload}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '0.65rem 0.85rem' }}
          >
            <UploadCloud size={15} style={{ color: 'var(--accent)' }} />
            <span>Upload New Document</span>
          </button>

          <button
            onClick={() => onNavigate('vault')}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '0.65rem 0.85rem' }}
          >
            <FolderLock size={15} style={{ color: '#8b5cf6' }} />
            <span>Organize Vault Folders</span>
          </button>

          <button
            onClick={() => onNavigate('assistant')}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '0.65rem 0.85rem' }}
          >
            <Sparkles size={15} style={{ color: '#3b82f6' }} />
            <span>Ask DM Assistant</span>
          </button>

          <button
            onClick={() => onNavigate('renewals')}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'flex-start', padding: '0.65rem 0.85rem' }}
          >
            <RefreshCw size={15} style={{ color: '#10b981' }} />
            <span>Review Renewals & Alerts</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Deadlines & Recent Documents/Activity */}
      <div className="grid-2">
        {/* Deadlines / Expiring Documents */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Calendar size={16} style={{ color: '#f59e0b' }} />
                <span>Upcoming Expiries & Email Alerts</span>
              </h2>
              <p className="card-subtitle">Monitored documents approaching validity deadlines</p>
            </div>
            <button onClick={() => onNavigate('renewals')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
              Renewal Center
            </button>
          </div>

          {documents.filter(d => d.expiry_date && d.status !== 'archived').length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <CheckCircle2 size={24} style={{ color: '#10b981', margin: '0 auto 0.5rem auto' }} />
              <div>No expiration dates tracked in your vault.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {documents.filter(d => d.expiry_date && d.status !== 'archived').slice(0, 5).map((doc) => {
                const days = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                const isUrgent = days <= 30;
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {doc.category} • Expires {doc.expiry_date}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${isUrgent ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                        {days < 0 ? 'Expired' : `${days}d left`}
                      </span>
                      <button
                        onClick={() => onNavigate('renewals')}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Ledger */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Vault Activity</h2>
              <p className="card-subtitle">Audited chronological events & cryptographic operations</p>
            </div>
            <button onClick={() => onNavigate('settings')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
              Security
            </button>
          </div>

          {activities.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No recorded events yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {activities.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '0.5rem 0.65rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {act.description}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                      {new Date(act.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`badge ${act.is_simulation === 1 ? 'badge-simulation' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                    {act.is_simulation === 1 ? 'SIM' : 'REAL'}
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
