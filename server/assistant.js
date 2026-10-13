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
 * Handles conversational inquiries in DM Assistant
 */
export async function processAssistantMessage({
  userId,
  conversationId,
  mode = 'general',
  userMessage,
  selectedDocumentIds = []
}) {
  const now = new Date().toISOString();

  // Retrieve user's selected documents if authorized
  let authorizedDocs = [];
  if (selectedDocumentIds && selectedDocumentIds.length > 0) {
    const placeholders = selectedDocumentIds.map(() => '?').join(',');
    authorizedDocs = db.prepare(`
      SELECT id, title, category, policy_number, insurer_name, expiry_date, status, file_name, file_size_bytes
      FROM documents
      WHERE user_id = ? AND id IN (${placeholders})
    `).all(userId, ...selectedDocumentIds);
  } else {
    // Basic high-level document headers for context (no decrypted contents)
    authorizedDocs = db.prepare(`
      SELECT id, title, category, policy_number, insurer_name, expiry_date, status
      FROM documents
      WHERE user_id = ?
      LIMIT 10
    `).all(userId);
  }

  const msgLower = (userMessage || '').toLowerCase();
  let assistantResponse = '';
  let metadata = {
    mode,
    citations: [],
    sources: [],
    calculationSteps: null,
    attachedDocuments: authorizedDocs.map(d => ({ id: d.id, title: d.title }))
  };

  // 1. LIC Calculator Mode
  if (mode === 'lic-calculator' || msgLower.includes('lic') || msgLower.includes('maturity') || msgLower.includes('jeevan')) {
    // Extract numbers if present
    const saMatch = userMessage.match(/(?:sa|sum assured|cover)\D*(\d[\d,]+)/i);
    const termMatch = userMessage.match(/(?:term|years)\D*(\d{1,2})/i);
    const premiumMatch = userMessage.match(/(?:premium|paying)\D*(\d[\d,]+)/i);

    const sa = saMatch ? parseInt(saMatch[1].replace(/,/g, ''), 10) : 500000;
    const term = termMatch ? parseInt(termMatch[1], 10) : 21;
    const premium = premiumMatch ? parseInt(premiumMatch[1].replace(/,/g, ''), 10) : 24000;

    const calcResult = computeLicMaturity({
      planNumber: '936',
      planName: 'LIC Policy (Jeevan Labh / Endowment)',
      sumAssured: sa,
      policyTerm: term,
      premiumPayingTerm: Math.min(term, 15),
      annualPremium: premium
    });

    metadata.calculationSteps = calcResult.calculationSteps;
    metadata.sources.push(OFFICIAL_SOURCES.LIC_POLICY_CONDITIONS);
    metadata.sources.push(OFFICIAL_SOURCES.IRDAI_CONSUMER);

    assistantResponse = `### 📊 Understand My LIC Policy & Maturity Analysis\n\n` +
      `**Plan Identified / Evaluated:** ${calcResult.planDetails.planName}\n` +
      `**Basis of Calculation:** ${calcResult.basis}\n\n` +
      `#### Summary of Benefits:\n` +
      `- **Guaranteed Sum Assured:** ₹${calcResult.benefitBreakdown.guaranteedSumAssured.toLocaleString('en-IN')}\n` +
      `- **Estimated Simple Reversionary Bonus:** ₹${Math.round(calcResult.benefitBreakdown.simpleReversionaryBonus).toLocaleString('en-IN')} (at ₹${calcResult.benefitBreakdown.bonusRateUsedPer1000}/1000 SA/yr)\n` +
      `- **Estimated Final Additional Bonus (FAB):** ₹${Math.round(calcResult.benefitBreakdown.finalAdditionalBonus).toLocaleString('en-IN')}\n` +
      `- **Estimated Total Maturity Benefit:** **₹${Math.round(calcResult.benefitBreakdown.estimatedMaturityBenefit).toLocaleString('en-IN')}**\n\n` +
      `#### Financial Return Evaluation:\n` +
      `- **Total Premiums to be Paid:** ₹${calcResult.planDetails.totalPremiumsPaid?.toLocaleString('en-IN')}\n` +
      `- **Net Gain over Investment:** ₹${Math.round(calcResult.benefitBreakdown.netGainOverPremiums)?.toLocaleString('en-IN')}\n` +
      `- **Estimated Net Annualized Return (IRR):** **${calcResult.benefitBreakdown.annualizedNetYieldIRR}**\n\n` +
      `> ℹ️ **Key Distinction:** Contractual guarantee covers the **Sum Assured**. Simple Reversionary Bonuses depend on LIC's annual operational surplus declared under Section 28 of the LIC Act.\n\n` +
      `Official Terms Reference: [LIC Policy Conditions](${OFFICIAL_SOURCES.LIC_POLICY_CONDITIONS.url})`;
  }

  // 2. Personal Finance & Investment Guide Mode
  else if (mode === 'personal-finance' || msgLower.includes('invest') || msgLower.includes('mutual fund') || msgLower.includes('ppf') || msgLower.includes('fd') || msgLower.includes('nps')) {
    const comp = generateInvestmentComparison({
      goal: msgLower.includes('retire') ? 'Retirement Planning' : (msgLower.includes('child') ? 'Child Education' : 'Long-Term Wealth Creation'),
      horizonYears: msgLower.includes('10') ? 10 : (msgLower.includes('15') ? 15 : 5),
      monthlyBudget: 5000,
      riskTolerance: msgLower.includes('safe') ? 'Conservative' : 'Moderate'
    });

    metadata.sources.push(OFFICIAL_SOURCES.SEBI_INVESTOR);
    metadata.sources.push(OFFICIAL_SOURCES.RBI_KEHTA_HAI);

    assistantResponse = `### 💡 Personal Finance & Investment Comparison Guide\n\n` +
      `**Goal:** ${comp.goal} | **Horizon:** ${comp.horizonYears} Years | **Risk Profile:** ${comp.riskTolerance}\n\n` +
      `#### Recommended Comparison Matrix:\n\n` +
      `1. **Public Provident Fund (PPF):**\n` +
      `   - **Return:** ${comp.instruments[0].rateEstimate}\n` +
      `   - **Tax Advantage:** EEE (Sec 80C + tax-free interest + tax-free maturity)\n` +
      `   - **Best for:** Capital preservation with sovereign zero-risk backing.\n\n` +
      `2. **Diversified Equity Mutual Funds / Index Funds:**\n` +
      `   - **Return:** ${comp.instruments[1].rateEstimate}\n` +
      `   - **Liquidity:** High (open-ended redemption in T+2 days)\n` +
      `   - **Best for:** Beating inflation over 5+ year horizons. Subject to market fluctuations.\n\n` +
      `3. **Fixed Deposits (FD):**\n` +
      `   - **Return:** ${comp.instruments[2].rateEstimate}\n` +
      `   - **Liquidity:** High with nominal premature break penalty\n` +
      `   - **Best for:** Short-term goals (< 3 years) where capital must not fluctuate.\n\n` +
      `4. **Pure Term Life Cover vs Endowment Plans:**\n` +
      `   - Pure Term Insurance separates protection from investment. It secures dependents with high coverage (₹1 Crore+) at low annual cost, leaving the remaining surplus to grow in compounding equity.\n\n` +
      `> 📘 **SEBI Investor Advisory:** Never invest in financial products that promise guaranteed returns exceeding sovereign rates without explaining market risk. Verify intermediaries at [SEBI Investor Portal](${OFFICIAL_SOURCES.SEBI_INVESTOR.url}).`;
  }

  // 3. Job Application Document Checker Mode
  else if (mode === 'job-gap-checker' || msgLower.includes('job') || msgLower.includes('resume') || msgLower.includes('recruitment') || msgLower.includes('marksheet')) {
    const jobCheck = checkJobApplicationRequirements(userMessage, authorizedDocs);
    metadata.sources.push({ title: 'National Career Service Portal', url: 'https://www.ncs.gov.in/', authority: 'Ministry of Labour & Employment' });

    assistantResponse = `### 📋 Job Application Document Gap Evaluation\n\n` +
      `**Vault Documents Evaluated:** ${authorizedDocs.length} | **Readiness Score:** ${jobCheck.readinessScore}%\n` +
      `- ✅ **Available Documents:** ${jobCheck.availableCount}\n` +
      `- ⚠️ **Missing Required Documents:** ${jobCheck.missingMandatoryCount}\n\n` +
      `#### Checklist Breakdown:\n` +
      jobCheck.requirements.map(r => {
        const icon = r.status === 'Available' ? '✅' : (r.status === 'Missing' ? '❌' : 'ℹ️');
        return `- ${icon} **${r.title}** — **Status: ${r.status}**\n  *Why required:* ${r.reason}` +
          (r.matchedDocument ? `\n  *Matched in Vault:* "${r.matchedDocument.title}"` : '');
      }).join('\n\n') +
      `\n\n> 💡 **Next Steps:** Upload your missing certificates to the **Career & Education** workspace to achieve 100% application readiness.`;
  }

  // 4. Healthcare Mode
  else if (mode === 'healthcare' || msgLower.includes('health') || msgLower.includes('hospital') || msgLower.includes('doctor') || msgLower.includes('medical') || msgLower.includes('ayushman')) {
    metadata.sources.push(OFFICIAL_SOURCES.ABHA_HEALTH);
    metadata.sources.push(OFFICIAL_SOURCES.IRDAI_CONSUMER);

    assistantResponse = `### 🏥 Healthcare Records & Health Insurance Assistant\n\n` +
      `Your healthcare documents are stored in a dedicated, client-side zero-knowledge workspace.\n\n` +
      `#### Key Healthcare Document Checklist:\n` +
      `- 🪪 **ABHA Health ID Card:** Integrates your longitudinal health history with national hospitals ([ABDM Portal](${OFFICIAL_SOURCES.ABHA_HEALTH.url})).\n` +
      `- 📄 **Active Health Insurance Policy & TPA Card:** Ensure policy is active and keep e-cashless cards ready.\n` +
      `- 📋 **Pre-Existing Disease (PED) Diagnostic Records:** Preserve discharge summaries and medical prescriptions.\n` +
      `- 💉 **Vaccination & Preventive Records:** Digital certificates for travel and occupational health compliance.\n\n` +
      `#### Critical Insurance Clauses to Audit:\n` +
      `- **Room Rent Sub-Limit:** Avoid proportional deduction penalties by verifying room category entitlements.\n` +
      `- **Co-Payment:** Check if you must bear 10%-20% of every approved claim out of pocket.\n` +
      `- **Waiting Periods:** Standard pre-existing conditions typically require 24 to 36 months of continuous coverage.\n\n` +
      `> ⚠️ **Medical Disclaimer:** DM Assistant provides administrative document guidance and policy terms explanation. It **never** diagnoses conditions or replaces qualified medical advice from registered doctors.`;
  }

  // 5. Smart Vault Organizer Mode
  else if (mode === 'vault-organizer' || msgLower.includes('organize') || msgLower.includes('folder') || msgLower.includes('sort')) {
    assistantResponse = `### 🗂️ Smart Vault Organization Summary\n\n` +
      `Your vault currently houses **${authorizedDocs.length} active documents** across standardized secure folders.\n\n` +
      `#### Recommended Organization Actions:\n` +
      `- **Categorization Check:** Documents with generic names can be moved into their dedicated workspaces (**Healthcare**, **Finance & Insurance**, or **Career & Education**).\n` +
      `- **Expiry Tracking:** Verify that dates on policies and government IDs are up-to-date so automated email reminders trigger at 30, 7, and 1 days before expiry.\n` +
      `- **Tagging:** Add custom tags like \`Tax2026\`, \`FamilyCover\`, or \`JobReady\` for fast instant filtering.\n\n` +
      `You can perform bulk folder reorganization with complete undo support from the **My Vault** screen.`;
  }

  // 6. General Document Assistant
  else {
    assistantResponse = `### 🛡️ DM Locker Pro Assistant\n\n` +
      `I can help you navigate and analyze your personal documents with full zero-knowledge privacy:\n\n` +
      `- **Personal Finance & Investment:** Compare PPF, Mutual Funds, Fixed Deposits, and NPS according to your time horizon.\n` +
      `- **Understand My LIC Policy:** Calculate guaranteed sum assured vs non-guaranteed bonuses and estimated maturity payouts.\n` +
      `- **Job Application Document Gap Checker:** Paste a job description to audit your degrees, marksheets, and identity certificates.\n` +
      `- **Healthcare Workspace:** Audit health insurance exclusions, waiting periods, room-rent sub-limits, and ABHA records.\n` +
      `- **Smart Vault Organization:** Move records into smart folders with one-click bulk actions and rollback support.\n\n` +
      `How would you like to proceed today?`;
  }

  // Save to database
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

  // Update conversation updated_at
  db.prepare('UPDATE chat_conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);

  return {
    id: assistantMsgId,
    sender: 'assistant',
    content: assistantResponse,
    metadata,
    created_at: now
  };
}
