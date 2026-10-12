import React, { useState } from 'react';
import {
  History,
  Shield,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Terminal,
  Activity,
  UserCheck,
  FileText,
  Lock
} from 'lucide-react';
import { useVault } from '../context/VaultContext';

export default function ActivityLogPage() {
  const { activities } = useVault();
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = activities.filter((act) => {
    if (filterType !== 'ALL' && act.event_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!act.description.toLowerCase().includes(q) && !act.event_type.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Security & Audit Activity Log
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Tamper-evident record of client encryption operations, agent workflows, and authentication events
        </p>
      </div>

      {/* Privacy Notice */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Lock size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span>
          <strong>Audit Boundary:</strong> Audit logs record operational metadata and timestamps only. Plaintext document data, decrypted file buffers, master passphrases, and raw Shamir recovery shares are <em>strictly excluded</em> from log persistence.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search audit descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '2.1rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event Category:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-control"
              style={{ width: '180px', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">All Event Types</option>
              <option value="AUTH_LOGIN">Authentication</option>
              <option value="DOC_UPLOAD">Document Upload</option>
              <option value="RENEWAL_DISPATCHED">Renewal Dispatched</option>
              <option value="RENEWAL_CONFIRMED">Renewal Confirmed</option>
              <option value="POLICY_HEALTH_RUN">Policy Health Check</option>
              <option value="NOMINEE_CLAIM_PREPARED">Nominee Claim</option>
              <option value="CHECKIN_RECORDED">Emergency Heartbeat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <History size={30} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            No audit records match query
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Try resetting your event filter or search term.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Operation Description</th>
                <th>Origin / IP</th>
                <th>Execution Mode</th>
                <th>Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((act) => (
                <tr key={act.id}>
                  <td>
                    <code style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      background: 'var(--bg-surface)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {act.event_type}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                    {act.description}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {act.ip_address || '127.0.0.1'}
                    </span>
                  </td>
                  <td>
                    {act.is_simulation === 1 ? (
                      <span className="badge badge-simulation">SIMULATION</span>
                    ) : (
                      <span className="badge badge-success">REAL SYSTEM</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
