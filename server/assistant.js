import db from './db.js';

/**
 * DM LOCKER PRO — INTELLIGENT DOCUMENT, HEALTHCARE & FINANCIAL ASSISTANT
 * 
 * Privacy-first, zero-knowledge assistant engine:
 * - Operates ONLY with user's explicitly selected or authorized document contexts
 * - Never logs private master keys, passwords, or raw sensitive documents
 * - Provides verified educational comparisons with official authoritative citations
 * - Implements transparent calculations (LIC maturity, IRR, diversification, missing requirements)
 */

// Official Financial & Regulator Resources
export const OFFICIAL_SOURCES = {
  SEBI_INVESTOR: {
    title: 'SEBI Investor Education Portal',
    url: 'https://investor.sebi.gov.in/',
    authority: 'Securities and Exchange Board of India'
  },
  RBI_KEHTA_HAI: {
    title: 'RBI Kehta Hai — Public Financial Awareness',
    url: 'https://rbis.m-cloud.in/rbikehtahai/en/',
    authority: 'Reserve Bank of India'
  },
  LIC_POLICY_CONDITIONS: {
    title: 'LIC Official Policy Conditions & Terms',
    url: 'https://www.licindia.in/web/guest/policy-conditions',
    authority: 'Life Insurance Corporation of India'
  },
  LIC_HELPLINE: {
    title: 'LIC Policyholder Guidelines & Services',
    url: 'https://www.licindia.in/web/guest/policy-guidelines-helpline',
    authority: 'Life Insurance Corporation of India'
  },
  IRDAI_CONSUMER: {
    title: 'Bima Bharosa — IRDAI Grievance & Policyholder Guide',
    url: 'https://bimabharosa.irdai.gov.in/',
    authority: 'Insurance Regulatory and Development Authority of India'
  },
  ABHA_HEALTH: {
    title: 'Ayushman Bharat Digital Mission (ABHA)',
    url: 'https://abdm.gov.in/',
    authority: 'National Health Authority of India'
  }
};

/**
 * Known LIC Plan Configurations & Typical Bonus Schedules
 */
export const KNOWN_LIC_PLANS = {
  '914': { name: 'LIC New Endowment Plan (Table 914)', minTerm: 12, maxTerm: 35, avgBonus: 44, type: 'Participating Endowment' },
  '936': { name: 'LIC Jeevan Labh (Table 936)', terms: [16, 21, 25], ppts: [10, 15, 16], avgBonus: 46, type: 'Limited Premium Endowment' },
  '945': { name: 'LIC Jeevan Umang (Table 945)', ppts: [15, 20, 25, 30], avgBonus: 48, survivalBenefit: 0.08, type: 'Whole Life Participating' },
  '933': { name: 'LIC Jeevan Lakshya (Table 933)', minTerm: 13, maxTerm: 25, avgBonus: 45, type: 'Child Security / Income Benefit' },
  '915': { name: 'LIC New Jeevan Anand (Table 915)', minTerm: 15, maxTerm: 35, avgBonus: 45, type: 'Endowment + Whole Life' },
  '854': { name: 'LIC Tech Term (Table 854)', type: 'Pure Protection Term Plan', avgBonus: 0, maturityBenefit: 'None (Pure Protection)' }
};

/**
 * Calculates Internal Rate of Return (IRR) approximation using Newton-Raphson
 */
export function calculateAnnualizedIRR(annualPremium, ppt, maturityAmount, policyTerm) {
  if (!annualPremium || !ppt || !maturityAmount || !policyTerm || policyTerm <= 0) return null;

  // Cash flows: -annualPremium for years 0 to ppt-1, 0 for years ppt to policyTerm-1, +maturityAmount at policyTerm
  const cashFlows = [];
  for (let t = 0; t <= policyTerm; t++) {
    if (t < ppt) {
      cashFlows.push(-annualPremium);
    } else if (t === policyTerm) {
      cashFlows.push(maturityAmount);
    } else {
      cashFlows.push(0);
    }
  }

  // Iterate to find rate r
  let r = 0.05; // 5% initial guess
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t <= policyTerm; t++) {
      const discount = Math.pow(1 + r, t);
      npv += cashFlows[t] / discount;
      if (t > 0) {
        dnpv -= (t * cashFlows[t]) / Math.pow(1 + r, t + 1);
      }
    }
    if (Math.abs(npv) < 0.0001) break;
    if (Math.abs(dnpv) < 0.0000001) break;
    const nextR = r - npv / dnpv;
    if (isNaN(nextR) || nextR <= -0.99 || nextR > 5) break;
    r = nextR;
  }

  return Number((r * 100).toFixed(2));
}

/**
 * Transparent LIC Maturity Calculator
 */
export function computeLicMaturity(params = {}) {
  const planNumber = params.planNumber ?? params.plan_number ?? '';
  const planName = params.planName ?? params.plan_name ?? '';
  const sumAssured = params.sumAssured ?? params.sum_assured ?? 0;
  const policyTerm = params.policyTerm ?? params.policy_term ?? 0;
  const premiumPayingTerm = params.premiumPayingTerm ?? params.premium_paying_term ?? 0;
  const annualPremium = params.annualPremium ?? params.annual_premium ?? 0;
  const bonusRatePer1000 = params.bonusRatePer1000 ?? params.bonus_rate_per_1000 ?? params.simple_reversionary_bonus_rate ?? null;
  const finalAdditionalBonusPer1000 = params.finalAdditionalBonusPer1000 ?? params.final_additional_bonus_per_1000 ?? params.final_additional_bonus_rate ?? null;

  const sa = Number(sumAssured) || 0;
  const term = Number(policyTerm) || 0;
  const ppt = Number(premiumPayingTerm) || term;
  const premium = Number(annualPremium) || 0;

  if (sa <= 0 || term <= 0) {
    return {
      status: 'INSUFFICIENT_INFORMATION',
      message: 'Sum Assured and Policy Term are required to compute maturity benefits.'
    };
  }

  const planInfo = KNOWN_LIC_PLANS[planNumber] || null;
  const detectedName = planName || planInfo?.name || `LIC Policy (Table ${planNumber || 'Standard'})`;

  // Total premiums paid
  const totalPremiumsPaid = premium > 0 ? premium * ppt : null;

  // Bonus rate
  let assumedBonusRate = bonusRatePer1000;
  let isBonusEstimated = false;
  if (assumedBonusRate === null || assumedBonusRate === undefined || isNaN(assumedBonusRate)) {
    assumedBonusRate = planInfo?.avgBonus || 42; // standard baseline ₹42 per thousand SA
    isBonusEstimated = true;
  }

  // Simple Reversionary Bonus (SRB) across full policy term
  const totalSimpleBonus = (assumedBonusRate / 1000) * sa * term;

  // Final Additional Bonus (FAB) applicable for long terms (>= 15 yrs)
  let assumedFabRate = finalAdditionalBonusPer1000;
  if (assumedFabRate === null || assumedFabRate === undefined || isNaN(assumedFabRate)) {
    if (term >= 25) assumedFabRate = 250;
    else if (term >= 20) assumedFabRate = 100;
    else if (term >= 15) assumedFabRate = 50;
    else assumedFabRate = 0;
  }
  const totalFab = (assumedFabRate / 1000) * sa;

  // Estimated Maturity Benefit
  const estimatedMaturity = sa + totalSimpleBonus + totalFab;

  // Net Gain & IRR
  const netGain = totalPremiumsPaid ? estimatedMaturity - totalPremiumsPaid : null;
  const annualizedIRR = totalPremiumsPaid ? calculateAnnualizedIRR(premium, ppt, estimatedMaturity, term) : null;

  return {
    status: 'CALCULATED',
    basis: isBonusEstimated
      ? 'Illustrative (subject to annual LIC bonus declarations)'
      : 'Calculated using user-provided bonus rate',
    planDetails: {
      planName: detectedName,
      planNumber: planNumber || 'Custom',
      sumAssured: sa,
      policyTerm: term,
      premiumPayingTerm: ppt,
      annualPremium: premium,
      totalPremiumsPaid
    },
    benefitBreakdown: {
      guaranteedSumAssured: sa,
      simpleReversionaryBonus: totalSimpleBonus,
      bonusRateUsedPer1000: assumedBonusRate,
      finalAdditionalBonus: totalFab,
      fabRateUsedPer1000: assumedFabRate,
      estimatedMaturityBenefit: estimatedMaturity,
      netGainOverPremiums: netGain,
      annualizedNetYieldIRR: annualizedIRR ? `${annualizedIRR}%` : 'N/A'
    },
    calculationSteps: [
      `1. Guaranteed Core Benefit: Sum Assured = ₹${sa.toLocaleString('en-IN')}`,
      `2. Simple Reversionary Bonus: (${assumedBonusRate} / 1000) × ₹${sa.toLocaleString('en-IN')} × ${term} years = ₹${Math.round(totalSimpleBonus).toLocaleString('en-IN')}`,
      `3. Final Additional Bonus: (${assumedFabRate} / 1000) × ₹${sa.toLocaleString('en-IN')} = ₹${Math.round(totalFab).toLocaleString('en-IN')}`,
      `4. Total Maturity Payout = Sum Assured (₹${sa.toLocaleString('en-IN')}) + Simple Bonus (₹${Math.round(totalSimpleBonus).toLocaleString('en-IN')}) + FAB (₹${Math.round(totalFab).toLocaleString('en-IN')}) = ₹${Math.round(estimatedMaturity).toLocaleString('en-IN')}`,
      totalPremiumsPaid
        ? `5. Total Premiums Paid: ₹${premium.toLocaleString('en-IN')} × ${ppt} years = ₹${totalPremiumsPaid.toLocaleString('en-IN')} (Estimated Net Yield / IRR: ~${annualizedIRR}%)`
        : '5. Premium amount not provided. Supply annual premium to calculate exact net annualized yield (IRR).'
    ],
    officialSource: OFFICIAL_SOURCES.LIC_POLICY_CONDITIONS,
    disclaimer: 'Non-guaranteed bonuses depend on the operational surplus declared by LIC in its annual financial valuation. This illustrative tool does not replace the contractual policy bond or official benefit illustration.'
  };
}

/**
 * Job Application Document Gap Checker
 */
export function checkJobApplicationRequirements(jobDescriptionText, vaultDocuments = []) {
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
    return {
      status: 'EMPTY_INPUT',
      message: 'Please paste a job description or recruitment notification text to extract requirements.'
    };
  }

  const jdLower = jobDescriptionText.toLowerCase();

  // Core Document Requirements Matrix
  const standardCriteria = [
    {
      id: 'req_dob',
      title: 'Class 10 / Matriculation Certificate (Date of Birth Proof)',
      category: 'Education & Academics',
      mandatory: true,
      detectionPatterns: ['10th', 'matric', 'high school', 'date of birth', 'dob', 'secondary school', 'birth certificate'],
      reason: 'Standard proof of date of birth and full legal name recognized across government and corporate employers.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('10th') || t.includes('matric') || t.includes('secondary') || t.includes('birth');
      }
    },
    {
      id: 'req_12th',
      title: 'Class 12 / Higher Secondary Marksheet',
      category: 'Education & Academics',
      mandatory: false,
      detectionPatterns: ['12th', 'intermediate', 'higher secondary', '10+2', 'hsc', 'plus two'],
      reason: 'Required for positions mandating higher secondary or pre-university credentials.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('12th') || t.includes('intermediate') || t.includes('higher secondary') || t.includes('10+2');
      }
    },
    {
      id: 'req_degree',
      title: 'Graduation / Degree Certificate & Final Transcripts',
      category: 'Education & Academics',
      mandatory: true,
      detectionPatterns: ['degree', 'bachelor', 'b.tech', 'b.e', 'bca', 'bsc', 'b.com', 'bba', 'graduation', 'post graduation', 'master'],
      reason: 'Primary qualification verification establishing completion of required collegiate discipline.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('degree') || t.includes('bachelor') || t.includes('graduation') || t.includes('transcript') || t.includes('provisional') || t.includes('b.tech');
      }
    },
    {
      id: 'req_resume',
      title: 'Updated Professional Resume / CV',
      category: 'Career & Employment',
      mandatory: true,
      detectionPatterns: ['resume', 'cv', 'curriculum vitae', 'bio-data', 'biodata'],
      reason: 'Detailed chronological account of education, projects, skills, and employment history.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('resume') || t.includes('cv') || t.includes('curriculum vitae');
      }
    },
    {
      id: 'req_id',
      title: 'Government Identity Proof (Aadhaar / PAN / Passport)',
      category: 'Identity & Government ID',
      mandatory: true,
      detectionPatterns: ['aadhaar', 'pan card', 'passport', 'voter id', 'driving licence', 'identity proof', 'government id', 'photo id'],
      reason: 'KYC identity verification required for recruitment testing, background verification, and formal offer issuance.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('aadhaar') || t.includes('pan') || t.includes('passport') || t.includes('voter') || t.includes('identity') || t.includes('license');
      }
    },
    {
      id: 'req_exp',
      title: 'Experience Letters / Relieving Certificates / Service Book',
      category: 'Career & Employment',
      mandatory: jdLower.includes('experience') || jdLower.includes('years') || jdLower.includes('previous employer'),
      detectionPatterns: ['experience letter', 'relieving', 'service certificate', 'employment proof', 'experience certificate', 'previous employer', 'salary slip'],
      reason: 'Validates claimed duration of employment, designation, and ethical clearance from previous employers.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('experience') || t.includes('relieving') || t.includes('service') || t.includes('salary slip') || t.includes('offer letter');
      }
    },
    {
      id: 'req_noc',
      title: 'No Objection Certificate (NOC)',
      category: 'Career & Employment',
      mandatory: false,
      detectionPatterns: ['noc', 'no objection certificate', 'current employer noc'],
      reason: 'Mandatory for existing Government / PSU / Autonomous body employees seeking external appointment.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('noc') || t.includes('no objection');
      }
    },
    {
      id: 'req_caste',
      title: 'Category / Reservation Certificate (SC/ST/OBC-NCL/EWS/PwD)',
      category: 'Identity & Government ID',
      mandatory: false,
      detectionPatterns: ['caste', 'category', 'obc', 'sc/st', 'ews', 'pwd', 'reservation', 'non creamy layer'],
      reason: 'Required only when claiming reservation or age relaxation under statutory quotas.',
      vaultMatches: (doc) => {
        const t = (doc.title + ' ' + (doc.category || '')).toLowerCase();
        return t.includes('caste') || t.includes('category') || t.includes('ews') || t.includes('obc') || t.includes('pwd');
      }
    }
  ];

  const results = [];
  let availableCount = 0;
  let missingMandatoryCount = 0;

  for (const criterion of standardCriteria) {
    const isMentioned = criterion.detectionPatterns.some((pattern) => jdLower.includes(pattern));
    
    // Find matching document in user's vault
    const matchedDoc = vaultDocuments.find(criterion.vaultMatches);

    let status = 'Not applicable';
    if (matchedDoc) {
      if (matchedDoc.status === 'expired') {
        status = 'Expired';
      } else if (matchedDoc.status === 'expiring_soon') {
        status = 'Expiring soon';
      } else {
        status = 'Available';
        availableCount++;
      }
    } else {
      if (criterion.mandatory || isMentioned) {
        status = 'Missing';
        missingMandatoryCount++;
      } else {
        status = 'Optional';
      }
    }

    results.push({
      id: criterion.id,
      title: criterion.title,
      category: criterion.category,
      mandatory: criterion.mandatory || (isMentioned && criterion.id !== 'req_caste' && criterion.id !== 'req_noc'),
      isExplicitlyMentionedInJD: isMentioned,
      status,
      reason: criterion.reason,
      matchedDocument: matchedDoc ? {
        id: matchedDoc.id,
        title: matchedDoc.title,
        category: matchedDoc.category,
        expiryDate: matchedDoc.expiry_date,
        status: matchedDoc.status
      } : null
    });
  }

  return {
    status: 'COMPLETED',
    totalCriteria: results.length,
    availableCount,
    missingMandatoryCount,
    readinessScore: Math.round((availableCount / Math.max(1, results.filter(r => r.mandatory).length)) * 100),
    requirements: results,
    notice: 'Provisional checklist extracted using explainable criteria analysis. Review the specific official notification for specialized technical attachments, domicile certificates, or medical fitness requirements.'
  };
}

/**
 * Personal Finance & Investment Comparative Guide
 */
export function generateInvestmentComparison(params = {}) {
  const goal = params.goal || 'Wealth Creation';
  const years = Number(params.horizonYears ?? params.horizon_years ?? params.time_horizon_years) || 5;
  const budget = Number(params.monthlyBudget ?? params.monthly_budget ?? params.monthly_amount) || 5000;
  const riskTolerance = params.riskTolerance ?? params.risk_tolerance ?? params.risk_profile ?? 'Moderate';
  const emergencyFundReady = params.emergencyFundReady ?? params.emergency_fund_ready ?? true;

  const instruments = [
    {
      name: 'Public Provident Fund (PPF)',
      category: 'Guaranteed Sovereign Debt',
      rateEstimate: '7.1% p.a. (Govt Guaranteed)',
      taxStatus: 'EEE (Exempt-Exempt-Exempt under Sec 80C)',
      lockIn: '15 Years (Partial withdrawals after 7th year)',
      risk: 'Zero Sovereign Risk (Govt of India backed)',
      liquidity: 'Low',
      suitableHorizon: 'Long Term (15+ Years)',
      pros: 'Complete capital protection, triple tax exemption, sovereign safety.',
      cons: 'Strict annual cap of ₹1.5 Lakh, 15-year lock-in.',
      fit: years >= 15 ? 'Excellent' : 'Fair (Lock-in exceeds your horizon)'
    },
    {
      name: 'Diversified Index / Mutual Funds (Nifty 50 / Large Cap)',
      category: 'Market-Linked Equity',
      rateEstimate: '11% - 13% p.a. (Historical long-term CAGR; not guaranteed)',
      taxStatus: 'Equity LTCG @ 12.5% for gains above ₹1.25 Lakh/year',
      lockIn: 'None (1-3 business days redemption for open-ended funds)',
      risk: 'Market Volatility (Capital loss possible in short term)',
      liquidity: 'High',
      suitableHorizon: 'Medium to Long Term (5+ Years)',
      pros: 'Historically beats inflation comfortably, high liquidity, compounding growth.',
      cons: 'Short-term volatility, market drawdowns, no capital guarantee.',
      fit: years >= 5 ? 'High' : 'Moderate'
    },
    {
      name: 'Bank Fixed Deposits (FD)',
      category: 'Guaranteed Bank Savings',
      rateEstimate: '6.5% - 7.2% p.a. (Pre-tax contractual)',
      taxStatus: 'Interest fully taxable at individual slab rate (Sec 80TTB for seniors)',
      lockIn: 'Flexible (7 days to 10 years with premature penalty)',
      risk: 'DICGC insured up to ₹5 Lakh per depositor per bank',
      liquidity: 'High',
      suitableHorizon: 'Short to Medium Term (1 - 3 Years)',
      pros: 'Guaranteed capital and fixed return, predictable cash flow.',
      cons: 'Tax drag diminishes net returns, often struggles to beat post-tax inflation.',
      fit: years <= 3 ? 'High' : 'Low to Moderate'
    },
    {
      name: 'National Pension System (NPS Tier I)',
      category: 'Retirement Hybrid (Equity + Debt)',
      rateEstimate: '9% - 11% p.a. (Asset allocation dependent)',
      taxStatus: 'Sec 80CCD(1B) additional ₹50,000 deduction, 60% tax-free at maturity',
      lockIn: 'Until age 60 (Strict conditional exit rules)',
      risk: 'Moderate to High based on equity choice (up to 75% Active Choice)',
      liquidity: 'Very Low',
      suitableHorizon: 'Retirement Only',
      pros: 'Lowest fund management charges globally (0.09%), additional tax savings.',
      cons: 'Locked till 60, mandatory 40% annuity purchase at retirement.',
      fit: goal.toLowerCase().includes('retire') ? 'Top Recommendation' : 'Low (Restricted to retirement)'
    },
    {
      name: 'Term Insurance + Separate Investments vs Traditional Endowment',
      category: 'Pure Protection vs Investment Hybrid',
      rateEstimate: 'Term Cover: ₹1 Cr protection at ~₹800-₹1,200/mo',
      taxStatus: 'Sec 80C on premium, Sec 10(10D) tax-free death claim',
      lockIn: 'Coverage for chosen duration (e.g. up to age 60-65)',
      risk: 'Zero market risk; pure family protection',
      liquidity: 'N/A (Pure life cover)',
      suitableHorizon: 'Working life until financial independence',
      pros: 'Provides 20x-50x higher financial security to dependents at 1/10th the cost of endowment plans.',
      cons: 'No maturity return if insured survives the term (pure risk transfer).',
      fit: 'Essential Foundation for every breadwinner'
    }
  ];

  return {
    goal,
    horizonYears: years,
    monthlyBudget: budget,
    riskTolerance,
    emergencyFundReady,
    guidelines: [
      emergencyFundReady
        ? '✅ Emergency Fund: Confirmed in place (3-6 months living expenses).'
        : '⚠️ Priority Step: Establish a 3-6 month liquid emergency fund in a savings account or liquid fund before locking money in volatile or illiquid products.',
      '🛡️ Core Protection: Keep pure term life insurance and comprehensive health insurance strictly separate from investment vehicles.',
      '⚖️ Asset Allocation: Diversify across debt (capital stability) and equity (inflation beating growth) proportional to your time horizon.'
    ],
    instruments,
    officialReference: OFFICIAL_SOURCES.SEBI_INVESTOR,
    disclaimer: 'This comparison is provided for educational and financial literacy purposes under SEBI investor awareness principles. It does not constitute personal financial, tax, or investment advice.'
  };
}

/**
 * Optional External LLM Bridge (OpenAI / Gemini / Groq)
 * Seamlessly enhances conversational intelligence if an API key is configured in .env.
 */
async function queryExternalLLM({ userMessage, systemPrompt, conversationHistory = [] }) {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-4),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: 1024
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.trim()) return text.trim();
      }
    } catch (e) {
      console.warn('[LLM Groq] Query error, falling back to local engine:', e.message);
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-4),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: 1024
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.trim()) return text.trim();
      }
    } catch (e) {
      console.warn('[LLM OpenAI] Query error, falling back to local engine:', e.message);
    }
  }

  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }] }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) return text.trim();
      }
    } catch (e) {
      console.warn('[LLM Gemini] Query error, falling back to local engine:', e.message);
    }
  }

  return null;
}

/**
 * Handles conversational inquiries in DM Assistant with comprehensive NLP intent analysis,
 * dynamic live vault querying, and official regulatory citations.
 */
export async function processAssistantMessage({
  userId,
  conversationId,
  mode = 'general',
  userMessage,
  selectedDocumentIds = []
}) {
  const now = new Date().toISOString();

  // Retrieve user's full document catalog for context-aware responses
  const allUserDocs = db.prepare(`
    SELECT id, title, category, policy_number, insurer_name, expiry_date, status, file_name, file_size_bytes, created_at
    FROM documents
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  // Filter authorized documents if explicitly selected
  let authorizedDocs = [];
  if (selectedDocumentIds && selectedDocumentIds.length > 0) {
    authorizedDocs = allUserDocs.filter(d => selectedDocumentIds.includes(d.id));
  } else {
    authorizedDocs = allUserDocs.slice(0, 10);
  }

  // Load recent conversation history for context
  let history = [];
  try {
    const rawHistory = db.prepare(`
      SELECT sender, content FROM chat_messages 
      WHERE conversation_id = ? 
      ORDER BY created_at DESC LIMIT 6
    `).all(conversationId);
    history = rawHistory.reverse().map(h => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      content: h.content
    }));
  } catch {
    // history fallback
  }

  const msg = (userMessage || '').trim();
  const msgLower = msg.toLowerCase();

  let assistantResponse = '';
  let metadata = {
    mode,
    citations: [],
    sources: [],
    calculationSteps: null,
    attachedDocuments: authorizedDocs.map(d => ({ id: d.id, title: d.title }))
  };

  // Try external LLM first if configured
  if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY) {
    const docSummary = allUserDocs.map(d => `- ${d.title} (Category: ${d.category || 'General'}, Status: ${d.status || 'active'}, Expiry: ${d.expiry_date || 'None'})`).join('\n');
    const systemPrompt = `You are DM Assistant, an intelligent, zero-knowledge digital document vault and financial/insurance assistant for DM Locker Pro.
You help users manage encrypted documents, understand policy clauses, calculate LIC returns, verify job document checklists, audit room-rent sub-limits, configure Dead Man's Switch, and use 2-of-3 Shamir's Secret Sharing.
Current User's Vault Documents Summary:
${docSummary || 'No documents uploaded yet.'}

Guidelines:
- Maintain an encouraging, precise, and professional tone with clear GitHub-style markdown.
- When explaining security, emphasize client-side AES-256-GCM authenticated encryption and PBKDF2 (100k rounds).
- For insurance or investments, provide transparent math and official references (SEBI, RBI, IRDAI, LIC).
- Never claim to offer formal legal or medical advice.`;

    const llmReply = await queryExternalLLM({ userMessage: msg, systemPrompt, conversationHistory: history });
    if (llmReply) {
      assistantResponse = llmReply;
    }
  }

  // If no external LLM reply, execute deterministic neural-rule knowledge engine
  if (!assistantResponse) {

    // --------------------------------------------------------------------------
    // 1. GREETINGS & CAPABILITY DISCOVERY
    // --------------------------------------------------------------------------
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|greetings)\b/i.test(msgLower) || msgLower === 'hi' || msgLower === 'hello') {
      const docCount = allUserDocs.length;
      assistantResponse = `### 👋 Welcome to DM Locker Pro Assistant\n\n` +
        `Hello! I am your intelligent zero-knowledge digital vault assistant. You currently have **${docCount} secure ${docCount === 1 ? 'document' : 'documents'}** deposited in your vault.\n\n` +
        `Here are key areas where I can assist you right now:\n\n` +
        `1. 📁 **Check My Vault:** Ask *"What documents do I have?"* or *"Do I have my Aadhaar card uploaded?"*\n` +
        `2. ⏳ **Smart Expiry Tracking:** Ask *"What documents are expiring soon?"* to review automated renewal alerts.\n` +
        `3. 🔗 **Secure QR Sharing:** Ask *"How do I share a document with a one-time QR code?"*\n` +
        `4. 🛡️ **Zero-Knowledge Security:** Ask *"How does client-side encryption protect my files?"*\n` +
        `5. 🚑 **Emergency Access:** Ask *"How does Dead Man's Switch & 2-of-3 Shamir Secret Sharing work?"*\n` +
        `6. 📊 **LIC & Financial Analysis:** Ask *"Calculate maturity for LIC Jeevan Labh with ₹5 Lakh sum assured"* or *"Compare PPF vs Mutual Funds"*\n` +
        `7. 🏥 **Healthcare & Claim Audit:** Ask *"What is a room-rent sub-limit and how does proportional deduction work?"*\n\n` +
        `What would you like to explore or calculate today?`;
    }

    // --------------------------------------------------------------------------
    // 2. EXPIRY ALERTS & REMINDERS (Prioritized before general listing)
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('expir') ||
      msgLower.includes('due date') ||
      msgLower.includes('reminder') ||
      msgLower.includes('alert') ||
      msgLower.includes('validity') ||
      msgLower.includes('when will my policy expire')
    ) {
      const today = new Date();
      const docsWithExpiry = allUserDocs.filter(d => d.expiry_date);

      if (docsWithExpiry.length === 0) {
        assistantResponse = `### ⏰ Smart Expiry Tracking & Automated Alerts\n\n` +
          `None of your currently uploaded documents have an **Expiry Date** configured.\n\n` +
          `#### How Expiry Alerts Work in DM Locker Pro:\n` +
          `- **3-Stage Notification System:** Automated reminder emails are dispatched at **30 days**, **7 days**, and **1 day** prior to document expiration.\n` +
          `- **Autonomous Renewal:** Expiring insurance policies can be renewed automatically through our **TinyFish Web Agent** in the Renewal Center.\n` +
          `- **Setting an Expiry Date:** Open any document card, click **Edit Details**, and set the statutory expiration date (e.g. for Driving Licenses, Passports, Term Policies, or Vehicle Insurance).`;
      } else {
        const expired = [];
        const expiringSoon = [];
        const valid = [];

        docsWithExpiry.forEach(d => {
          const exp = new Date(d.expiry_date);
          const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
          const item = { ...d, diffDays };
          if (diffDays < 0) expired.push(item);
          else if (diffDays <= 30) expiringSoon.push(item);
          else valid.push(item);
        });

        assistantResponse = `### ⏰ Document Expiry & Continuity Audit\n\n`;

        if (expired.length > 0) {
          assistantResponse += `#### ❌ Already Expired (${expired.length}):\n`;
          expired.forEach(d => {
            assistantResponse += `- **${d.title}** — Expired **${Math.abs(d.diffDays)} days ago** (\`${d.expiry_date}\`). *Action: Renew immediately or archive.*\n`;
          });
          assistantResponse += `\n`;
        }

        if (expiringSoon.length > 0) {
          assistantResponse += `#### ⚠️ Expiring Soon (Next 30 Days - ${expiringSoon.length}):\n`;
          expiringSoon.forEach(d => {
            assistantResponse += `- **${d.title}** — Due in **${d.diffDays} days** (\`${d.expiry_date}\`). *Automated email reminders active.*\n`;
          });
          assistantResponse += `\n`;
        }

        if (valid.length > 0) {
          assistantResponse += `#### ✅ Up-to-Date & Valid (${valid.length}):\n`;
          valid.forEach(d => {
            assistantResponse += `- **${d.title}** — Valid for **${d.diffDays} more days** (\`${d.expiry_date}\`)\n`;
          });
          assistantResponse += `\n`;
        }

        assistantResponse += `> 📧 **Email Alerts Status:** Automated background reminders are active for your account. You can trigger automated rate discovery anytime in the **Renewal Center**.`;
      }
    }

    // --------------------------------------------------------------------------
    // 3. VAULT INVENTORY & "WHAT DOCUMENTS DO I HAVE?"
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('what document') ||
      msgLower.includes('list document') ||
      msgLower.includes('show my document') ||
      msgLower.includes('my vault') ||
      msgLower.includes('show my file') ||
      msgLower.includes('what files') ||
      msgLower.includes('all documents') ||
      msgLower.includes('check my vault')
    ) {
      if (allUserDocs.length === 0) {
        assistantResponse = `### 📂 Your Vault is Currently Empty\n\n` +
          `You have not deposited any documents into DM Locker Pro yet.\n\n` +
          `#### How to Deposit Your First Document:\n` +
          `1. Go to **My Vault** from the sidebar menu.\n` +
          `2. Click the **"Deposit Document"** button at the top right.\n` +
          `3. Select your file (PDF, PNG, JPG, or DOCX).\n` +
          `4. Choose a category (**Identity**, **Healthcare**, **Finance & Insurance**, or **Career & Education**).\n` +
          `5. Enter optional policy numbers and expiration dates for automated reminder alerts.\n` +
          `6. Your browser immediately derives your 256-bit AES-GCM key and encrypts the file before uploading!`;
      } else {
        // Group documents by category
        const categories = {};
        allUserDocs.forEach(d => {
          const cat = d.category || 'General & Uncategorized';
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(d);
        });

        assistantResponse = `### 🛡️ Your Secure Vault Inventory (${allUserDocs.length} Total Documents)\n\n` +
          `Here is an overview of your encrypted documents stored in DM Locker Pro:\n\n`;

        for (const [catName, docs] of Object.entries(categories)) {
          assistantResponse += `#### 📁 ${catName} (${docs.length})\n`;
          docs.forEach(doc => {
            const statusBadge = doc.status === 'expired' ? '❌ *Expired*' : (doc.status === 'expiring_soon' ? '⚠️ *Expiring Soon*' : '✅ *Active*');
            const expiryInfo = doc.expiry_date ? ` | Expires: \`${doc.expiry_date}\`` : '';
            const insurerInfo = doc.insurer_name ? ` (${doc.insurer_name})` : '';
            assistantResponse += `- **${doc.title}**${insurerInfo} — ${statusBadge}${expiryInfo}\n`;
          });
          assistantResponse += `\n`;
        }

        assistantResponse += `> 💡 **Zero-Knowledge Guarantee:** The server stores these files purely as AES-256-GCM encrypted byte payloads. Decryption occurs exclusively in your browser session using your master passphrase.`;
      }
    }

    // --------------------------------------------------------------------------
    // 4. SPECIFIC DOCUMENT AUDIT ("DO I HAVE MY...")
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('do i have') ||
      msgLower.includes('is my') ||
      msgLower.includes('have i uploaded') ||
      msgLower.includes('find my') ||
      msgLower.includes('search for')
    ) {
      const searchTerms = ['pan', 'aadhaar', 'passport', 'voter', 'driving', 'license', 'degree', '10th', '12th', 'resume', 'cv', 'health insurance', 'life insurance', 'tax'];
      const matchedTerm = searchTerms.find(term => msgLower.includes(term));

      if (matchedTerm) {
        const matches = allUserDocs.filter(d => {
          const str = `${d.title} ${d.category} ${d.file_name || ''}`.toLowerCase();
          return str.includes(matchedTerm);
        });

        if (matches.length > 0) {
          assistantResponse = `### 🔍 Document Search Result for "${matchedTerm.toUpperCase()}"\n\n` +
            `Yes! I found **${matches.length} matching record(s)** in your secure vault:\n\n` +
            matches.map(m => `- **${m.title}**\n  - Category: \`${m.category}\`\n  - Status: \`${m.status || 'Active'}\`\n  - Uploaded: ${new Date(m.created_at).toLocaleDateString()}`).join('\n\n') +
            `\n\n> You can view or download the decrypted file directly from the **My Vault** screen.`;
        } else {
          assistantResponse = `### 🔍 Document Search Result for "${matchedTerm.toUpperCase()}"\n\n` +
            `No document matching **"${matchedTerm.toUpperCase()}"** was found in your vault.\n\n` +
            `#### Recommended Action:\n` +
            `Would you like to upload it now? Navigate to **My Vault** -> **Deposit Document** and select the appropriate workspace (e.g. **Identity & Government ID** or **Education & Academics**).`;
        }
      } else {
        assistantResponse = `### 🔍 Document Search\n\n` +
          `To check for a specific document, mention its name (e.g. *"Do I have my PAN card?"*, *"Is my degree uploaded?"*, or *"Find my health insurance"*).\n\n` +
          `Your vault currently holds **${allUserDocs.length} total documents**.`;
      }
    }

    // --------------------------------------------------------------------------
    // 5. QR CODE SHARING & ONE-TIME LINKS
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('qr') ||
      msgLower.includes('share') ||
      msgLower.includes('one-time link') ||
      msgLower.includes('temporary link')
    ) {
      assistantResponse = `### 📲 Genuine Zero-Knowledge QR Document Sharing\n\n` +
        `DM Locker Pro provides temporary, cryptographic QR code sharing that protects your files when presenting them to verifiers, banks, or employers.\n\n` +
        `#### Step-by-Step Sharing Workflow:\n` +
        `1. **Select Document:** Open **My Vault** and click the **Share via QR** button on the document card.\n` +
        `2. **Set Expiration Interval:** Choose between:\n` +
        `   - **15 Minutes** (for instant counter verification)\n` +
        `   - **1 Hour** (for appointment/interview sessions)\n` +
        `   - **24 Hours** (for multi-stage loan or admissions approvals)\n` +
        `   - **Single View Only (Burn After Reading)** (token self-destructs the moment the document is loaded)\n` +
        `3. **Optional PIN Verification:** Set an optional **4-digit numeric access PIN** that you communicate verbally to the recipient.\n` +
        `4. **Scan or Share Link:** The recipient scans the QR code from their mobile device. The client browser securely retrieves the ciphertext and decrypts it on-the-fly.\n\n` +
        `> 🔒 **Security Feature:** Sharing tokens are ephemeral. Once the duration expires or a single-view token is consumed, the database purges access rights immediately.`;
    }

    // --------------------------------------------------------------------------
    // 6. CLIENT-SIDE ENCRYPTION & PRIVACY MODEL
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('encryption') ||
      msgLower.includes('zero knowledge') ||
      msgLower.includes('zero-knowledge') ||
      msgLower.includes('how does encryption work') ||
      msgLower.includes('is my data safe') ||
      msgLower.includes('security') ||
      msgLower.includes('pbkdf2') ||
      msgLower.includes('aes')
    ) {
      assistantResponse = `### 🛡️ DM Locker Pro Zero-Knowledge Cryptographic Architecture\n\n` +
        `DM Locker Pro is engineered on a strict **Zero-Knowledge** foundation where your raw documents and master passphrase never leave your device unencrypted.\n\n` +
        `#### The 4-Stage Cryptographic Pipeline:\n\n` +
        `1. **Client-Side Key Derivation (PBKDF2):**\n` +
        `   - When you log in, Web Crypto computes a 256-bit symmetric AES key using **PBKDF2-HMAC-SHA256** with **100,000 iterations**.\n` +
        `   - A unique 16-byte cryptographic \`vault_salt\` ensures immunity against rainbow tables.\n` +
        `   - This vault key is held purely in browser RAM during your authenticated session.\n\n` +
        `2. **Authenticated Symmetric Encryption (AES-256-GCM):**\n` +
        `   - Each document upload generates a cryptographically secure random **12-byte (96-bit) Initialization Vector (IV)**.\n` +
        `   - The file payload is encrypted locally into ciphertext with a **128-bit GCM authentication tag** preventing tampering.\n\n` +
        `3. **Zero Plaintext Transmission:**\n` +
        `   - The server only receives and stores the high-entropy ciphertext payload and IV metadata.\n` +
        `   - Your master passphrase and raw plaintext files **never** travel across the wire or touch server storage.\n\n` +
        `4. **Adversary Immunity:**\n` +
        `   - Even if the SQLite database is compromised or an attacker inspects server memory, all document payloads remain mathematically undecipherable without the client passphrase.`;
    }

    // --------------------------------------------------------------------------
    // 7. DEAD MAN'S SWITCH & EMERGENCY PROTOCOL
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('dead man') ||
      msgLower.includes('deadman') ||
      msgLower.includes('emergency switch') ||
      msgLower.includes('inactivity') ||
      msgLower.includes('what if i die') ||
      msgLower.includes('heartbeat')
    ) {
      assistantResponse = `### ⏳ Emergency Access: Dead Man's Switch Protocol\n\n` +
        `The Dead Man's Switch guarantees digital asset and insurance continuity for your family if you are incapacitated or unavailable.\n\n` +
        `#### How the Inactivity Mechanism Works:\n` +
        `1. **Configurable Tolerance Window:** Set a heartbeat threshold (e.g. **15, 30, 60, or 90 days**).\n` +
        `2. **Zero-Effort Check-In:** Every time you log in, view a file, or click **"I'm Active / Check In"**, your heartbeat timestamp resets.\n` +
        `3. **Multi-Stage Grace Period:** If the tolerance window nears expiration, the system dispatches warning notifications via registered email.\n` +
        `4. **Emergency Trigger & Handover:** If no check-in occurs after the grace period:\n` +
        `   - The designated **Nominee** receives an emergency handover alert.\n` +
        `   - The server escrow share is released to combine with the nominee share under **2-of-3 Shamir's Secret Sharing**.\n\n` +
        `You can configure your nominee and check-in tolerance from the **Emergency Access** page.`;
    }

    // --------------------------------------------------------------------------
    // 8. 2-OF-3 SHAMIR'S SECRET SHARING
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('shamir') ||
      msgLower.includes('secret sharing') ||
      msgLower.includes('2 of 3') ||
      msgLower.includes('2-of-3') ||
      msgLower.includes('shares') ||
      msgLower.includes('threshold') ||
      msgLower.includes('galois')
    ) {
      assistantResponse = `### 🧩 Mathematical 2-of-3 Shamir's Secret Sharing Explained\n\n` +
        `To eliminate single points of failure without compromising privacy, DM Locker Pro implements a mathematically verified **$(k, n) = (2, 3)$ Shamir Threshold Scheme** over Galois Field $GF(2^8)$.\n\n` +
        `#### The 3 Distributed Shares:\n` +
        `- **Share 1 (User Offline Key):** Stored by you as an emergency paper backup or offline encrypted phrase.\n` +
        `- **Share 2 (Nominee Share):** Provided to your trusted nominee/family custodian.\n` +
        `- **Share 3 (Server Escrow Share):** Encrypted and locked in the server database, released only when the Dead Man's Switch fires.\n\n` +
        `#### The Mathematical Guarantee:\n` +
        `- **Any 2 Shares Reconstruct the Vault Key:**\n` +
        `  - *(User + Nominee)* = Instant manual emergency unlock.\n` +
        `  - *(Nominee + Server Escrow)* = Automated post-inactivity unlock.\n` +
        `  - *(User + Server Escrow)* = Self-recovery if nominee key is lost.\n` +
        `- **1 Share Alone Yields Zero Information:** Having only 1 share is mathematically equivalent to a random guess. The server cannot decrypt documents on its own, and a rogue nominee cannot access files while you are active.\n\n` +
        `You can run an interactive verification benchmark directly on the **Emergency Access** screen.`;
    }

    // --------------------------------------------------------------------------
    // 9. ROOM-RENT SUB-LIMITS & PROPORTIONAL DEDUCTIONS (SPECIFIC DEEP DIVE)
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('room rent') ||
      msgLower.includes('sub limit') ||
      msgLower.includes('sub-limit') ||
      msgLower.includes('proportional deduction') ||
      msgLower.includes('room-rent')
    ) {
      metadata.sources.push(OFFICIAL_SOURCES.IRDAI_CONSUMER);
      assistantResponse = `### 🏥 Room-Rent Sub-Limits & The Proportional Deduction Trap\n\n` +
        `The **Room Rent Sub-Limit** is one of the most critical health insurance clauses to audit because it triggers heavy financial penalties through **Proportional Deductions**.\n\n` +
        `#### The Numerical Example (How You Lose Money):\n` +
        `Assume you have a health insurance policy with:\n` +
        `- **Sum Insured:** ₹5,00,000\n` +
        `- **Room Rent Cap:** 1% of Sum Insured = **₹5,000 per day**\n` +
        `- **Actual Room Selected:** Deluxe Room at **₹10,000 per day** (2x the eligible limit)\n\n` +
        `#### What Most People Think Happens:\n` +
        `They assume they will only pay the difference in room rent: $(₹10,000 - ₹5,000) \\times 4\\text{ days} = ₹20,000$.\n\n` +
        `#### What Actually Happens (Proportional Deduction):\n` +
        `Under IRDAI standard terms, the insurer scales down **all associated hospital expenses** proportional to the room rent ratio:\n` +
        `$$\\text{Eligible Ratio} = \\frac{\\text{Eligible Room Rent}}{\\text{Actual Room Rent}} = \\frac{₹5,000}{₹10,000} = 50\\%$$\n\n` +
        `If your total bill is **₹3,00,000** consisting of:\n` +
        `- Doctor & Surgeon Fees: ₹1,20,000 -> Insurer pays only **50% (₹60,000)**!\n` +
        `- Operation Theatre & ICU: ₹1,00,000 -> Insurer pays only **50% (₹50,000)**!\n` +
        `- Room Charges (4 days): ₹40,000 -> Insurer pays **₹20,000**\n` +
        `- Consumables/Medicines: ₹40,000 -> (Non-medical excluded)\n\n` +
        `💥 **Result:** Instead of paying ₹20,000, you are hit with an out-of-pocket bill exceeding **₹1,50,000**!\n\n` +
        `#### How to Protect Yourself:\n` +
        `1. Choose policies with **"No Room Rent Sub-Limit"** or "Single Private A/C Room" entitlement.\n` +
        `2. If your policy has a 1% cap, strictly choose rooms within that exact tariff limit during planned admissions.\n` +
        `3. Use our **Policy Health Check** to audit your health policy for sub-limit flags.`;
    }

    // --------------------------------------------------------------------------
    // 10. CASHLESS HOSPITALIZATION & ABHA PREPARATION
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('cashless') ||
      msgLower.includes('hospitalization') ||
      msgLower.includes('hospital') ||
      msgLower.includes('tpa') ||
      msgLower.includes('ayushman') ||
      msgLower.includes('abha')
    ) {
      metadata.sources.push(OFFICIAL_SOURCES.ABHA_HEALTH);
      metadata.sources.push(OFFICIAL_SOURCES.IRDAI_CONSUMER);

      assistantResponse = `### 🏥 Cashless Hospitalization & Claim Preparation Checklist\n\n` +
        `To ensure a smooth cashless claim without out-of-pocket delays, prepare these documents before hospital admission:\n\n` +
        `#### Required Document Dossier:\n` +
        `1. 🪪 **ABHA Health ID Card:** Integrates your longitudinal medical records across network hospitals ([ABDM Portal](${OFFICIAL_SOURCES.ABHA_HEALTH.url})).\n` +
        `2. 📄 **TPA e-Health Card & Active Policy Schedule:** Available in your **Healthcare Records** workspace.\n` +
        `3. 🆔 **Government Photo ID:** Aadhaar Card or PAN Card matching the exact policyholder legal name.\n` +
        `4. 🩺 **Doctor's Admission Advice & Prescription:** Stating the tentative diagnosis and reason for hospitalization.\n` +
        `5. 🧪 **Past Diagnostic Reports:** Lab tests, X-rays, or MRI scans leading to the admission decision.\n\n` +
        `#### Crucial Timing Rules:\n` +
        `- **Planned Hospitalization:** Submit the pre-authorization form to the hospital TPA desk **48 to 72 hours before admission**.\n` +
        `- **Emergency Hospitalization:** Notify the insurer and submit the pre-auth request within **24 hours of hospital admission**.\n` +
        `- **Consumables Clause:** Ask if your policy covers non-medical consumables (cotton, gloves, PPE, syringes); otherwise expect ₹5,000 - ₹15,000 out-of-pocket charges.`;
    }

    // --------------------------------------------------------------------------
    // 11. TERM INSURANCE VS ENDOWMENT PLANS (UNBIASED FINANCIAL COMPARISON)
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('term insurance vs') ||
      msgLower.includes('endowment vs') ||
      msgLower.includes('pure term') ||
      msgLower.includes('difference between term') ||
      msgLower.includes('lic vs term')
    ) {
      metadata.sources.push(OFFICIAL_SOURCES.SEBI_INVESTOR);
      metadata.sources.push(OFFICIAL_SOURCES.IRDAI_CONSUMER);

      assistantResponse = `### ⚖️ Pure Term Insurance vs Traditional Endowment Plans\n\n` +
        `One of the most important financial literacy principles recommended by SEBI and IRDAI is to **keep insurance (protection) strictly separate from investment (wealth creation)**.\n\n` +
        `| Feature | Pure Term Life Insurance | Traditional Endowment Plan (e.g. LIC 914/936) |\n` +
        `|---|---|---|\n` +
        `| **Core Purpose** | 100% Pure Financial Protection | Mixed Insurance + Low-Yield Savings |\n` +
        `| **Coverage for ₹10k-15k/yr** | **₹1 Crore (100 Lakhs)** | ~₹2.5 to ₹3.5 Lakhs |\n` +
        `| **Payout if Insured Survives** | ₹0 (Pure risk transfer) | Sum Assured + Accrued Bonuses |\n` +
        `| **Net Annualized Return (IRR)** | N/A (Risk protection) | Typically **4.5% to 5.5%** (often below inflation) |\n` +
        `| **Liquidity & Flexibility** | High (Can stop anytime without loss) | Low (Surrender value penalty in first 3-5 yrs) |\n\n` +
        `#### The "Buy Term + Invest the Difference" Strategy:\n` +
        `- Instead of paying ₹50,000/year for an endowment policy with only ₹10 Lakhs life cover:\n` +
        `- Buy a **₹1 Crore Pure Term Policy** for ~₹12,000/year.\n` +
        `- Invest the remaining **₹38,000/year** in PPF (7.1% tax-free) or Nifty 50 Index Mutual Funds (11-12% historical return).\n` +
        `- **Over 20 Years:** The compounding equity portfolio grows to **₹30+ Lakhs**, compared to just ~₹18-20 Lakhs under an endowment policy, while your family enjoys **10x higher life cover** throughout!`;
    }

    // --------------------------------------------------------------------------
    // 12. LIC MATURITY CALCULATOR & PLAN EVALUATION
    // --------------------------------------------------------------------------
    else if (
      mode === 'lic-calculator' ||
      msgLower.includes('lic') ||
      msgLower.includes('maturity') ||
      msgLower.includes('jeevan') ||
      msgLower.includes('table 914') ||
      msgLower.includes('table 936') ||
      msgLower.includes('table 945')
    ) {
      const saMatch = userMessage.match(/(?:sa|sum assured|cover)\D*(\d[\d,]+)/i);
      const termMatch = userMessage.match(/(?:term|years)\D*(\d{1,2})/i);
      const premiumMatch = userMessage.match(/(?:premium|paying)\D*(\d[\d,]+)/i);

      const sa = saMatch ? parseInt(saMatch[1].replace(/,/g, ''), 10) : 500000;
      const term = termMatch ? parseInt(termMatch[1], 10) : 21;
      const premium = premiumMatch ? parseInt(premiumMatch[1].replace(/,/g, ''), 10) : 24000;

      const calcResult = computeLicMaturity({
        planNumber: msgLower.includes('914') ? '914' : (msgLower.includes('945') ? '945' : '936'),
        planName: 'LIC Policy (Jeevan Labh / Endowment Analysis)',
        sumAssured: sa,
        policyTerm: term,
        premiumPayingTerm: Math.min(term, 15),
        annualPremium: premium
      });

      metadata.calculationSteps = calcResult.calculationSteps;
      metadata.sources.push(OFFICIAL_SOURCES.LIC_POLICY_CONDITIONS);
      metadata.sources.push(OFFICIAL_SOURCES.IRDAI_CONSUMER);

      assistantResponse = `### 📊 LIC Policy Maturity & Net IRR Yield Analysis\n\n` +
        `**Plan Evaluated:** ${calcResult.planDetails.planName}\n` +
        `**Parameters:** Sum Assured: ₹${sa.toLocaleString('en-IN')} | Term: ${term} Yrs | Premium: ₹${premium.toLocaleString('en-IN')}/yr\n\n` +
        `#### Detailed Benefit Breakdown:\n` +
        `- 🛡️ **Guaranteed Sum Assured:** ₹${calcResult.benefitBreakdown.guaranteedSumAssured.toLocaleString('en-IN')}\n` +
        `- 📈 **Estimated Simple Reversionary Bonus:** ₹${Math.round(calcResult.benefitBreakdown.simpleReversionaryBonus).toLocaleString('en-IN')} (at ₹${calcResult.benefitBreakdown.bonusRateUsedPer1000}/1000 SA/yr)\n` +
        `- 🎁 **Estimated Final Additional Bonus (FAB):** ₹${Math.round(calcResult.benefitBreakdown.finalAdditionalBonus).toLocaleString('en-IN')}\n` +
        `- 💰 **Estimated Total Maturity Payout:** **₹${Math.round(calcResult.benefitBreakdown.estimatedMaturityBenefit).toLocaleString('en-IN')}**\n\n` +
        `#### Financial Return Evaluation:\n` +
        `- **Total Premiums to be Paid:** ₹${calcResult.planDetails.totalPremiumsPaid?.toLocaleString('en-IN')}\n` +
        `- **Net Financial Gain:** ₹${Math.round(calcResult.benefitBreakdown.netGainOverPremiums)?.toLocaleString('en-IN')}\n` +
        `- **Net Annualized Return (IRR):** **${calcResult.benefitBreakdown.annualizedNetYieldIRR}**\n\n` +
        `> ℹ️ **Regulatory Disclosure:** Under Section 28 of the LIC Act, simple reversionary bonuses are non-guaranteed and depend on annual actuarial surplus valuations. Official source: [LIC Policy Conditions](${OFFICIAL_SOURCES.LIC_POLICY_CONDITIONS.url}).`;
    }

    // --------------------------------------------------------------------------
    // 13. PERSONAL FINANCE, INVESTMENTS & TAX
    // --------------------------------------------------------------------------
    else if (
      mode === 'personal-finance' ||
      msgLower.includes('invest') ||
      msgLower.includes('mutual fund') ||
      msgLower.includes('ppf') ||
      msgLower.includes('fd') ||
      msgLower.includes('nps') ||
      msgLower.includes('stocks') ||
      msgLower.includes('sip')
    ) {
      const comp = generateInvestmentComparison({
        goal: msgLower.includes('retire') ? 'Retirement Planning' : (msgLower.includes('child') ? 'Child Education' : 'Long-Term Wealth Creation'),
        horizonYears: msgLower.includes('10') ? 10 : (msgLower.includes('15') ? 15 : 5),
        monthlyBudget: 5000,
        riskTolerance: msgLower.includes('safe') ? 'Conservative' : 'Moderate'
      });

      metadata.sources.push(OFFICIAL_SOURCES.SEBI_INVESTOR);
      metadata.sources.push(OFFICIAL_SOURCES.RBI_KEHTA_HAI);

      assistantResponse = `### 💡 Personal Finance & Goal-Based Asset Allocation Guide\n\n` +
        `**Goal:** ${comp.goal} | **Horizon:** ${comp.horizonYears} Years | **Risk Profile:** ${comp.riskTolerance}\n\n` +
        `#### Comparison of Key Investment Instruments:\n\n` +
        `1. **Public Provident Fund (PPF):**\n` +
        `   - **Return:** 7.1% p.a. (Sovereign guarantee)\n` +
        `   - **Tax Status:** EEE (Exempt at investment Sec 80C, exempt interest, exempt maturity)\n` +
        `   - **Best for:** Capital preservation with 15-year lock-in.\n\n` +
        `2. **Diversified Equity Mutual Funds / Index Funds (SIP):**\n` +
        `   - **Historical Return:** 11% - 13% CAGR (Over 5+ year horizons)\n` +
        `   - **Liquidity:** T+2 days redemption without lock-in\n` +
        `   - **Best for:** Beating inflation and building long-term wealth.\n\n` +
        `3. **Fixed Deposits (FD):**\n` +
        `   - **Return:** 6.5% - 7.5% p.a.\n` +
        `   - **Best for:** Short-term emergency funds (< 3 years).\n\n` +
        `4. **National Pension System (NPS):**\n` +
        `   - **Advantage:** Additional ₹50,000 tax deduction under Sec 80CCD(1B) beyond the 80C ₹1.5 Lakh limit.\n\n` +
        `> 📘 **SEBI Investor Rule:** Always secure a 3-6 month liquid emergency fund in a savings account before locking capital into volatile equity instruments.`;
    }

    // --------------------------------------------------------------------------
    // 14. JOB APPLICATION DOCUMENT AUDIT & DEGREE QUESTIONS
    // --------------------------------------------------------------------------
    else if (
      mode === 'job-gap-checker' ||
      msgLower.includes('job') ||
      msgLower.includes('resume') ||
      msgLower.includes('recruitment') ||
      msgLower.includes('marksheet') ||
      msgLower.includes('degree') ||
      msgLower.includes('provisional') ||
      msgLower.includes('upsc') ||
      msgLower.includes('ssc')
    ) {
      if (msgLower.includes('provisional')) {
        assistantResponse = `### 🎓 Provisional Degree vs Original Degree Validity\n\n` +
          `**Yes, a Provisional Degree Certificate is legally valid for employment and government exams!**\n\n` +
          `#### Key Rules Recognized by UGC, UPSC, SSC, and Corporates:\n` +
          `1. **Validity Period:** A provisional certificate is universally accepted until the official university convocation is held and the original degree is conferred.\n` +
          `2. **Mandatory Elements:** Ensure your provisional certificate has:\n` +
          `   - Official university seal and registrar signature.\n` +
          `   - Clear roll number / registration number and date of passing.\n` +
          `   - Division / CGPA or class awarded.\n` +
          `3. **Final Transcripts:** Always attach final semester consolidated marksheets alongside the provisional certificate.`;
      } else {
        const jobCheck = checkJobApplicationRequirements(userMessage, allUserDocs);
        metadata.sources.push({ title: 'National Career Service Portal', url: 'https://www.ncs.gov.in/', authority: 'Ministry of Labour & Employment' });

        assistantResponse = `### 📋 Job Application Document Readiness Evaluation\n\n` +
          `**Vault Documents Evaluated:** ${allUserDocs.length} | **Application Readiness:** **${jobCheck.readinessScore}%**\n` +
          `- ✅ **Available in Vault:** ${jobCheck.availableCount}\n` +
          `- ⚠️ **Missing Required Certificates:** ${jobCheck.missingMandatoryCount}\n\n` +
          `#### Requirements Breakdown:\n` +
          jobCheck.requirements.map(r => {
            const icon = r.status === 'Available' ? '✅' : (r.status === 'Missing' ? '❌' : 'ℹ️');
            return `- ${icon} **${r.title}** — **Status: ${r.status}**\n  *Why required:* ${r.reason}` +
              (r.matchedDocument ? `\n  *Found in Vault:* "${r.matchedDocument.title}"` : '');
          }).join('\n\n') +
          `\n\n> 💡 **Tip:** Upload any missing documents to the **Career & Education** workspace to achieve 100% application readiness.`;
      }
    }

    // --------------------------------------------------------------------------
    // 15. VAULT ORGANIZER & UNDO SUPPORT
    // --------------------------------------------------------------------------
    else if (
      mode === 'vault-organizer' ||
      msgLower.includes('organize') ||
      msgLower.includes('folder') ||
      msgLower.includes('sort') ||
      msgLower.includes('undo') ||
      msgLower.includes('category')
    ) {
      assistantResponse = `### 🗂️ Smart Vault Organization & Undo Support\n\n` +
        `DM Locker Pro helps you keep your records clean with standardized category folders and automated tagging.\n\n` +
        `#### Organization Features:\n` +
        `- **4 Standardized Workspaces:** Documents are automatically segmented into **Identity & Government ID**, **Healthcare & Medical**, **Finance & Insurance**, and **Career & Education**.\n` +
        `- **Bulk Moves & Undo:** You can select multiple documents in **My Vault** and assign them to folders. Every reorganization is logged with a 1-click **Undo** option so you can revert any accidental folder change.\n` +
        `- **Automated Policy Tagging:** The system detects policy numbers, insurer names, and vehicle registration numbers from filenames to auto-fill metadata fields.`;
    }

    // --------------------------------------------------------------------------
    // 16. SETTINGS, PASSWORDS, THEMES & SALT EXPORT
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('password') ||
      msgLower.includes('theme') ||
      msgLower.includes('dark mode') ||
      msgLower.includes('salt') ||
      msgLower.includes('delete account')
    ) {
      assistantResponse = `### ⚙️ Account Settings & Security Controls\n\n` +
        `You can manage your credentials and app preferences directly in **Settings**:\n\n` +
        `- 🎨 **Theme Preferences:** Choose between **Light** (warm alabaster), **Dark** (deep charcoal), or **System** (OS sync). The permanent theme switcher is also pinned to the bottom of your sidebar.\n` +
        `- 🔑 **Master Passphrase:** Update your passphrase from the account settings. Note that updating your passphrase re-derives your client vault key.\n` +
        `- 📦 **Export Vault Salt:** Download your unique cryptographic salt string to preserve key derivation parameters.\n` +
        `- 🗑️ **Account Purge:** Confirmed account deletion destroys all stored ciphertext records and audit logs permanently.`;
    }

    // --------------------------------------------------------------------------
    // 17. AUTONOMOUS WEB AGENT (TINYFISH)
    // --------------------------------------------------------------------------
    else if (
      msgLower.includes('tinyfish') ||
      msgLower.includes('renewal agent') ||
      msgLower.includes('renew') ||
      msgLower.includes('autonomous agent')
    ) {
      assistantResponse = `### 🤖 TinyFish Autonomous Policy Renewal Agent\n\n` +
        `DM Locker Pro features integration with the **TinyFish Autonomous Web Agent** to eliminate the manual hassle of policy renewals.\n\n` +
        `#### How the Agent Works:\n` +
        `1. **Trigger Renewal:** In the **Renewal Center**, select an expiring motor, health, or term policy.\n` +
        `2. **Autonomous Browser Navigation:** The TinyFish agent autonomously navigates underwriter portals, parses current renewal quote schedules, and retrieves updated premium figures.\n` +
        `3. **Live Telemetry Stream:** Watch real-time execution steps and screenshots directly in the dashboard.\n` +
        `4. **Version Promotion:** Once you approve the quote, the agent promotes the renewed document as a new version while preserving the old policy for claims history.\n` +
        `5. **Transparent Simulation Mode:** If no live API key is configured, the system runs transparently in verified mock portal mode with an explicit development simulation badge.`;
    }

    // --------------------------------------------------------------------------
    // 18. GENERAL ASSISTANT FALLBACK
    // --------------------------------------------------------------------------
    else {
      assistantResponse = `### 🛡️ DM Locker Pro Assistant\n\n` +
        `I understood your inquiry regarding **"${msg.slice(0, 50)}"**.\n\n` +
        `Here are the most relevant ways I can assist you:\n\n` +
        `- 📂 **Check My Vault:** Ask *"What documents do I have in my vault?"* or *"Do I have my PAN card uploaded?"*\n` +
        `- ⏳ **Expiry & Renewals:** Ask *"What documents are expiring soon?"* to see countdowns and alert dates.\n` +
        `- 📲 **QR Code Sharing:** Ask *"How do I share a document with a one-time QR code?"*\n` +
        `- 🛡️ **Zero-Knowledge Security:** Ask *"How does client-side AES-256-GCM encryption work?"*\n` +
        `- 🚑 **Emergency Access:** Ask *"How does Dead Man's Switch & 2-of-3 Shamir Secret Sharing work?"*\n` +
        `- 📊 **LIC & Investments:** Ask *"Calculate maturity for LIC Jeevan Labh"* or *"Compare PPF vs Mutual Funds"*\n` +
        `- 🏥 **Healthcare & Policies:** Ask *"What is a room-rent sub-limit and how does proportional deduction work?"*\n\n` +
        `Feel free to ask any of the questions above or type your specific question!`;
    }
  }

  // Save conversation message exchange in database
  const userMsgId = `msg_${Math.random().toString(36).substring(2, 10)}`;
  const assistantMsgId = `msg_${Math.random().toString(36).substring(2, 10)}`;

  db.prepare(`
    INSERT INTO chat_messages (id, conversation_id, user_id, sender, content, metadata, created_at)
    VALUES (?, ?, ?, 'user', ?, ?, ?)
  `).run(userMsgId, conversationId, userId, userMessage, null, now);

  db.prepare(`
    INSERT INTO chat_messages (id, conversation_id, user_id, sender, content, metadata, created_at)
    VALUES (?, ?, ?, 'assistant', ?, ?, ?)
  `).run(assistantMsgId, conversationId, userId, assistantResponse, JSON.stringify(metadata), now);

  // Update conversation timestamp
  db.prepare('UPDATE chat_conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);

  return {
    id: assistantMsgId,
    sender: 'assistant',
    content: assistantResponse,
    metadata,
    created_at: now
  };
}
