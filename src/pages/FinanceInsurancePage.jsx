import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Shield,
  TrendingUp,
  Calculator,
  Compass,
  FileText,
  Plus,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { computeLicMaturity, generateInvestmentComparison, OFFICIAL_SOURCES, KNOWN_LIC_PLANS } from '../utils/financeCalculators';
import DocumentDetailModal from '../components/DocumentDetailModal';

export const FINANCE_CATEGORIES = [
  'Life Insurance',
  'Vehicle Insurance',
  'Health Insurance',
  'Financial Documents',
  'Tax Documents',
  'Legal & Property'
];

export default function FinanceInsurancePage({ onOpenUpload, onNavigateToAssistant }) {
  const { documents } = useVault();
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'lic-calc' | 'invest-guide'
  const [selectedDocForDetail, setSelectedDocForDetail] = useState(null);

  // Filter financial vault documents
  const financeDocs = useMemo(() => {
    return documents.filter((doc) => {
      const cat = doc.category || '';
      const title = (doc.title || '').toLowerCase();
      return (
        FINANCE_CATEGORIES.includes(cat) ||
        cat.toLowerCase().includes('insurance') ||
        cat.toLowerCase().includes('financ') ||
        cat.toLowerCase().includes('tax') ||
        title.includes('lic') ||
        title.includes('insurance') ||
        title.includes('policy') ||
        title.includes('tax') ||
        title.includes('bank') ||
        title.includes('pan') ||
        title.includes('fd')
      );
    });
  }, [documents]);

  // LIC Calculator State
  const [licPlanNumber, setLicPlanNumber] = useState('936');
  const [licSumAssured, setLicSumAssured] = useState(500000);
  const [licPolicyTerm, setLicPolicyTerm] = useState(21);
  const [licPpt, setLicPpt] = useState(15);
  const [licAnnualPremium, setLicAnnualPremium] = useState(24000);
  const [licBonusRate, setLicBonusRate] = useState('');
  const [licFabRate, setLicFabRate] = useState('');
  const [licResult, setLicResult] = useState(null);

  // Investment Guide State
  const [investGoal, setInvestGoal] = useState('Long-Term Wealth Creation');
  const [investHorizon, setInvestHorizon] = useState(10);
  const [investBudget, setInvestBudget] = useState(5000);
  const [investRisk, setInvestRisk] = useState('Moderate');
  const [investEmergencyReady, setInvestEmergencyReady] = useState(true);
  const [investResult, setInvestResult] = useState(null);

  const handleComputeLic = (e) => {
    e?.preventDefault();
    const result = computeLicMaturity({
      planNumber: licPlanNumber,
      sumAssured: Number(licSumAssured),
      policyTerm: Number(licPolicyTerm),
      premiumPayingTerm: Number(licPpt),
      annualPremium: Number(licAnnualPremium),
      bonusRatePer1000: licBonusRate ? Number(licBonusRate) : null,
      finalAdditionalBonusPer1000: licFabRate ? Number(licFabRate) : null
    });
    setLicResult(result);
  };

  const handleComputeInvestment = (e) => {
    e?.preventDefault();
    const result = generateInvestmentComparison({
      goal: investGoal,
      horizonYears: Number(investHorizon),
      monthlyBudget: Number(investBudget),
      riskTolerance: investRisk,
      emergencyFundReady: investEmergencyReady
    });
    setInvestResult(result);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Finance & Insurance Hub</h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                LIC policies, motor & life cover, transparent maturity calculations, tax records & objective investment education
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onNavigateToAssistant && (
            <button
              onClick={() => onNavigateToAssistant('personal-finance')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', gap: '0.4rem' }}
            >
              <Sparkles size={14} style={{ color: '#3b82f6' }} />
              <span>Ask Finance Assistant</span>
            </button>
          )}
          <button
            onClick={onOpenUpload}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', gap: '0.4rem' }}
          >
            <Plus size={14} />
            <span>Upload Policy or Statement</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`btn btn-sm ${activeSubTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <Layers size={14} />
          <span>Policies & Records ({financeDocs.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('lic-calc');
            if (!licResult) handleComputeLic();
          }}
          className={`btn btn-sm ${activeSubTab === 'lic-calc' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <Calculator size={14} />
          <span>Understand My LIC Policy</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('invest-guide');
            if (!investResult) handleComputeInvestment();
          }}
          className={`btn btn-sm ${activeSubTab === 'invest-guide' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem' }}
        >
          <Compass size={14} />
          <span>Personal Finance & Investment Guide</span>
        </button>
      </div>

      {/* TAB 1: POLICIES & RECORDS */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Life & LIC Policies</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                {financeDocs.filter(d => d.category === 'Life Insurance' || d.title?.toLowerCase().includes('lic')).length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Covered in Vault</div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Insurance Policies</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                {financeDocs.filter(d => d.category === 'Vehicle Insurance').length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#3b82f6' }}>Third-Party & Comprehensive</div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax & Financial Statements</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                {financeDocs.filter(d => d.category === 'Tax Documents' || d.category === 'Financial Documents').length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8b5cf6' }}>Encrypted Statements</div>
            </div>
          </div>

          {/* Documents Table */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Financial & Insurance Vault Assets
            </div>

            {financeDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Landmark size={36} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>No financial policies or tax records deposited yet</div>
                <div style={{ fontSize: '0.75rem', margin: '0.3rem 0 1rem' }}>Upload LIC bonds, motor policies, or tax statements to secure them.</div>
                <button onClick={onOpenUpload} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
                  <Plus size={14} />
                  <span>Upload Document</span>
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Category</th>
                      <th>Policy / Account Number</th>
                      <th>Insurer / Institution</th>
                      <th>Maturity / Expiry</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeDocs.map((doc) => (
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
                        <td>{doc.policy_number || '—'}</td>
                        <td>{doc.insurer_name || '—'}</td>
                        <td>{doc.expiry_date || 'Ongoing'}</td>
                        <td>
                          <span className={`badge ${doc.status === 'expired' ? 'badge-danger' : (doc.status === 'expiring_soon' ? 'badge-warning' : 'badge-success')}`} style={{ fontSize: '0.7rem' }}>
                            {doc.status || 'Active'}
                          </span>
                        </td>
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
        </div>
      )}

      {/* TAB 2: UNDERSTAND MY LIC POLICY & MATURITY CALCULATOR */}
      {activeSubTab === 'lic-calc' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Policy Parameters Form */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              <Calculator size={18} style={{ color: '#f59e0b' }} />
              <span>LIC Policy Inputs & Plan Selection</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
              Calculate contractual guaranteed benefits vs illustrative non-guaranteed bonuses with transparent formulas.
            </p>

            <form onSubmit={handleComputeLic} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                  Select LIC Plan
                </label>
                <select
                  value={licPlanNumber}
                  onChange={(e) => setLicPlanNumber(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.75rem' }}
                >
                  <option value="936">Table 936 — LIC Jeevan Labh (Limited Premium)</option>
                  <option value="914">Table 914 — LIC New Endowment Plan</option>
                  <option value="945">Table 945 — LIC Jeevan Umang (Whole Life)</option>
                  <option value="933">Table 933 — LIC Jeevan Lakshya (Income / Child)</option>
                  <option value="915">Table 915 — LIC New Jeevan Anand</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                    Sum Assured (₹)
                  </label>
                  <input
                    type="number"
                    value={licSumAssured}
                    onChange={(e) => setLicSumAssured(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                    min="50000"
                    step="10000"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                    Annual Premium (₹)
                  </label>
                  <input
                    type="number"
                    value={licAnnualPremium}
                    onChange={(e) => setLicAnnualPremium(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                    min="1000"
                    step="1000"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                    Policy Term (Years)
                  </label>
                  <input
                    type="number"
                    value={licPolicyTerm}
                    onChange={(e) => setLicPolicyTerm(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                    min="5"
                    max="40"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                    Premium Paying Term (PPT)
                  </label>
                  <input
                    type="number"
                    value={licPpt}
                    onChange={(e) => setLicPpt(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                    min="1"
                    max={licPolicyTerm}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                    Bonus Rate (Optional, ₹/1000 SA)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 46 (default used if blank)"
                    value={licBonusRate}
                    onChange={(e) => setLicBonusRate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                    FAB Rate (Optional, ₹/1000 SA)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 100 (auto-scaled by term)"
                    value={licFabRate}
                    onChange={(e) => setLicFabRate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.75rem' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Calculate Estimated Maturity Payout
              </button>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Official Terms: <a href={OFFICIAL_SOURCES.LIC_POLICY_CONDITIONS.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>LIC Policy Conditions <ExternalLink size={10} style={{ display: 'inline' }} /></a>
              </div>
            </form>
          </div>

          {/* Calculation Breakdown & Visuals */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Maturity Analysis & Benefit Breakdown
            </div>

            {licResult && licResult.status === 'CALCULATED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Basis badge */}
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.75rem' }}>
                  <strong>Basis:</strong> {licResult.basis}
                </div>

                {/* Big numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Contractual Guaranteed SA</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                      ₹{licResult.benefitBreakdown.guaranteedSumAssured.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#10b981' }}>100% Contractually Guaranteed</div>
                  </div>

                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Estimated Maturity Payout</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981', margin: '0.2rem 0' }}>
                      ₹{Math.round(licResult.benefitBreakdown.estimatedMaturityBenefit).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SA + SRB + FAB</div>
                  </div>

                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Premiums to Pay</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                      ₹{licResult.planDetails.totalPremiumsPaid?.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Across {licResult.planDetails.premiumPayingTerm} PPT years</div>
                  </div>

                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Estimated Net Yield (IRR)</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#3b82f6', margin: '0.2rem 0' }}>
                      {licResult.benefitBreakdown.annualizedNetYieldIRR}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Annualized Net Return</div>
                  </div>
                </div>

                {/* Calculation steps */}
                <div style={{ backgroundColor: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Calculation Steps & Assumptions:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {licResult.calculationSteps.map((step, idx) => (
                      <div key={idx}>{step}</div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  ⚠️ {licResult.disclaimer}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Click "Calculate Estimated Maturity Payout" to view the detailed breakdown.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL FINANCE & INVESTMENT GUIDE */}
      {activeSubTab === 'invest-guide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Guide Controls Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              <Compass size={18} style={{ color: '#3b82f6' }} />
              <span>Personal Finance & Asset Class Evaluator</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Objective educational comparison across sovereign debt, fixed deposits, market-linked index funds, and pure term protection. Formulated in accordance with SEBI Investor Education principles.
            </p>

            <form onSubmit={handleComputeInvestment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                  Financial Goal
                </label>
                <select
                  value={investGoal}
                  onChange={(e) => setInvestGoal(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.75rem' }}
                >
                  <option value="Long-Term Wealth Creation">Long-Term Wealth Creation</option>
                  <option value="Retirement Corpus">Retirement Corpus (NPS / Equity)</option>
                  <option value="Child Higher Education">Child Higher Education</option>
                  <option value="Home Down Payment">Home Down Payment</option>
                  <option value="Short-Term Emergency Reserve">Short-Term Emergency Reserve</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                  Time Horizon
                </label>
                <select
                  value={investHorizon}
                  onChange={(e) => setInvestHorizon(Number(e.target.value))}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.75rem' }}
                >
                  <option value={2}>Short (Under 3 Years)</option>
                  <option value={5}>Medium (3 - 7 Years)</option>
                  <option value={10}>Long (7 - 15 Years)</option>
                  <option value={15}>Very Long (15+ Years)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                  Monthly Budget (₹)
                </label>
                <input
                  type="number"
                  value={investBudget}
                  onChange={(e) => setInvestBudget(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.75rem' }}
                  min="500"
                  step="500"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.3rem' }}>
                  Risk Tolerance
                </label>
                <select
                  value={investRisk}
                  onChange={(e) => setInvestRisk(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.75rem' }}
                >
                  <option value="Conservative">Conservative (Capital Safety Focus)</option>
                  <option value="Moderate">Moderate (Balanced Debt + Equity)</option>
                  <option value="Aggressive">Aggressive (High Growth / Equity)</option>
                </select>
              </div>

              <div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.75rem' }}>
                  Compare Options
                </button>
              </div>
            </form>
          </div>

          {/* Comparison Cards Grid */}
          {investResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Guidelines banner */}
              <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                <strong>Strategic Financial Literacy Checklist:</strong>
                <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
                  {investResult.guidelines.map((g, idx) => (
                    <li key={idx} style={{ marginBottom: '0.2rem' }}>{g}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {investResult.instruments.map((inst, idx) => (
                  <div key={idx} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{inst.name}</div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{inst.category}</span>
                    </div>

                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
                      {inst.rateEstimate}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                      <div><strong>Tax Treatment:</strong> {inst.taxStatus}</div>
                      <div><strong>Lock-In & Liquidity:</strong> {inst.lockIn} ({inst.liquidity} liquidity)</div>
                      <div><strong>Risk:</strong> {inst.risk}</div>
                      <div style={{ marginTop: '0.4rem', color: '#10b981' }}><strong>Pros:</strong> {inst.pros}</div>
                      <div style={{ color: '#f59e0b' }}><strong>Cons:</strong> {inst.cons}</div>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Horizon Fit:</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>{inst.fit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                Official Education Reference: <a href={OFFICIAL_SOURCES.SEBI_INVESTOR.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>SEBI Investor Education Portal <ExternalLink size={10} style={{ display: 'inline' }} /></a> | {investResult.disclaimer}
              </div>
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
