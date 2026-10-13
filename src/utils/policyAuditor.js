/**
 * DM Locker Pro - On-Device Insurance & Compliance Policy-Gap Auditor
 * 
 * Explainable, rule-based audit engine running 100% in the client browser.
 * Operates on locally extracted document text and verified fields.
 * NEVER transmits plaintext policy clauses to external AI or third-party APIs.
 * 
 * Classifications:
 * - Potential gap: Clause that may impose significant out-of-pocket expenses or limitations.
 * - Important clause: Key terms, waiting periods, or beneficial conditions.
 * - Missing information: Important clause not detected in scanned text (does NOT assume absence).
 * - Needs manual review: Ambiguous wording requiring policyholder inspection.
 */

export function auditPolicyDocumentOnDevice({ rawText, category, title, metadata = {} }) {
  const text = (rawText || '').trim();
  const textLower = text.toLowerCase();

  const isHealth = category === 'Health Insurance' ||
    textLower.includes('health') || textLower.includes('mediclaim') || textLower.includes('hospitalization');

  const isVehicle = category === 'Vehicle Insurance' ||
    textLower.includes('vehicle') || textLower.includes('motor') || textLower.includes('two wheeler') || textLower.includes('car');

  const auditReport = {
    analyzed_at: new Date().toISOString(),
    policy_category: isHealth ? 'Health Insurance' : (isVehicle ? 'Vehicle Insurance' : 'General Records'),
    document_title: title,
    disclaimer: 'Informational document analysis only. This does not constitute legal, financial, or insurance advice. Missing clauses in scanned text do not confirm absence or exclusion under the underwriter master policy.',
    summary: {
      potential_gaps: 0,
      important_clauses: 0,
      missing_info: 0,
      needs_review: 0
    },
    findings: []
  };

  if (isHealth) {
    auditReport.findings = auditHealthPolicyRules(text, textLower);
  } else if (isVehicle) {
    auditReport.findings = auditVehiclePolicyRules(text, textLower);
  } else {
    auditReport.findings = auditGeneralDocumentRules(text, textLower);
  }

  // Calculate summary counts
  for (const f of auditReport.findings) {
    if (f.classification === 'Potential gap') auditReport.summary.potential_gaps++;
    else if (f.classification === 'Important clause') auditReport.summary.important_clauses++;
    else if (f.classification === 'Missing information') auditReport.summary.missing_info++;
    else auditReport.summary.needs_review++;
  }

  return auditReport;
}

/**
 * Health Insurance Rule-Based Audit Logic
 */
function auditHealthPolicyRules(text, textLower) {
  const findings = [];

  // 1. Room Rent Capping & Sub-limits
  const roomRentMatch = text.match(/room\s*rent[^.\n]{5,120}/i);
  if (textLower.includes('single private') || textLower.includes('no capping') || textLower.includes('no sub-limit')) {
    findings.push({
      id: 'hlth_room_rent',
      category: 'Inpatient Hospitalization',
      clause_title: 'Room Rent Capping',
      classification: 'Important clause',
      plain_language_explanation: 'Single private room entitlement without daily capping detected. This protects you from proportionate deduction penalties on associated surgical and ICU charges.',
      evidence_snippet: roomRentMatch ? roomRentMatch[0] : 'Single private air-conditioned room with no sub-limits',
      confidence: 0.95,
      is_detected: true
    });
  } else if (textLower.includes('1%') || textLower.includes('room rent limit') || textLower.includes('capping') || textLower.includes('daily limit')) {
    findings.push({
      id: 'hlth_room_rent',
      category: 'Inpatient Hospitalization',
      clause_title: 'Room Rent Daily Sub-Limit Capping',
      classification: 'Potential gap',
      plain_language_explanation: 'Potential room-rent limit detected. If admitted into a room category priced above this cap, hospitals and insurers apply proportionate deductions to doctors fees, diagnostics, and OT charges.',
      evidence_snippet: roomRentMatch ? roomRentMatch[0] : '1% of Sum Insured daily room rent limitation',
      confidence: 0.92,
      is_detected: true
    });
  } else {
    findings.push({
      id: 'hlth_room_rent',
      category: 'Inpatient Hospitalization',
      clause_title: 'Room Rent Terms',
      classification: 'Missing information',
      plain_language_explanation: 'No explicit room rent category was detected in the document schedule. Verify your policy wordings to determine if single private room or 1% capping applies.',
      evidence_snippet: 'Clause not found in scanned text stream.',
      confidence: 0.85,
      is_detected: false
    });
  }

  // 2. Co-Payment Clauses
  const copayMatch = text.match(/co-?pay(?:ment)?[^.\n]{5,120}/i);
  if (textLower.includes('nil co-pay') || textLower.includes('0% co-pay') || textLower.includes('zero co-pay')) {
    findings.push({
      id: 'hlth_copay',
      category: 'Cost Sharing',
      clause_title: 'Co-Payment Terms',
      classification: 'Important clause',
      plain_language_explanation: 'Zero mandatory co-payment detected. The insurer covers 100% of approved admissible claim amounts.',
      evidence_snippet: copayMatch ? copayMatch[0] : 'Nil co-payment across all networked hospitals',
      confidence: 0.94,
      is_detected: true
    });
  } else if (textLower.includes('co-pay') || textLower.includes('copayment') || textLower.includes('co payment')) {
    findings.push({
      id: 'hlth_copay',
      category: 'Cost Sharing',
      clause_title: 'Mandatory Co-Payment Clause',
      classification: 'Potential gap',
      plain_language_explanation: 'Co-payment clause detected. You are required to bear a fixed percentage of every admissible claim out-of-pocket before insurance payout.',
      evidence_snippet: copayMatch ? copayMatch[0] : 'Mandatory co-payment clause found in policy text',
      confidence: 0.91,
      is_detected: true
    });
  } else {
    findings.push({
      id: 'hlth_copay',
      category: 'Cost Sharing',
      clause_title: 'Co-Payment Provisions',
      classification: 'Missing information',
      plain_language_explanation: 'No co-payment clause explicitly mentioned in schedule. Check if age-related or zonal co-payments exist in detailed terms.',
      evidence_snippet: 'Clause not found in scanned text stream.',
      confidence: 0.85,
      is_detected: false
    });
  }

  // 3. Pre-existing Disease (PED) Waiting Period
  const pedMatch = text.match(/(?:waiting\s+period|pre-?existing|ped)[^.\n]{5,120}/i);
  if (textLower.includes('24 month') || textLower.includes('2 year')) {
    findings.push({
      id: 'hlth_waiting_period',
      category: 'Exclusions & Waiting Periods',
      clause_title: 'Pre-Existing Disease Waiting Period (24 Months)',
      classification: 'Important clause',
      plain_language_explanation: '24-month waiting period detected. Conforms to IRDAI modern circulars. Pre-existing conditions become eligible for claims after 2 years of continuous coverage.',
      evidence_snippet: pedMatch ? pedMatch[0] : '24 Months waiting period from policy inception',
      confidence: 0.93,
      is_detected: true
    });
  } else if (textLower.includes('36 month') || textLower.includes('48 month') || textLower.includes('3 year') || textLower.includes('4 year')) {
    findings.push({
      id: 'hlth_waiting_period',
      category: 'Exclusions & Waiting Periods',
      clause_title: 'Extended Waiting Period (36-48 Months)',
      classification: 'Potential gap',
      plain_language_explanation: 'Long waiting period detected (3-4 years). Claims for pre-existing medical conditions will be declined during this initial period.',
      evidence_snippet: pedMatch ? pedMatch[0] : 'Pre-existing disease waiting period: 36/48 Months',
      confidence: 0.91,
      is_detected: true
    });
  } else {
    findings.push({
      id: 'hlth_waiting_period',
      category: 'Exclusions & Waiting Periods',
      clause_title: 'Waiting Period Schedule',
      classification: 'Needs manual review',
      plain_language_explanation: 'Waiting period terms not found in schedule. Standard initial waiting period (30 days) and specific disease periods (1-2 years) typically apply.',
      evidence_snippet: 'Clause not found in scanned text stream.',
      confidence: 0.80,
      is_detected: false
    });
  }

  // 4. Restoration Benefit & No-Claim Bonus (NCB)
  const restorationMatch = text.match(/(?:restoration|recharge|no-?claim\s+bonus|ncb)[^.\n]{5,120}/i);
  if (textLower.includes('restoration') || textLower.includes('recharge') || textLower.includes('automatic restoration')) {
    findings.push({
      id: 'hlth_restoration',
      category: 'Coverage Extensions',
      clause_title: 'Sum Insured Restoration Benefit',
      classification: 'Important clause',
      plain_language_explanation: 'Automatic restoration benefit detected. If your sum insured is exhausted during the policy year, it is replenished for unrelated illnesses.',
      evidence_snippet: restorationMatch ? restorationMatch[0] : '100% Automatic restoration upon sum insured exhaustion',
      confidence: 0.94,
      is_detected: true
    });
  } else {
    findings.push({
      id: 'hlth_restoration',
      category: 'Coverage Extensions',
      clause_title: 'Restoration Benefit',
      classification: 'Missing information',
      plain_language_explanation: 'No restoration or recharge benefit detected in schedule. If sum insured is exhausted, subsequent hospitalization claims may not be covered.',
      evidence_snippet: 'Clause not found in scanned text stream.',
      confidence: 0.82,
      is_detected: false
    });
  }

  // 5. Modern Treatments & Robotic Surgery
  if (textLower.includes('robotic') || textLower.includes('modern treatment') || textLower.includes('advanced procedures')) {
    findings.push({
      id: 'hlth_modern_treatment',
      category: 'Advanced Medical Technology',
      clause_title: 'Modern Treatment & Robotic Surgery',
      classification: 'Important clause',
      plain_language_explanation: 'Explicit coverage for modern treatments (cyberknife, stem cell therapy, robotic surgery) identified.',
      evidence_snippet: text.match(/(?:robotic|modern\s+treatment)[^.\n]{5,100}/i)?.[0] || 'Modern treatments covered',
      confidence: 0.90,
      is_detected: true
    });
  }

  return findings;
}

/**
 * Vehicle Insurance Rule-Based Audit Logic
 */
function auditVehiclePolicyRules(text, textLower) {
  const findings = [];

  // 1. Third-Party Liability (Compulsory)
  const tpMatch = text.match(/(?:third\s+party|tp\s+liability|mva|section\s+ii)[^.\n]{5,120}/i);
  if (textLower.includes('third party') || textLower.includes('tp liability') || textLower.includes('section ii')) {
    findings.push({
      id: 'veh_tp_liability',
      category: 'Statutory Compliance',
      clause_title: 'Compulsory Third-Party Liability Coverage',
      classification: 'Important clause',
      plain_language_explanation: 'Statutory Motor Vehicles Act coverage detected. Covers legal liability for third-party injury, death, and property damage.',
      evidence_snippet: tpMatch ? tpMatch[0] : 'Section II: Compulsory Third Party Liability Coverage',
      confidence: 0.97,
      is_detected: true
    });
  } else {
    findings.push({
      id: 'veh_tp_liability',
      category: 'Statutory Compliance',
      clause_title: 'Third-Party Liability Verification',
      classification: 'Potential gap',
      plain_language_explanation: 'Third-party liability is not explicitly stated in document. Operating a motor vehicle on public roads without TP cover is a legal offense.',
      evidence_snippet: 'Clause not found in scanned text stream.',
      confidence: 0.90,
      is_detected: false
    });
  }

  // 2. Own Damage (OD) Coverage
  const odMatch = text.match(/(?:own\s+damage|section\s+i|comprehensive)[^.\n]{5,120}/i);
  if (textLower.includes('own damage') || textLower.includes('comprehensive') || textLower.includes('section i')) {
    findings.push({
      id: 'veh_od_coverage',
      category: 'Asset Protection',
      clause_title: 'Own Damage (OD) Physical Loss Coverage',
      classification: 'Important clause',
      plain_language_explanation: 'Covers physical damage to your insured vehicle resulting from road accidents, fire, theft, natural calamities, or vandalism.',
      evidence_snippet: odMatch ? odMatch[0] : 'Section I: Comprehensive Own Damage (OD) Coverage Included',
      confidence: 0.95,
      is_detected: true
    });
  } else {
    findings.push({
      id: 'veh_od_coverage',
      category: 'Asset Protection',
      clause_title: 'Own Damage (OD) Coverage',
      classification: 'Potential gap',
      plain_language_explanation: 'Vehicle may be covered under a standalone Third-Party policy. Physical damage or theft to your own vehicle will not be compensated.',
      evidence_snippet: 'Clause not found in scanned text stream.',
      confidence: 0.88,
      is_detected: false
    });
  }

  // 3. Zero Depreciation (Bumper to Bumper) Add-on
  const zeroDepMatch = text.match(/(?:zero\s+dep|nil\s+dep|bumper\s+to\s+bumper)[^.\n]{5,120}/i);
  if (textLower.includes('zero dep') || textLower.includes('nil dep') || textLower.includes('bumper to bumper')) {
    findings.push({
      id: 'veh_zero_dep',
      category: 'Add-on Endorsement',
      clause_title: 'Zero Depreciation Cover (Bumper to Bumper)',
      classification: 'Important clause',
      plain_language_explanation: 'Zero depreciation endorsement detected. Insurer will not deduct depreciation on plastic, rubber, metal, and fiber glass parts during claim settlements.',
      evidence_snippet: zeroDepMatch ? zeroDepMatch[0] : 'Add-on Endorsement: Zero Depreciation Cover Included',
      confidence: 0.96,
      is_detected: true
    });
  } else {
    findings.push({
      id: 'veh_zero_dep',
      category: 'Add-on Endorsement',
      clause_title: 'Zero Depreciation Add-on',
      classification: 'Missing information',
      plain_language_explanation: 'Zero depreciation add-on not detected. Standard claims will face 20% to 50% depreciation deductions on replaced vehicle parts.',
      evidence_snippet: 'Add-on endorsement not found in policy schedule.',
      confidence: 0.90,
      is_detected: false
    });
  }

  // 4. Compulsory Deductible (IMT Tariff)
  const dedMatch = text.match(/(?:compulsory\s+deductible|excess|imt)[^.\n]{5,100}/i);
  if (textLower.includes('compulsory deductible') || textLower.includes('compulsory excess')) {
    findings.push({
      id: 'veh_deductible',
      category: 'Cost Sharing',
      clause_title: 'Compulsory Excess / Deductible',
      classification: 'Important clause',
      plain_language_explanation: 'Mandatory standard deductible applies on every own-damage claim (typically ₹1,000 to ₹2,000 depending on vehicle cubic capacity).',
      evidence_snippet: dedMatch ? dedMatch[0] : 'Compulsory Deductible: IMT standard fee applies',
      confidence: 0.92,
      is_detected: true
    });
  }

  return findings;
}

/**
 * General Records Audit Fallback
 */
function auditGeneralDocumentRules(text, textLower) {
  return [
    {
      id: 'gen_expiry',
      category: 'Record Lifecycle',
      clause_title: 'Document Validity & Expiry Term',
      classification: textLower.includes('valid') || textLower.includes('expiry') ? 'Important clause' : 'Needs manual review',
      plain_language_explanation: 'Verify validity period to prevent lapse of regulatory compliance or statutory rights.',
      evidence_snippet: text.slice(0, 100),
      confidence: 0.85,
      is_detected: true
    }
  ];
}
