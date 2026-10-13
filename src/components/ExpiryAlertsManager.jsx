import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Send,
  Check,
  CheckCircle2,
  Clock,
  Calendar,
  Edit2,
  RefreshCw,
  Sliders,
  X,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

export default function ExpiryAlertsManager({ onSelectPolicyForRenewal }) {
  const { user, token } = useAuth();
  const { updateDocumentExpiry, toggleDocumentReminders } = useVault();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // User Preferences State
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [intervals, setIntervals] = useState([30, 7, 1]);
  const [postExpiry, setPostExpiry] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');

  // Test Email State
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Manual Check Now State
  const [checkingNow, setCheckingNow] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  // Edit Expiry Modal State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);
  const [docError, setDocError] = useState('');

  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = token || localStorage.getItem('dmlocker_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/reminders/status', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setEmailEnabled(json.settings?.reminder_email_enabled ?? true);
        setIntervals(json.settings?.reminder_intervals || [30, 7, 1]);
        setPostExpiry(json.settings?.reminder_post_expiry ?? false);
        setTimezone(json.settings?.timezone || 'Asia/Kolkata');
      }
    } catch (err) {
      console.warn('Failed to load reminder status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/reminders/logs', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch reminder logs:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, [token]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedMessage('');
    try {
      const res = await fetch('/api/reminders/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reminder_email_enabled: emailEnabled,
          reminder_intervals: intervals,
          reminder_post_expiry: postExpiry,
          timezone
        })
      });
      if (res.ok) {
        setSettingsSavedMessage('Notification preferences updated and saved.');
        setTimeout(() => setSettingsSavedMessage(''), 3000);
        await fetchStatus();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleInterval = (day) => {
    if (intervals.includes(day)) {
      if (intervals.length === 1) return; // Keep at least one
      setIntervals(intervals.filter((i) => i !== day));
    } else {
      setIntervals([...intervals, day].sort((a, b) => b - a));
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/reminders/send-test', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (!res.ok) {
        setTestResult({
          success: false,
          mockMode: false,
          error: json.error || `HTTP ${res.status}: Failed to send test email`
        });
      } else {
        setTestResult(json);
      }
      await fetchLogs();
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const handleCheckNow = async () => {
    setCheckingNow(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/reminders/check-now', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ forceSend: false })
      });
      const json = await res.json();
      if (!res.ok) {
        setCheckResult({ status: 'ERROR', error: json.error || 'Check failed' });
      } else {
        setCheckResult(json.result);
      }
      await fetchStatus();
      await fetchLogs();
    } catch (err) {
      setCheckResult({ status: 'ERROR', error: err.message });
    } finally {
      setCheckingNow(false);
    }
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditDate(doc.expiry_date || '');
    setEditCategory(doc.category || 'Health Insurance');
    setDocError('');
  };

  const handleSaveDocExpiry = async (e) => {
    e.preventDefault();
    setSavingDoc(true);
    setDocError('');
    try {
      if (editDate && !/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
        throw new Error('Please choose a valid YYYY-MM-DD date.');
      }
      await updateDocumentExpiry(editingDoc.id, editDate, editCategory);
      setEditingDoc(null);
      await fetchStatus();
      await fetchLogs();
    } catch (err) {
      setDocError(err.message || 'Failed to update expiry date');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleToggleDocReminder = async (docId, currentEnabled) => {
    try {
      await toggleDocumentReminders(docId, !currentEnabled);
      await fetchStatus();
    } catch (err) {
      console.warn('Failed to toggle document reminder:', err);
    }
  };

  // Determine next reminder label
  const getNextReminderLabel = (daysRemaining) => {
    if (daysRemaining === null) return 'No Date Set';
    if (daysRemaining < 0) return 'Overdue';
    if (daysRemaining === 0) return 'Expires Today';

    const sorted = [...intervals].sort((a, b) => b - a);
    const nextStage = sorted.find((i) => daysRemaining >= i);
    if (nextStage !== undefined) {
      return `Next at ${nextStage}d (${daysRemaining - nextStage}d away)`;
    }
    return 'Final expiry window';
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
        <div>Loading Expiry Alert System...</div>
      </div>
    );
  }

  const emailConfig = data?.email || { isConfigured: false, mockMode: true };
  const documents = data?.documents || [];

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="brand-mark" style={{ width: '36px', height: '36px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Bell size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Smart Expiry Alerts & Email Reminders
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Zero-knowledge notifications sent to your registered email ({data?.settings?.recipient_email || user?.email})
            </p>
          </div>
        </div>

        {/* SMTP Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {emailConfig.isConfigured ? (
            <span className="badge badge-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }} />
              SMTP CONNECTED ({emailConfig.host}:{emailConfig.port})
            </span>
          ) : (
            <span className="badge badge-simulation" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }} />
              DEVELOPMENT SANDBOX (MOCK DISPATCH MODE)
            </span>
          )}
        </div>
      </div>

      {/* Configuration & Quick Actions Panel */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-regular)' }}>
        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Master Toggle & Recipient */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={15} style={{ color: 'var(--accent)' }} />
                <span>Delivery Status & Channel</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                />
                <span style={{ fontWeight: 600, color: emailEnabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {emailEnabled ? 'Email Reminders Active' : 'Email Reminders Muted'}
                </span>
              </label>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div><strong>Registered Email:</strong> {data?.settings?.recipient_email || user?.email}</div>
                <div style={{ marginTop: '0.2rem' }}>Timezone: <strong>{timezone}</strong></div>
              </div>
            </div>

            {/* Configurable Reminder Intervals */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sliders size={15} style={{ color: 'var(--accent)' }} />
                <span>Reminder Schedule Intervals</span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {[30, 7, 1, 0].map((d) => {
                  const isChecked = intervals.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleInterval(d)}
                      className={`btn btn-sm ${isChecked ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                    >
                      {isChecked && <Check size={12} />}
                      <span>{d === 0 ? 'Expiry Day (0d)' : `${d} Days Before`}</span>
                    </button>
                  );
                })}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={postExpiry}
                  onChange={(e) => setPostExpiry(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: 'var(--accent)' }}
                />
                <span>Send single post-expiry reminder (no daily spam)</span>
              </label>
            </div>

            {/* Test Actions & Cooldown */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={15} style={{ color: '#eab308' }} />
                <span>Verification & Test Actions</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem' }}
                  title="Dispatches a test email to verify SMTP handshake"
                >
                  <Send size={12} />
                  <span>{sendingTest ? 'Sending Test...' : 'Send Test Email'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckNow}
                  disabled={checkingNow}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem' }}
                  title="Evaluates all vault documents for due reminders right now"
                >
                  <RefreshCw size={12} className={checkingNow ? 'animate-spin' : ''} />
                  <span>{checkingNow ? 'Checking...' : 'Check Due Now'}</span>
                </button>
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Protected by atomic DB duplicate prevention & mutex locking.
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {settingsSavedMessage && (
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} />
              <span>{settingsSavedMessage}</span>
            </div>
          )}

          {testResult && (
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: testResult.success ? 'var(--status-success-bg)' : 'rgba(234, 179, 8, 0.1)', color: testResult.success ? 'var(--status-success)' : '#eab308', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
              {testResult.success ? (
                <div>
                  <strong>✅ Test Email Sent:</strong> {testResult.message}
                </div>
              ) : (
                <div>
                  <strong>Notice ({testResult.mockMode ? 'Mock Sandbox' : 'SMTP Error'}):</strong>{' '}
                  {testResult.message || testResult.error}
                </div>
              )}
            </div>
          )}

          {checkResult && (
            <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
              <strong>Execution Result:</strong> Checked {checkResult.checkedDocuments} document(s). Sent: {checkResult.sent}, Skipped Already Sent: {checkResult.skippedAlreadySent}, Skipped Muted: {checkResult.skippedDisabled}.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={savingSettings}
              className="btn btn-primary btn-sm"
            >
              {savingSettings ? 'Saving...' : 'Save Notification Preferences'}
            </button>
          </div>
        </form>
      </div>

      {/* Monitored Documents Table */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Vault Documents Expiration Tracker ({documents.length})
            </h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
              Calculated using configured timezone ({timezone}) • Manual date corrections supported
            </p>
          </div>
        </div>

        {documents.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No documents in custody. Deposit a policy in Document Vault to enable smart expiry tracking.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem 1rem' }}>Document Record</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Expiry Date</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Status / Days Left</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Next Reminder</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Email Alert</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const days = doc.days_remaining;
                  const isExpired = days !== null && days < 0;
                  const isUrgent = days !== null && days >= 0 && days <= 7;
                  const isUpcoming = days !== null && days > 7 && days <= 30;

                  return (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.category}</div>
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        {doc.expiry_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{doc.expiry_date}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None specified</span>
                        )}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        {days === null ? (
                          <span className="badge" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                            No Date Set
                          </span>
                        ) : isExpired ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            Expired {Math.abs(days)}d ago
                          </span>
                        ) : isUrgent ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(234, 88, 12, 0.15)', color: '#ea580c' }}>
                            Urgent: {days}d remaining
                          </span>
                        ) : isUpcoming ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                            {days}d remaining
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            Active ({days}d)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                        {getNextReminderLabel(days)}
                      </td>

                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleDocReminder(doc.id, Boolean(doc.reminders_enabled))}
                          className={`btn btn-sm ${doc.reminders_enabled ? 'btn-secondary' : ''}`}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.5rem',
                            opacity: doc.reminders_enabled ? 1 : 0.6
                          }}
                          title={doc.reminders_enabled ? 'Click to mute email alerts for this document' : 'Click to enable email alerts'}
                        >
                          {doc.reminders_enabled ? 'Active' : 'Muted'}
                        </button>
                      </td>

                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(doc)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', marginRight: '0.4rem', fontSize: '0.7rem' }}
                          title="Manually enter or correct expiry date"
                        >
                          <Edit2 size={12} />
                          <span>Edit Expiry</span>
                        </button>

                        {onSelectPolicyForRenewal && (
                          <button
                            type="button"
                            onClick={() => onSelectPolicyForRenewal(doc.id)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                          >
                            <span>Renew</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notification Audit Log Collapsible Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem', border: '1px solid var(--border-subtle)' }}>
        <div
          onClick={() => setShowLogs(!showLogs)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Reminder Dispatch Ledger & Audit History ({logs.length})
            </span>
          </div>
          {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {showLogs && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            {logs.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No notifications dispatched yet. Reminders are recorded here upon scheduled evaluation.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Dispatched At</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Document</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Stage</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Recipient</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{log.document_title}</td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          {log.interval_days < 0
                            ? 'Overdue Alert'
                            : log.interval_days === 0
                            ? 'Expiry Day'
                            : `${log.interval_days}d Before`}
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>{log.recipient_email}</td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                log.status === 'SENT'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : log.status === 'FAILED'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'var(--bg-surface)',
                              color:
                                log.status === 'SENT'
                                  ? '#10b981'
                                  : log.status === 'FAILED'
                                  ? '#ef4444'
                                  : 'var(--text-muted)',
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.4rem'
                            }}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Expiry Date Modal */}
      {editingDoc && (
        <div className="modal-overlay" onClick={() => setEditingDoc(null)} role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Manual Expiry Date Entry</h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {docError && (
              <div style={{ padding: '0.65rem', backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {docError}
              </div>
            )}

            <form onSubmit={handleSaveDocExpiry}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Document</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{editingDoc.title}</div>
              </div>

              <div className="input-group">
                <label className="input-label">Document Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="input-control"
                >
                  <option value="Health Insurance">Health Insurance</option>
                  <option value="Life Insurance">Life Insurance</option>
                  <option value="Vehicle Insurance">Vehicle Insurance</option>
                  <option value="Property Deed">Property Deed</option>
                  <option value="Identity Document">Identity Document</option>
                  <option value="Financial Asset">Financial Asset</option>
                  <option value="Other Records">Other Records</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Expiry or Validity Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="input-control"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Clear the input to remove expiry date, or enter the confirmed policy validity date.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="btn btn-primary"
                >
                  {savingDoc ? 'Saving...' : 'Save Expiry Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
