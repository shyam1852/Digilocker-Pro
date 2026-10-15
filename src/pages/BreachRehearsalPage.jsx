import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  RotateCcw,
  FileText,
  Download,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BreachRehearsalPage() {
  const { token } = useAuth();

  const [selectedScenario, setSelectedScenario] = useState('CONTENT_TAMPERING');
  const [isRunning, setIsRunning] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedHistoricalRun, setSelectedHistoricalRun] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch past rehearsal runs on mount
  useEffect(() => {
    loadRuns();
  }, [token]);

  const loadRuns = async () => {
    if (!token) return;
    setLoadingRuns(true);
    try {
      const res = await fetch('/api/rehearsal', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch (err) {
      console.error('Failed to load rehearsal history:', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  // Execute live rehearsal
  const handleStartRehearsal = async () => {
    if (!token || isRunning) return;

    setIsRunning(true);
    setErrorMsg('');
    setActiveReport(null);

    try {
      const res = await fetch('/api/rehearsal/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ scenario: selectedScenario })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Rehearsal execution failed.');
      }

      setActiveReport(data.report);
      loadRuns();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // View historical run report
  const handleViewHistoricalRun = async (runId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rehearsal/${runId}/report`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const report = await res.json();
        setSelectedHistoricalRun(report);
      }
    } catch (err) {
      console.error('Failed to load historical report:', err);
    }
  };

  // Export JSON Report
  const handleExportJson = (reportData) => {
    const reportToExport = reportData || activeReport || selectedHistoricalRun;
    if (!reportToExport) return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PHOENIX_REHEARSAL_REPORT_${reportToExport.runId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const currentDisplayReport = activeReport || selectedHistoricalRun;

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(170, 59, 255, 0.06) 100%)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--status-danger)',
              color: 'var(--status-danger)',
              padding: '0.55rem',
              borderRadius: 'var(--radius-md)'
            }}>
              <Flame size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Breach Rehearsal & Recovery Proof
                </h1>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--status-danger)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  SIGNATURE DEFENSE ENGINE
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Controlled adversarial breach exercises. Exercises operate strictly on isolated dummy fixtures, demonstrate active containment, and cryptographically prove trusted recovery.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: 'var(--status-success)'
            }}>
              <ShieldCheck size={14} />
              <span>ISOLATION ENCLAVE READY</span>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{
          background: 'var(--status-danger-bg)',
          border: '1px solid var(--status-danger)',
          color: 'var(--status-danger)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Control Panel + Live Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(460px, 1.8fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Scenario Selection & Start Panel */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          height: 'fit-content'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
            Select Rehearsal Scenario
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
            Choose a controlled security exercise. PHOENIX will execute live adversarial mutations against isolated dummy assets and record tamper detection, containment, and recovery proof.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {/* Scenario A */}
            <div
              onClick={() => setSelectedScenario('CONTENT_TAMPERING')}
              style={{
                border: selectedScenario === 'CONTENT_TAMPERING' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: selectedScenario === 'CONTENT_TAMPERING' ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Scenario A: Content Tampering Drill
                </span>
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--status-info)', fontWeight: 600 }}>
                  STORAGE INTEGRITY
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Injects simulated byte alteration into an isolated test document ciphertext. Proves detection by SHA-256 verification, incident containment, and verified restoration from trusted backup.
              </p>
            </div>

            {/* Scenario B */}
            <div
              onClick={() => setSelectedScenario('METADATA_TAMPERING')}
              style={{
                border: selectedScenario === 'METADATA_TAMPERING' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: selectedScenario === 'METADATA_TAMPERING' ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Scenario B: Metadata Tampering Drill
                </span>
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(170, 59, 255, 0.1)', color: 'var(--accent)', fontWeight: 600 }}>
                  MANIFEST MAC FORGERY
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Adversarially modifies hash records inside a test manifest. Proves HMAC-SHA256 signature mismatch detection, metadata quarantine, and recovery from signing authority.
              </p>
            </div>

            {/* Scenario C */}
            <div
              onClick={() => setSelectedScenario('UNAUTHORIZED_SESSION')}
              style={{
                border: selectedScenario === 'UNAUTHORIZED_SESSION' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: selectedScenario === 'UNAUTHORIZED_SESSION' ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Scenario C: Unauthorized Session Drill
                </span>
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)', fontWeight: 600 }}>
                  BOUNDARY DEFENSE
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Simulates an attacker attempting vault access with a forged credential token. Proves immediate authorization boundary enforcement (HTTP 401) and isolation integrity.
              </p>
            </div>
          </div>

          {/* Start Rehearsal Button */}
          <button
            onClick={handleStartRehearsal}
            disabled={isRunning}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1.25rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.75 : 1,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
            }}
          >
            {isRunning ? (
              <>
                <RefreshCw size={18} className="spin-animation" />
                <span>Executing Rehearsal & Telemetry...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="#ffffff" />
                <span>Start Controlled Breach Rehearsal</span>
              </>
            )}
          </button>
        </div>

        {/* Live Execution Telemetry & Report Panel */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-regular)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} color="var(--accent)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Rehearsal Execution Telemetry & Evidence
              </h2>
            </div>

            {currentDisplayReport && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleExportJson(currentDisplayReport)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={13} />
                  <span>Export JSON</span>
                </button>
              </div>
            )}
          </div>

          {isRunning ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid rgba(239, 68, 68, 0.2)',
                borderTopColor: 'var(--status-danger)',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '1rem'
              }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Running Security Simulation Pipeline...
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Executing cryptographic tamper check, containment lock, and recovery proof
              </div>
            </div>
          ) : currentDisplayReport ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Overall Outcome Banner */}
              <div style={{
                background: currentDisplayReport.overallOutcome === 'PASSED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${currentDisplayReport.overallOutcome === 'PASSED' ? 'var(--status-success)' : 'var(--status-danger)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Rehearsal Outcome — Run ID: <code>{currentDisplayReport.runId}</code>
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: currentDisplayReport.overallOutcome === 'PASSED' ? 'var(--status-success)' : 'var(--status-danger)',
                    marginTop: '0.15rem'
                  }}>
                    {currentDisplayReport.overallOutcome === 'PASSED' ? 'REHEARSAL PROOF VERIFIED: PASSED' : 'REHEARSAL OUTCOME: FAILED'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Scenario: <strong>{currentDisplayReport.scenario}</strong> • Measured Execution: <strong>{currentDisplayReport.totalDurationMs}ms</strong>
                  </div>
                </div>

                <div style={{
                  background: currentDisplayReport.overallOutcome === 'PASSED' ? 'var(--status-success)' : 'var(--status-danger)',
                  color: '#ffffff',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {currentDisplayReport.overallOutcome}
                </div>
              </div>

              {/* Step-by-Step Executed Checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Step-by-Step Cryptographic Telemetry ({currentDisplayReport.steps?.length || 0} checks)
                </div>

                {currentDisplayReport.steps?.map((st, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {st.status === 'PASSED' ? (
                        <CheckCircle2 size={16} color="var(--status-success)" />
                      ) : (
                        <AlertTriangle size={16} color="var(--status-danger)" />
                      )}
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {i + 1}. {st.stepName}
                        </div>
                        {st.evidence?.reason && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {st.evidence.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {st.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>

              {/* Limitations Notice */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4
              }}>
                <strong>Security Proof & Limitations Note:</strong> {currentDisplayReport.limitationsNote}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <Flame size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Select a scenario and click <strong>"Start Controlled Breach Rehearsal"</strong> to execute live defense demonstration.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Rehearsal Runs Ledger */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Persistent Rehearsal Run History
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Audit-verified log of completed breach rehearsal simulations and recovery proofs.
            </div>
          </div>
          <button
            onClick={loadRuns}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {loadingRuns ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading rehearsal ledger...
          </div>
        ) : runs.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No rehearsal runs executed yet. Run your first breach drill above!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Run ID</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Scenario</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Execution Timestamp</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Summary</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                      {r.id}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>
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
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.result_summary}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewHistoricalRun(r.id)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid var(--status-info)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--status-info)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        View Report
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
