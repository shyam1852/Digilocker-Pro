import React, { useState } from 'react';
import {
  Activity,
  Shield,
  FileDiff,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useVault } from '../context/VaultContext';

export default function PolicyHealthPage() {
  const { documents, healthChecks, runHealthCheck, reviewHealthCheck } = useVault();

  const [selectedDocId, setSelectedDocId] = useState('');
  const [running, setRunning] = useState(false);
  const [activeCheck, setActiveCheck] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const eligibleDocs = documents.filter((d) =>
    ['Health Insurance', 'Life Insurance', 'Vehicle Insurance'].includes(d.category) && d.status !== 'archived'
  );

  const handleRunCheck = async () => {
    if (!selectedDocId) {
      setError('Please select an active policy to analyze.');
      return;
    }
    setError('');
    setSuccess('');
    setRunning(true);

    try {
      const res = await runHealthCheck(selectedDocId);
      setActiveCheck(res.check);
    } catch (err) {
      setError(err.message || 'Health check agent execution failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveReview = async (checkId) => {
    try {
      await reviewHealthCheck(checkId, reviewNotes);
      setSuccess('Review status and notes recorded in audit log.');
      if (activeCheck && activeCheck.id === checkId) {
        setActiveCheck({ ...activeCheck, user_reviewed: 1, user_notes: reviewNotes });
      }
    } catch (err) {
      setError(err.message || 'Failed to update review status.');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Zero-Knowledge Policy Health Check
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Side-by-side clause verification comparing stored terms against current underwriter filings
        </p>
      </div>

      {/* Zero Knowledge Privacy & Legal Disclaimer */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem'
      }}>
        <Lock size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Zero-Knowledge Disclosure:</strong> Comparison operations compare public regulatory filings and underwriter master schedules. Your private encrypted policy documents never leave client memory in plaintext. <em>Notice: Master schedule amendments do not automatically alter an existing policy contract without written endorsement from the underwriter.</em>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--status-danger-bg)',
          color: 'var(--status-danger)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          border: '1px solid rgba(16, 185, 129, 0.25)'
        }}>
          {success}
        </div>
      )}

      {/* Health Check Runner Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Run Health Check on Monitored Policy</h3>
            <p className="card-subtitle">Query regulatory disclosures and 2026 underwriter wordings</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Select Policy</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="input-control"
            >
              <option value="">-- Choose Policy for Underwriting Comparison --</option>
              {eligibleDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.insurer_name} - {doc.policy_number})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunCheck}
            disabled={running || !selectedDocId}
            className="btn btn-primary"
            style={{ height: '38px', padding: '0 1.25rem' }}
          >
            <Activity size={14} className={running ? 'spin' : ''} />
            <span>{running ? 'Comparing Clauses...' : 'Run Health Check'}</span>
          </button>
        </div>
      </div>

      {/* Active Diff Comparison View */}
      {activeCheck && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-regular)' }}>
          <div className="card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="card-title">Side-by-Side Clause Analysis</h3>
                <span className={`badge ${activeCheck.status === 'Verified Difference' ? 'badge-success' : 'badge-warning'}`}>
                  {activeCheck.status}
                </span>
                {activeCheck.is_simulation === 1 ? (
                  <span className="badge badge-simulation">MOCK DIFF ENGINE</span>
                ) : (
                  <span className="badge badge-success">LIVE TINYFISH CHECK</span>
                )}
              </div>
              <p className="card-subtitle">
                Source: <a href={activeCheck.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{activeCheck.source_url}</a> • Retrieved: {activeCheck.retrieved_date}
              </p>
            </div>
            <button
              onClick={() => setActiveCheck(null)}
              className="btn btn-secondary btn-sm"
            >
              Close Diff
            </button>
          </div>

          {/* Clause Comparison Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            {(() => {
              try {
                const clauses = JSON.parse(activeCheck.clause_comparisons);
                return clauses.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {item.clause} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({item.category})</span>
                      </div>
                      <span className={`badge ${item.severity === 'Verified Difference' ? 'badge-success' : 'badge-warning'}`}>
                        {item.severity}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem' }}>
                      <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                          ORIGINAL POLICY BASELINE
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>{item.original}</div>
                      </div>

                      <div style={{ padding: '0.65rem', backgroundColor: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-border)' }}>
                        <div style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                          RETRIEVED CURRENT TERMS
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>{item.retrieved}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <strong>Assessment:</strong> {item.impact}
                    </div>
                  </div>
                ));
              } catch {
                return <div>Unable to parse comparison clauses.</div>;
              }
            })()}
          </div>

          {/* User Review Notes Section */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Policyholder Verification Notes</label>
              <textarea
                rows={2}
                value={reviewNotes || activeCheck.user_notes || ''}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Verified with underwriter support. New room rent limit requires endorsement at next renewal."
                className="input-control"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => handleSaveReview(activeCheck.id)}
                className="btn btn-primary btn-sm"
              >
                Mark as Reviewed & Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Health Checks Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Completed Health Check Records</h3>
            <p className="card-subtitle">Audited record of clause comparisons and review statuses</p>
          </div>
        </div>

        {healthChecks.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No health check records found. Select a policy above to run an analysis.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Insurer</th>
                  <th>Status</th>
                  <th>Retrieved Date</th>
                  <th>Engine</th>
                  <th>Review Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {healthChecks.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.doc_title}</td>
                    <td>{h.insurer_name}</td>
                    <td>
                      <span className={`badge ${h.status === 'Verified Difference' ? 'badge-success' : 'badge-warning'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td>{h.retrieved_date}</td>
                    <td>
                      {h.is_simulation === 1 ? (
                        <span className="badge badge-simulation">SIMULATION</span>
                      ) : (
                        <span className="badge badge-success">LIVE</span>
                      )}
                    </td>
                    <td>
                      {h.user_reviewed === 1 ? (
                        <span style={{ color: 'var(--status-success)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={12} />
                          <span>Reviewed</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--status-warning)', fontSize: '0.75rem' }}>
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setActiveCheck(h)}
                        className="btn btn-secondary btn-sm"
                      >
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
