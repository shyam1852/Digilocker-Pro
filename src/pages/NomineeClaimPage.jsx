import React, { useState } from 'react';
import {
  Users,
  Shield,
  FileCheck2,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useAuth } from '../context/AuthContext';

export default function NomineeClaimPage({ onOpenUpload }) {
  const { documents, claims, prepareClaim } = useVault();
  const { user } = useAuth();

  const [selectedDocId, setSelectedDocId] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [activeClaim, setActiveClaim] = useState(null);
  const [error, setError] = useState('');

  const eligibleDocs = documents.filter((d) =>
    ['Health Insurance', 'Life Insurance'].includes(d.category) && d.status !== 'archived'
  );

  const handlePrepareClaim = async () => {
    if (!selectedDocId) {
      setError('Please select an insurance policy to prepare a claim dossier.');
      return;
    }
    setError('');
    setPreparing(true);

    try {
      const res = await prepareClaim(selectedDocId);
      setActiveClaim(res.claim);
    } catch (err) {
      setError(err.message || 'Failed to initialize claim checklist.');
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Autonomous Nominee Claim Pilot
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Assisted claim dossier assembly, evidentiary checklist validation, and nominee handoff workspace
        </p>
      </div>

      {/* Safety Invariant Notice */}
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
        <AlertTriangle size={16} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Boundary Notice:</strong> DM Locker Pro assists the authorized nominee with document compilation and validation. The system <em>never guarantees claim approval or disbursement</em>, and halts strictly prior to legally binding submission, electronic signature, OTP entry, or formal execution.
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

      {/* Nominee Profile Overview Card */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="stat-label">Authorized Nominee</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
            {user?.nominee?.name || 'Priya Keshri'}
          </div>
          <div className="stat-sub">Relationship: {user?.nominee?.relationship || 'Spouse'}</div>
        </div>

        <div className="card">
          <div className="stat-label">Nominee Contact & Escalation</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
            {user?.nominee?.email || 'priya.k@example.com'}
          </div>
          <div className="stat-sub">{user?.nominee?.phone || '+91 98765 43210'}</div>
        </div>

        <div className="card">
          <div className="stat-label">Handoff Authorization</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--status-success)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={15} />
            <span>Escrow Nominee Verified</span>
          </div>
          <div className="stat-sub">Protected by 2-of-3 Shamir threshold</div>
        </div>
      </div>

      {/* Claim Package Initiator */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Assemble Claim Dossier</h3>
            <p className="card-subtitle">Generate an evidence validation checklist for an active policy</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Select Insurance Policy</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="input-control"
            >
              <option value="">-- Choose Policy to Prepare Claim Package --</option>
              {eligibleDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.insurer_name} - {doc.policy_number})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrepareClaim}
            disabled={preparing || !selectedDocId}
            className="btn btn-primary"
            style={{ height: '38px', padding: '0 1.25rem' }}
          >
            <Users size={14} />
            <span>{preparing ? 'Generating Dossier...' : 'Prepare Claim Checklist'}</span>
          </button>
        </div>
      </div>

      {/* Active Claim Checklist View */}
      {activeClaim && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-regular)' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Claim Evidentiary Checklist</h3>
              <p className="card-subtitle">
                Regulatory Guideline Reference: <a href={activeClaim.insurer_guidelines_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{activeClaim.insurer_guidelines_url}</a>
              </p>
            </div>
            <button onClick={() => setActiveClaim(null)} className="btn btn-secondary btn-sm">
              Dismiss
            </button>
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
            {(() => {
              try {
                const items = JSON.parse(activeClaim.checklist_items);
                return items.map((item, idx) => {
                  let badge = <span className="badge badge-warning">Requires Review</span>;
                  if (item.status === 'Available') {
                    badge = <span className="badge badge-success">✓ Available in Vault</span>;
                  } else if (item.status === 'Missing') {
                    badge = <span className="badge badge-danger">✕ Missing Document</span>;
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 0.85rem',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.notes}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {badge}
                        {item.status === 'Missing' && (
                          <button
                            onClick={onOpenUpload}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          >
                            Deposit Record
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              } catch {
                return <div>Unable to display checklist items.</div>;
              }
            })()}
          </div>

          {/* Summary & Insurer Handoff Action */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Nominee package compiled. Review records before scheduling underwriter liaison.
            </span>
            <button
              onClick={() => alert('Claim package compiled and signed into encrypted dossier container for nominee handover.')}
              className="btn btn-primary btn-sm"
            >
              Export Sealed Dossier
            </button>
          </div>
        </div>
      )}

      {/* Historical Claims Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Dossier Records</h3>
            <p className="card-subtitle">Previously prepared claim checklists</p>
          </div>
        </div>

        {claims.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No claim dossiers prepared yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Insurer</th>
                  <th>Nominee</th>
                  <th>Status</th>
                  <th>Date Prepared</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.doc_title}</td>
                    <td>{c.insurer_name}</td>
                    <td>{c.nominee_name}</td>
                    <td>
                      <span className="badge badge-success">Ready for Review</span>
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setActiveClaim(c)}
                        className="btn btn-secondary btn-sm"
                      >
                        Inspect Checklist
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
