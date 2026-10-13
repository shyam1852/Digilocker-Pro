import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Activity,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  Stethoscope,
  Info,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { auditPolicyDocumentOnDevice } from '../utils/policyAuditor';
import DocumentDetailModal from '../components/DocumentDetailModal';

export const HEALTHCARE_CATEGORIES = [
  'Health Insurance',
  'Health & Medical',
  'Medical Prescription',
  'Diagnostic Lab Report',
  'Hospital Discharge Summary',
  'Vaccination Certificate',
  'ABHA / Health ID'
];

export const HEALTH_CHECKLIST = [
  { id: 'chk_abha', title: 'ABHA Health ID Card', desc: 'Ayushman Bharat Digital Mission universal health identification', category: 'ABHA / Health ID' },
  { id: 'chk_policy', title: 'Active Health Insurance Policy & TPA Card', desc: 'Comprehensive hospitalization and cashless claim card', category: 'Health Insurance' },
  { id: 'chk_ped', title: 'Pre-Existing Disease (PED) Diagnostic Records', desc: 'Medical history, baseline lab tests, and doctor notes', category: 'Health & Medical' },
  { id: 'chk_presc', title: 'Active Ongoing Prescriptions', desc: 'Current medication regimens and physician orders', category: 'Medical Prescription' },
  { id: 'chk_vax', title: 'Vaccination & Immunization Record', desc: 'COVID-19, travel vaccines, and preventive immunizations', category: 'Vaccination Certificate' }
];

export default function HealthcarePage({ onOpenUpload, onNavigateToAssistant }) {
  const { documents, decryptDocument } = useVault();
  const [selectedDocForDetail, setSelectedDocForDetail] = useState(null);
  const [auditDoc, setAuditDoc] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Filter vault documents to healthcare categories
  const healthDocs = useMemo(() => {
    return documents.filter((doc) => {
      const cat = doc.category || '';
      const title = (doc.title || '').toLowerCase();
      return (
        HEALTHCARE_CATEGORIES.includes(cat) ||
        cat.toLowerCase().includes('health') ||
        cat.toLowerCase().includes('medical') ||
        title.includes('health') ||
        title.includes('mediclaim') ||
        title.includes('prescription') ||
        title.includes('hospital') ||
        title.includes('vaccin') ||
        title.includes('blood') ||
        title.includes('doctor')
      );
    });
  }, [documents]);

  const displayDocs = useMemo(() => {
    if (filterCategory === 'ALL') return healthDocs;
    return healthDocs.filter((d) => d.category === filterCategory || (filterCategory === 'Health Insurance' && d.category?.toLowerCase().includes('health')));
  }, [healthDocs, filterCategory]);

  // Checklist completion mapping
  const checklistStatus = useMemo(() => {
    return HEALTH_CHECKLIST.map((item) => {
      const matched = healthDocs.find(d => {
        const title = (d.title + ' ' + (d.category || '')).toLowerCase();
        if (item.id === 'chk_abha') return title.includes('abha') || title.includes('health id');
        if (item.id === 'chk_policy') return d.category === 'Health Insurance' || title.includes('mediclaim') || title.includes('health insurance');
        if (item.id === 'chk_ped') return title.includes('report') || title.includes('discharge') || title.includes('history');
        if (item.id === 'chk_presc') return title.includes('prescription') || title.includes('rx');
        if (item.id === 'chk_vax') return title.includes('vaccin') || title.includes('immuniz');
        return false;
      });
      return { ...item, matchedDoc: matched || null };
    });
  }, [healthDocs]);

  const handleRunPolicyAudit = async (doc) => {
    setIsAuditing(true);
    setAuditDoc(doc);
    try {
      // Decrypt document in browser memory using AES-256-GCM
      const decrypted = await decryptDocument(doc);
      let textContent = '';
      if (typeof decrypted === 'string') {
        textContent = decrypted;
      } else if (decrypted?.textContent) {
        textContent = decrypted.textContent;
      } else if (decrypted?.fileName) {
        textContent = `${doc.title} ${doc.insurer_name || ''} Policy Terms & Conditions Room Rent Limit Co-payment Waiting Period Sub-limit Pre-existing disease`;
      }

      // Run on-device explainable rule evaluation
      const report = auditPolicyDocumentOnDevice({
        rawText: textContent,
        category: 'Health Insurance',
        title: doc.title,
        metadata: {
          insurer_name: doc.insurer_name,
          policy_number: doc.policy_number
        }
      });
      setAuditResult(report);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HeartPulse size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Healthcare Workspace</h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Client-side encrypted health insurance policies, medical records, diagnostic reports & coverage auditing
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onNavigateToAssistant && (
            <button
              onClick={() => onNavigateToAssistant('healthcare')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', gap: '0.4rem' }}
            >
              <Sparkles size={14} style={{ color: '#3b82f6' }} />
              <span>Ask Health Assistant</span>
            </button>
          )}
          <button
            onClick={onOpenUpload}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.4rem' }}
          >
            <Plus size={14} />
            <span>Upload Medical Record</span>
          </button>
        </div>
      </div>

      {/* Medical Privacy & Regulatory Disclaimer */}
      <div style={{
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(59, 130, 246, 0.06)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        <Info size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <div>
          <strong>Zero-Knowledge Medical Confidentiality:</strong> Your health documents are encrypted locally on your device with AES-256-GCM. DM Assistant explains administrative policy terms, waiting periods, and checklist readiness. It <strong>never diagnoses medical conditions or replaces registered medical practitioners</strong>.
        </div>
      </div>

      {/* Top Grid: Healthcare Checklist & Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Healthcare Readiness Checklist */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981' }} />
              <span>Essential Healthcare Records Checklist</span>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              {checklistStatus.filter(c => c.matchedDoc).length} / {HEALTH_CHECKLIST.length} READY
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {checklistStatus.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: item.matchedDoc ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                  border: `1px solid ${item.matchedDoc ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>

                {item.matchedDoc ? (
                  <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                    Available
                  </span>
                ) : (
                  <button
                    onClick={onOpenUpload}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                  >
                    Upload
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Health Policy Gap Audit Quick Launcher */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            <Activity size={16} style={{ color: '#06b6d4' }} />
            <span>Health Insurance Coverage & Exclusion Auditor</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
            Evaluates your health policies on-device for room-rent sub-limits, mandatory co-payments, pre-existing disease waiting periods, and common exclusion clauses.
          </p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {healthDocs.filter(d => d.category === 'Health Insurance' || d.title?.toLowerCase().includes('health')).slice(0, 3).map(doc => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.insurer_name || 'Health Insurer'}</div>
                </div>

                <button
                  onClick={() => handleRunPolicyAudit(doc)}
                  disabled={isAuditing}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                >
                  <Activity size={12} />
                  <span>Audit Policy</span>
                </button>
              </div>
            ))}

            {healthDocs.filter(d => d.category === 'Health Insurance').length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No health insurance policies uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Policy Audit Report Modal */}
      {auditResult && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={18} style={{ color: '#06b6d4' }} />
              <span>Policy Gap Audit Findings for "{auditDoc?.title}"</span>
            </div>
            <button
              onClick={() => setAuditResult(null)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem' }}
            >
              Close Report
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{auditResult.summary.potential_gaps}</div>
              <div style={{ fontSize: '0.7rem' }}>Potential Gaps</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{auditResult.summary.important_clauses}</div>
              <div style={{ fontSize: '0.7rem' }}>Key Clauses</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{auditResult.summary.missing_info}</div>
              <div style={{ fontSize: '0.7rem' }}>Not Found in Text</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {auditResult.findings.slice(0, 5).map((f, i) => (
              <div
                key={i}
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  <span>{f.rule_name}</span>
                  <span className={`badge ${f.classification === 'Potential gap' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                    {f.classification}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{f.explanation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Documents List */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Encrypted Healthcare Repository ({displayDocs.length})
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['ALL', 'Health Insurance', 'Medical Prescription', 'Diagnostic Lab Report', 'Vaccination Certificate', 'ABHA / Health ID'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
              >
                {cat === 'ALL' ? 'All Records' : cat}
              </button>
            ))}
          </div>
        </div>

        {displayDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <HeartPulse size={36} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>No healthcare documents deposited</div>
            <div style={{ fontSize: '0.75rem', margin: '0.3rem 0 1rem' }}>Upload medical records, health policies, and prescriptions to secure them client-side.</div>
            <button onClick={onOpenUpload} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
              <Plus size={14} />
              <span>Deposit Health Document</span>
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Provider / Insurer</th>
                  <th>Validity / Expiry</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.file_name}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {doc.category || 'Health Record'}
                      </span>
                    </td>
                    <td>{doc.insurer_name || '—'}</td>
                    <td>{doc.expiry_date || 'Ongoing'}</td>
                    <td>
                      <span className={`badge ${doc.status === 'expired' ? 'badge-danger' : (doc.status === 'expiring_soon' ? 'badge-warning' : 'badge-success')}`} style={{ fontSize: '0.7rem' }}>
                        {doc.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {doc.category === 'Health Insurance' && (
                          <button
                            onClick={() => handleRunPolicyAudit(doc)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                            title="Audit Policy Clauses"
                          >
                            <Activity size={12} />
                            <span>Audit</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDocForDetail(doc)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      {selectedDocForDetail && (
        <DocumentDetailModal
          doc={selectedDocForDetail}
          onClose={() => setSelectedDocForDetail(null)}
        />
      )}
    </div>
  );
}
