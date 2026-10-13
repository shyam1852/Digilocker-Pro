/**
 * DM LOCKER PRO — PURE CLIENT/SHARED FINANCIAL & CAREER CALCULATORS
 * 
 * Zero backend dependencies — 100% safe to run in browser and server.
 */

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

export const KNOWN_LIC_PLANS = {
  '914': { name: 'LIC New Endowment Plan (Table 914)', minTerm: 12, maxTerm: 35, avgBonus: 44, type: 'Participating Endowment' },
  '936': { name: 'LIC Jeevan Labh (Table 936)', terms: [16, 21, 25], ppts: [10, 15, 16], avgBonus: 46, type: 'Limited Premium Endowment' },
  '945': { name: 'LIC Jeevan Umang (Table 945)', ppts: [15, 20, 25, 30], avgBonus: 48, survivalBenefit: 0.08, type: 'Whole Life Participating' },
  '933': { name: 'LIC Jeevan Lakshya (Table 933)', minTerm: 13, maxTerm: 25, avgBonus: 45, type: 'Child Security / Income Benefit' },
  '915': { name: 'LIC New Jeevan Anand (Table 915)', minTerm: 15, maxTerm: 35, avgBonus: 45, type: 'Endowment + Whole Life' },
  '854': { name: 'LIC Tech Term (Table 854)', type: 'Pure Protection Term Plan', avgBonus: 0, maturityBenefit: 'None (Pure Protection)' }
};

export function calculateAnnualizedIRR(annualPremium, ppt, maturityAmount, policyTerm) {
  if (!annualPremium || !ppt || !maturityAmount || !policyTerm || policyTerm <= 0) return null;

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

  let r = 0.05;
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
  const totalPremiumsPaid = premium > 0 ? premium * ppt : null;

  let assumedBonusRate = bonusRatePer1000;
  let isBonusEstimated = false;
  if (assumedBonusRate === null || assumedBonusRate === undefined || isNaN(assumedBonusRate)) {
    assumedBonusRate = planInfo?.avgBonus || 42;
    isBonusEstimated = true;
  }

  const totalSimpleBonus = (assumedBonusRate / 1000) * sa * term;

  let assumedFabRate = finalAdditionalBonusPer1000;
  if (assumedFabRate === null || assumedFabRate === undefined || isNaN(assumedFabRate)) {
    if (term >= 25) assumedFabRate = 250;
    else if (term >= 20) assumedFabRate = 100;
    else if (term >= 15) assumedFabRate = 50;
    else assumedFabRate = 0;
  }
  const totalFab = (assumedFabRate / 1000) * sa;
  const estimatedMaturity = sa + totalSimpleBonus + totalFab;
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

export function checkJobApplicationRequirements(jobDescriptionText, vaultDocuments = []) {
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
    return {
      status: 'EMPTY_INPUT',
      message: 'Please paste a job description or recruitment notification text to extract requirements.'
    };
  }

  const jdLower = jobDescriptionText.toLowerCase();

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
