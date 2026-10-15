import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReportsPage() {
  const { token } = useAuth();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterScenario, setFilterScenario] = useState('ALL');

  useEffect(() => {
    loadReports();
  }, [token]);

  const loadReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rehearsal', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = async (runId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rehearsal/${runId}/report`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const report = await res.json();
        setSelectedReport(report);
      }
    } catch (err) {
      console.error('Failed to fetch full report:', err);
    }
  };

  const handleExportJson = (report) => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PHOENIX_SECURITY_REPORT_${report.runId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRuns = runs.filter(r => filterScenario === 'ALL' || r.scenario === filterScenario);

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
            background: 'rgba(170, 59, 255, 0.12)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <FileBarChart size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Breach Rehearsal & Security Proof Reports
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Persistent evidence-based audit certificates proving cryptographic containment and verified recovery.
            </p>
          </div>
        </div>

        <button
          onClick={loadReports}
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
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Reports Table Panel */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Stored Audit Reports ({filteredRuns.length})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter Scenario:</span>
            <select
              value={filterScenario}
              onChange={e => setFilterScenario(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              <option value="ALL">All Scenarios</option>
              <option value="CONTENT_TAMPERING">Content Tampering</option>
              <option value="METADATA_TAMPERING">Metadata Tampering</option>
              <option value="UNAUTHORIZED_SESSION">Unauthorized Session</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading audit reports...
          </div>
        ) : filteredRuns.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No breach rehearsal reports generated yet. Execute a rehearsal to produce persistent reports.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.75rem' }}>Report ID</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Exercise Scenario</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Outcome</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Execution Date</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                    {r.id}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {r.scenario}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: r.status === 'PASSED' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                      color: r.status === 'PASSED' ? 'var(--status-success)' : 'var(--status-danger)'
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenReport(r.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.35rem 0.75rem',
                        background: 'rgba(170, 59, 255, 0.1)',
                        border: '1px solid var(--accent)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={13} />
                      <span>View Certificate</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Full Report Drawer / Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-regular)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            maxWidth: '850px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Official PHOENIX Security Attestation
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
                  Report #{selectedReport.runId}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handlePrint}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleExportJson(selectedReport)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--text-inverse)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Download JSON</span>
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.45rem'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Certificate Header */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Scenario:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedReport.scenario}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Overall Outcome:</span>
                <span style={{
                  color: selectedReport.overallOutcome === 'PASSED' ? 'var(--status-success)' : 'var(--status-danger)',
                  fontWeight: 700
                }}>
                  {selectedReport.overallOutcome}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Execution Duration:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedReport.totalDurationMs} ms</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Timestamp:</span>
                <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedReport.startedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Checks Timeline */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Executed Verification Stages
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedReport.steps?.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {s.status === 'PASSED' ? <CheckCircle2 size={16} color="var(--status-success)" /> : <AlertTriangle size={16} color="var(--status-danger)" />}
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {idx + 1}. {s.stepName}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {s.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full JSON Dump */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Raw Audit Proof Representation
              </h3>
              <pre style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {JSON.stringify(selectedReport, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
