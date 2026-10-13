import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Briefcase,
  FileCheck,
  Upload,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Search,
  BookOpen,
  Info
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { checkJobApplicationRequirements } from '../utils/financeCalculators';
import DocumentDetailModal from '../components/DocumentDetailModal';

export const CAREER_CATEGORIES = [
  'Education & Academics',
  'Career & Employment',
  'Identity & Government ID'
];

export default function CareerEducationPage({ onOpenUpload, onNavigateToAssistant }) {
  const { documents } = useVault();
  const [selectedDocForDetail, setSelectedDocForDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('checker'); // 'checker' | 'repository'

  // Filter vault documents to Career, Education & Identity
  const careerDocs = useMemo(() => {
    return documents.filter((doc) => {
      const cat = doc.category || '';
      const title = (doc.title || '').toLowerCase();
      return (
        CAREER_CATEGORIES.includes(cat) ||
        cat.toLowerCase().includes('education') ||
        cat.toLowerCase().includes('career') ||
        cat.toLowerCase().includes('identity') ||
        title.includes('resume') ||
        title.includes('cv') ||
        title.includes('marksheet') ||
        title.includes('10th') ||
        title.includes('12th') ||
        title.includes('degree') ||
        title.includes('certificate') ||
        title.includes('experience') ||
        title.includes('aadhaar') ||
        title.includes('pan') ||
        title.includes('passport')
      );
    });
  }, [documents]);

  // Job Gap Checker State
  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    'Senior Software Engineer / Technical Lead. Requirements: Bachelor of Technology (B.Tech) or Master of Science in Computer Science. Minimum 3+ years experience in Node.js and React. Date of birth proof (10th marksheet or birth certificate), updated resume, and valid government photo identity (Aadhaar/PAN/Passport) required for background verification.'
  );
  const [selectedDocIdsForCheck, setSelectedDocIdsForCheck] = useState(
    careerDocs.map((d) => d.id)
  );
  const [jobCheckResult, setJobCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Initialize automatic check on first render if docs exist
  const handleRunJobCheck = (e) => {
    e?.preventDefault();
    if (!jobDescriptionInput.trim()) return;

    setIsChecking(true);
    const selectedDocs = careerDocs.filter((d) => selectedDocIdsForCheck.includes(d.id));
    const result = checkJobApplicationRequirements(jobDescriptionInput, selectedDocs);
    setJobCheckResult(result);
    setIsChecking(false);
  };

  const toggleSelectDocForCheck = (id) => {
    if (selectedDocIdsForCheck.includes(id)) {
      setSelectedDocIdsForCheck(selectedDocIdsForCheck.filter((item) => item !== id));
    } else {
      setSelectedDocIdsForCheck([...selectedDocIdsForCheck, id]);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Career & Education Workspace</h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Degrees, marksheets, resumes, identity credentials & automated recruitment document gap evaluation
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onNavigateToAssistant && (
            <button
              onClick={() => onNavigateToAssistant('job-gap-checker')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', gap: '0.4rem' }}
            >
              <Sparkles size={14} style={{ color: '#3b82f6' }} />
              <span>Ask Job Assistant</span>
            </button>
          )}
          <button
            onClick={onOpenUpload}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.4rem' }}
          >
            <Plus size={14} />
            <span>Upload Certificate / Resume</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => {
            setActiveTab('checker');
            if (!jobCheckResult) handleRunJobCheck();
          }}
          className={`btn btn-sm ${activeTab === 'checker' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <FileCheck size={14} />
          <span>Job Application Document Gap Checker</span>
        </button>

        <button
          onClick={() => setActiveTab('repository')}
          className={`btn btn-sm ${activeTab === 'repository' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <BookOpen size={14} />
          <span>Academic & Career Records ({careerDocs.length})</span>
        </button>
      </div>

      {/* TAB 1: JOB APPLICATION GAP CHECKER */}
      {activeTab === 'checker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Input & Document Selection Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Job Description Input Card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Briefcase size={16} style={{ color: '#6366f1' }} />
                <span>Recruitment Criteria / Job Description</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                Paste the job requirements, UPSC/SSC notification text, or corporate recruitment eligibility criteria below.
              </p>

              <form onSubmit={handleRunJobCheck}>
                <textarea
                  rows={6}
                  value={jobDescriptionInput}
                  onChange={(e) => setJobDescriptionInput(e.target.value)}
                  placeholder="Paste job posting or notification criteria here..."
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.78rem', resize: 'vertical', marginBottom: '0.75rem', fontFamily: 'inherit' }}
                  required
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Evaluates Date of Birth, Degrees, Experience, IDs, and NOC clauses.
                  </span>
                  <button
                    type="submit"
                    disabled={isChecking}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <FileCheck size={14} />
                    <span>{isChecking ? 'Evaluating...' : 'Check My Documents'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Document Authorization Drawer */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Authorized Vault Records ({selectedDocIdsForCheck.length}/{careerDocs.length})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDocIdsForCheck.length === careerDocs.length) setSelectedDocIdsForCheck([]);
                    else setSelectedDocIdsForCheck(careerDocs.map(d => d.id));
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                >
                  {selectedDocIdsForCheck.length === careerDocs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
                Zero-Knowledge Privacy: Only documents checked below are inspected by the gap evaluator.
              </p>

              <div style={{ flex: 1, maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {careerDocs.map((doc) => {
                  const isChecked = selectedDocIdsForCheck.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-surface)',
                        border: `1px solid ${isChecked ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectDocForCheck(doc.id)}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{doc.category}</div>
                      </div>
                    </label>
                  );
                })}

                {careerDocs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    No academic or career documents found in vault. Upload your certificates to run evaluation.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Checklist Card */}
          {jobCheckResult && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} style={{ color: jobCheckResult.missingMandatoryCount === 0 ? '#10b981' : '#f59e0b' }} />
                    <span>Application Readiness Score: {jobCheckResult.readinessScore}%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {jobCheckResult.availableCount} Available • {jobCheckResult.missingMandatoryCount} Mandatory Missing
                  </div>
                </div>

                <span className={`badge ${jobCheckResult.missingMandatoryCount === 0 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                  {jobCheckResult.missingMandatoryCount === 0 ? 'Ready to Apply' : 'Action Required (Missing Docs)'}
                </span>
              </div>

              {/* Requirement Items Table */}
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Required Credential / Certificate</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Vault Match</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobCheckResult.requirements.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.title}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{req.reason}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                            {req.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${req.mandatory ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                            {req.mandatory ? 'Mandatory' : 'Optional / Conditional'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              req.status === 'Available'
                                ? 'badge-success'
                                : req.status === 'Missing'
                                ? 'badge-danger'
                                : req.status === 'Expired'
                                ? 'badge-danger'
                                : 'badge-neutral'
                            }`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td>
                          {req.matchedDocument ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              "{req.matchedDocument.title}"
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>None found</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {req.matchedDocument ? (
                            <button
                              onClick={() => setSelectedDocForDetail(careerDocs.find(d => d.id === req.matchedDocument.id))}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                            >
                              Inspect
                            </button>
                          ) : (
                            <button
                              onClick={onOpenUpload}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                            >
                              Upload
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                ℹ️ {jobCheckResult.notice}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACADEMIC & CAREER RECORDS REPOSITORY */}
      {activeTab === 'repository' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Academic Certificates & Career Documents ({careerDocs.length})
          </div>

          {careerDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <GraduationCap size={36} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>No career or educational records deposited yet</div>
              <div style={{ fontSize: '0.75rem', margin: '0.3rem 0 1rem' }}>Upload degrees, marksheets, resumes, and service certificates.</div>
              <button onClick={onOpenUpload} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
                <Plus size={14} />
                <span>Deposit Academic Record</span>
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Type / File</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {careerDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.file_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {doc.category}
                        </span>
                      </td>
                      <td>{doc.file_type?.split('/')[1]?.toUpperCase() || 'DOCUMENT'}</td>
                      <td>{Math.round((doc.file_size_bytes || 0) / 1024)} KB</td>
                      <td>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedDocForDetail(doc)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
