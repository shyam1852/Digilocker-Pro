import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SecurityEventsPage() {
  const { token } = useAuth();

  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  // Selected event for detail drawer / modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [token, severityFilter, eventTypeFilter, outcomeFilter, page]);

  const loadEvents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit)
      });
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (eventTypeFilter !== 'ALL') params.append('event_type', eventTypeFilter);
      if (outcomeFilter !== 'ALL') params.append('outcome', outcomeFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/security-events?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalEvents(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load security audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    loadEvents();
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-danger)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'HIGH':
        return { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' };
      case 'MEDIUM':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'LOW':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--status-info)', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-muted)', border: 'rgba(107, 114, 128, 0.3)' };
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid var(--status-warning)',
            color: 'var(--status-warning)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Immutable Security Events & Audit Ledger
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Chronological cryptographic activity ledger recording document operations, integrity verifications, containment actions, and access control boundaries.
            </p>
          </div>
        </div>

        <button
          onClick={loadEvents}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.85rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search details or event types..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </form>

        {/* Severity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Severity:</span>
          <select
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
            style={{
              padding: '0.45rem 0.65rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem'
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="INFO">Info / Low</option>
          </select>
        </div>

        {/* Event Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Event Type:</span>
          <select
            value={eventTypeFilter}
            onChange={e => { setEventTypeFilter(e.target.value); setPage(0); }}
            style={{
              padding: '0.45rem 0.65rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem'
            }}
          >
            <option value="ALL">All Event Types</option>
            <option value="DOCUMENT_UPLOAD">Document Upload</option>
            <option value="INTEGRITY_VERIFICATION">Integrity Verification</option>
            <option value="INTEGRITY_MISMATCH">Integrity Mismatch</option>
            <option value="CONTAINMENT_ACTION">Containment Action</option>
            <option value="DOCUMENT_RESTORED">Document Restored</option>
            <option value="REHEARSAL_STARTED">Rehearsal Started</option>
            <option value="REHEARSAL_COMPLETED">Rehearsal Completed</option>
            <option value="AUTH_LOGIN">Auth Login</option>
            <option value="AUTH_DENIED">Auth Denied</option>
          </select>
        </div>

        {/* Outcome Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outcome:</span>
          <select
            value={outcomeFilter}
            onChange={e => { setOutcomeFilter(e.target.value); setPage(0); }}
            style={{
              padding: '0.45rem 0.65rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem'
            }}
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success / Verified</option>
            <option value="TAMPERING_DETECTED">Tampering Detected</option>
            <option value="DENIED">Denied</option>
            <option value="RECOVERED">Recovered</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        overflowX: 'auto'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading security events ledger...
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No security events found matching current filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.75rem' }}>Event ID</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Severity</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Event Type</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Outcome</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Timestamp</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Details Summary</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(evt => {
                const badge = getSeverityBadge(evt.severity);
                const summaryText = typeof evt.parsedDetails === 'object' && evt.parsedDetails !== null
                  ? (evt.parsedDetails.message || JSON.stringify(evt.parsedDetails))
                  : String(evt.details);

                return (
                  <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {evt.id}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {evt.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                      {evt.event_type}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: evt.outcome === 'TAMPERING_DETECTED' || evt.outcome === 'FAILED' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
                        color: evt.outcome === 'TAMPERING_DETECTED' || evt.outcome === 'FAILED' ? 'var(--status-danger)' : 'var(--status-success)'
                      }}>
                        {evt.outcome}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                    <td style={{
                      padding: '0.75rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {summaryText}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.3rem 0.65rem',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {events.length} of {totalEvents} total security events
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '0.35rem 0.65rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: page === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '0.75rem',
                cursor: page === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
              Page {page + 1} of {Math.max(1, Math.ceil(totalEvents / limit))}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= totalEvents}
              style={{
                padding: '0.35rem 0.65rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: (page + 1) * limit >= totalEvents ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: '0.75rem',
                cursor: (page + 1) * limit >= totalEvents ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Structured Details Modal */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} color="var(--accent)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Security Event #{selectedEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Event Type:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{selectedEvent.event_type}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Severity:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{selectedEvent.severity}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Outcome:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{selectedEvent.outcome}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>{' '}
                <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedEvent.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Structured Event Metadata Payload
              </div>
              <pre style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {JSON.stringify(selectedEvent.parsedDetails || selectedEvent.details, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
