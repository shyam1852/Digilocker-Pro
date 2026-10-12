import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Activity,
  Check
} from 'lucide-react';
import { useVault } from '../context/VaultContext';

export default function RenewalCenterPage() {
  const { documents, renewals, dispatchRenewal, confirmRenewal } = useVault();

  const [selectedDocId, setSelectedDocId] = useState('');
  const [estimatedPremium, setEstimatedPremium] = useState('18500');
  const [targetUrl, setTargetUrl] = useState('');
  const [engineStatus, setEngineStatus] = useState(null);
  const [dispatching, setDispatching] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch engine operational mode
  useEffect(() => {
    fetch('/api/tinyfish/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setEngineStatus(data);
      })
      .catch(() => {});
  }, []);

  // Eligible insurance documents
  const eligibleDocs = documents.filter((d) =>
    ['Health Insurance', 'Life Insurance', 'Vehicle Insurance'].includes(d.category) && d.status !== 'archived'
  );

  // Auto-populate recommended public insurance portal URL when policy changes
  const handleDocChange = (docId) => {
    setSelectedDocId(docId);
    if (!docId) {
      setTargetUrl('');
      return;
    }
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      const cat = (doc.category || '').toLowerCase();
      const ins = (doc.insurer_name || '').toLowerCase();
      if (ins.includes('star health') || cat.includes('health')) {
        setTargetUrl('https://en.wikipedia.org/wiki/Health_insurance');
      } else if (ins.includes('hdfc') || cat.includes('life')) {
        setTargetUrl('https://en.wikipedia.org/wiki/Life_insurance');
      } else if (ins.includes('icici') || cat.includes('vehicle') || cat.includes('motor')) {
        setTargetUrl('https://en.wikipedia.org/wiki/Vehicle_insurance');
      } else {
        setTargetUrl('https://en.wikipedia.org/wiki/Insurance_policy');
      }
    }
  };

  const handleStartRenewal = async () => {
    if (!selectedDocId) {
      setError('Please select an active policy to start the renewal workflow.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setDispatching(true);

    try {
      const res = await dispatchRenewal(selectedDocId, estimatedPremium, targetUrl);
      setActiveWorkflow(res.workflow);
    } catch (err) {
      setError(err.message || 'Renewal agent execution failed.');
    } finally {
      setDispatching(false);
    }
  };

  const handleConfirmApproval = async (workflowId) => {
    setConfirming(true);
    setError('');
    try {
      await confirmRenewal(workflowId);
      setSuccessMessage('Policy successfully renewed to new version. Superseded version has been safely archived.');
      setActiveWorkflow(null);
    } catch (err) {
      setError(err.message || 'Failed to confirm renewal.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Self-Healing Locker — Renewal Center
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Autonomous TinyFish web agent integration for policy renewal rate retrieval & version archival
          </p>
        </div>

        {/* Engine Operational Mode Pill */}
        {engineStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {engineStatus.is_live ? (
              <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }} />
                LIVE AGENT API (TINYFISH_API_KEY Active)
              </span>
            ) : (
              <span className="badge badge-simulation" style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }} />
                MOCK SANDBOX (DEVELOPMENT SIMULATION)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Disclaimers & Safety Notice */}
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
        <ShieldCheck size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span>
          <strong>Zero-Transaction Invariant:</strong> TinyFish web agents retrieve authentic renewal quotations and underwriter schedules. Policies are NEVER renewed or paid automatically without explicit user inspection and cryptographic confirmation.
        </span>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--status-danger-bg)',
          color: 'var(--status-danger)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{error}</div>
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Workflow Launcher Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Dispatch Renewal Agent</h3>
            <p className="card-subtitle">Select an existing policy in your vault to query underwriter portals or public insurance pages</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Select Policy Document</label>
            <select
              value={selectedDocId}
              onChange={(e) => handleDocChange(e.target.value)}
              className="input-control"
            >
              <option value="">-- Choose Monitored Policy --</option>
              {eligibleDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.insurer_name} - {doc.policy_number})
                </option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Current Premium (₹)</label>
            <input
              type="number"
              value={estimatedPremium}
              onChange={(e) => setEstimatedPremium(e.target.value)}
              className="input-control"
              placeholder="e.g. 18500"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Target Public Portal / Info Page</label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="input-control"
              placeholder="https://..."
            />
          </div>

          <button
            onClick={handleStartRenewal}
            disabled={dispatching || !selectedDocId}
            className="btn btn-primary"
            style={{ height: '38px', padding: '0 1.25rem', whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={14} className={dispatching ? 'spin' : ''} />
            <span>{dispatching ? 'Agent Running...' : 'Start Renewal Workflow'}</span>
          </button>
        </div>
      </div>

      {/* Active Agent Telemetry & Quote Review Screen */}
      {activeWorkflow && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--accent-border)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="brand-mark" style={{ width: '28px', height: '28px' }}>
                <Activity size={15} />
              </div>
              <div>
                <h3 className="card-title">Renewal Quotation Retrieved</h3>
                <p className="card-subtitle">Ref: {activeWorkflow.quote_ref} • Source: {activeWorkflow.insurer_portal_url}</p>
              </div>
            </div>
            {activeWorkflow.is_simulation === 1 ? (
              <span className="badge badge-simulation">DEVELOPMENT SIMULATION (MOCK PORTAL)</span>
            ) : (
              <span className="badge badge-success">LIVE TINYFISH AGENT</span>
            )}
          </div>

          {/* Comparison Metrics */}
          <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Original Premium</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ₹{activeWorkflow.old_premium?.toLocaleString() || '—'}
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>Revised Renewal Quote</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>
                ₹{activeWorkflow.new_quote_premium?.toLocaleString() || '—'}
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--status-info)', marginTop: '0.25rem' }}>
                Awaiting User Approval
              </div>
            </div>
          </div>

          {/* Agent Telemetry Log Box */}
          {activeWorkflow.agent_telemetry && (
            <div style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                <Terminal size={13} />
                <span>TinyFish Execution Telemetry</span>
              </div>
              {(() => {
                try {
                  const logs = JSON.parse(activeWorkflow.agent_telemetry);
                  return logs.map((log, idx) => (
                    <div key={idx} style={{ padding: '0.2rem 0', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--accent)' }}>[Step {log.step}]</span> {log.title || log.action}: {log.detail || ''}
                    </div>
                  ));
                } catch {
                  return <div style={{ color: 'var(--text-muted)' }}>Telemetry stream loaded.</div>;
                }
              })()}
            </div>
          )}

          {/* User Confirmation Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Approving creates a new encrypted version and automatically archives the old version.
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveWorkflow(null)}
                className="btn btn-secondary btn-sm"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleConfirmApproval(activeWorkflow.id)}
                disabled={confirming}
                className="btn btn-primary btn-sm"
              >
                <Check size={14} />
                <span>{confirming ? 'Archiving & Updating...' : 'Approve & Update Policy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Renewal History Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Renewal History & Completed Workflows</h3>
            <p className="card-subtitle">Audited record of automated renewals and superseded versions</p>
          </div>
        </div>

        {renewals.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No renewal workflows launched yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Policy Name</th>
                  <th>Insurer</th>
                  <th>Quote Ref</th>
                  <th>Quoted Rate</th>
                  <th>Status</th>
                  <th>Engine</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {renewals.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.doc_title}</td>
                    <td>{r.insurer_name}</td>
                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{r.quote_ref}</code></td>
                    <td>₹{r.new_quote_premium?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.is_simulation === 1 ? (
                        <span className="badge badge-simulation">SIMULATION</span>
                      ) : (
                        <span className="badge badge-success">LIVE AGENT</span>
                      )}
                    </td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      {r.status === 'quote_ready' && (
                        <button
                          onClick={() => handleConfirmApproval(r.id)}
                          className="btn btn-primary btn-sm"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === 'completed' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--status-success)' }}>
                          ✓ Archived & Updated
                        </span>
                      )}
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
