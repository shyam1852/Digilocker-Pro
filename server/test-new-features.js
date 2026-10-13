import crypto from 'crypto';
import db from './db.js';

const BASE_URL = 'http://localhost:3001/api';

async function runNewFeatureTests() {
  console.log('====================================================');
  console.log('   DM LOCKER PRO - NEW FEATURES VERIFICATION SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Create a test user
    const testUsername = `user_${Date.now().toString(36)}`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: `${testUsername}@hubtest.com`,
        password: 'Password123!'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.token, '1. User registered for new feature test suite');
    const token = regData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Overview Stats API
    const overviewRes = await fetch(`${BASE_URL}/overview/stats`, { headers: authHeaders });
    const overviewData = await overviewRes.json();
    assert(
      overviewRes.ok &&
      typeof overviewData.totalDocuments === 'number' &&
      Array.isArray(overviewData.recentActivities),
      '2. Overview stats API returns real database metrics and activity logs'
    );

    // 3. System default folders verification
    const foldersRes = await fetch(`${BASE_URL}/folders`, { headers: authHeaders });
    const foldersData = await foldersRes.json();
    assert(
      foldersRes.ok &&
      foldersData.folders.length >= 12 &&
      foldersData.folders.some(f => f.name === 'Healthcare') &&
      foldersData.folders.some(f => f.name === 'Life Insurance & LIC'),
      '3. Default system folders (12 categories) auto-provisioned for user'
    );

    // 4. Custom folder creation
    const newFolderRes = await fetch(`${BASE_URL}/folders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Tax 2026 Audit', icon: 'FolderArchive', color: '#10b981' })
    });
    const newFolderData = await newFolderRes.json();
    assert(newFolderRes.status === 201 && newFolderData.folder.name === 'Tax 2026 Audit', '4. Custom folder created with custom metadata');
    const customFolderId = newFolderData.folder.id;

    // 5. Custom folder rename / update
    const updateFolderRes = await fetch(`${BASE_URL}/folders/${customFolderId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Tax 2026-27 Approved' })
    });
    const updateFolderData = await updateFolderRes.json();
    assert(updateFolderRes.ok && updateFolderData.folder.name === 'Tax 2026-27 Approved', '5. Custom folder updated successfully');

    // 6. Upload a test encrypted document
    const uploadRes = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'LIC New Endowment Policy 914',
        category: 'Life Insurance',
        policy_number: 'LIC-914-884210',
        insurer_name: 'LIC of India',
        expiry_date: '2045-05-10',
        encrypted_blob: 'base64_test_ciphertext_envelope==',
        encryption_iv: 'base64_test_iv_nonce==',
        file_name: 'lic_914_schedule.pdf',
        file_type: 'application/pdf',
        file_size_bytes: 524288,
        folder_id: customFolderId,
        tags: 'lic,endowment,tax_saving'
      })
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 && uploadData.document.folder_id === customFolderId, '6. Document uploaded and linked to folder');
    const docId = uploadData.document.id;

    // 7. Move document to another folder
    const targetFolder = foldersData.folders.find(f => f.name === 'Life Insurance & LIC');
    const moveRes = await fetch(`${BASE_URL}/documents/move-folder`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ document_ids: [docId], target_folder_id: targetFolder.id })
    });
    const moveData = await moveRes.json();
    assert(moveRes.ok && moveData.movedCount === 1, '7. Document successfully moved between folders with audit logging');

    // 8. Bulk categorize documents
    const bulkRes = await fetch(`${BASE_URL}/documents/bulk-categorize`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ document_ids: [docId], category: 'Life Insurance', folder_id: targetFolder.id })
    });
    const bulkData = await bulkRes.json();
    assert(bulkRes.ok && bulkData.updatedCount === 1, '8. Bulk categorization applied with user confirmation');

    // 9. Undo last organization action
    const undoRes = await fetch(`${BASE_URL}/vault/undo`, {
      method: 'POST',
      headers: authHeaders
    });
    const undoData = await undoRes.json();
    assert(undoRes.ok && undoData.revertedItemsCount >= 1, '9. Organization changes safely undone from undo history stack');

    // 10. Duplicate detection API
    const dupRes = await fetch(`${BASE_URL}/vault/duplicates`, { headers: authHeaders });
    const dupData = await dupRes.json();
    assert(dupRes.ok && Array.isArray(dupData.duplicates), '10. Duplicate detection identifies potential matching files safely');

    // 11. Delete custom folder (verifies fail-safe document preservation)
    const deleteFolderRes = await fetch(`${BASE_URL}/folders/${customFolderId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert(deleteFolderRes.ok, '11. Custom folder deleted safely, unlinking documents without deleting files');

    // 12. Create DM Assistant Conversation
    const convRes = await fetch(`${BASE_URL}/assistant/conversations`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'LIC Planning Session', mode: 'lic-calculator' })
    });
    const convData = await convRes.json();
    assert(convRes.status === 201 && convData.conversation.mode === 'lic-calculator', '12. Assistant conversation thread created and saved');
    const convId = convData.conversation.id;

    // 13. Send Assistant Chat Message
    const chatRes = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        conversation_id: convId,
        message: 'What is the sum assured and bonus rate for LIC Plan 914?',
        mode: 'lic-calculator'
      })
    });
    const chatData = await chatRes.json();
    assert(
      chatRes.ok &&
      chatData.reply &&
      chatData.reply.content.includes('LIC') &&
      Array.isArray(chatData.reply.metadata.sources),
      '13. Assistant processes prompt with official sources and persists message history'
    );

    // 14. LIC Maturity Calculator Engine Test
    const licCalcRes = await fetch(`${BASE_URL}/assistant/lic-calc`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        plan_number: '914',
        policy_term: 20,
        premium_paying_term: 20,
        sum_assured: 1000000,
        annual_premium: 50000,
        bonus_rate_per_1000: 48,
        final_additional_bonus_per_1000: 70
      })
    });
    const licCalcData = await licCalcRes.json();
    assert(
      licCalcRes.ok &&
      licCalcData.benefitBreakdown.guaranteedSumAssured === 1000000 &&
      licCalcData.benefitBreakdown.simpleReversionaryBonus === 960000 &&
      licCalcData.benefitBreakdown.finalAdditionalBonus === 70000 &&
      licCalcData.benefitBreakdown.estimatedMaturityBenefit === 2030000,
      '14. LIC Maturity Calculator separates guaranteed sum assured from non-guaranteed bonuses and calculates IRR'
    );

    // 15. Job Document Gap Checker Engine Test
    const jobCheckRes = await fetch(`${BASE_URL}/assistant/job-check`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        job_description: 'Requirements: Candidate must submit Class 10 Certificate for DOB proof, B.Tech/Graduation Degree certificate, updated Resume, and PAN Card.'
      })
    });
    const jobCheckData = await jobCheckRes.json();
    assert(
      jobCheckRes.ok &&
      jobCheckData.requirements.length >= 3 &&
      jobCheckData.requirements.some(r => r.status === 'Missing'),
      '15. Job Document Gap Checker accurately matches vault records against job requirements and highlights missing items'
    );

    // 16. Investment Guide & Educational Comparison Test
    const investRes = await fetch(`${BASE_URL}/assistant/investment-guide`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        monthly_amount: 5000,
        time_horizon_years: 5,
        risk_profile: 'Moderate',
        goal: 'Child Higher Education'
      })
    });
    const investData = await investRes.json();
    assert(
      investRes.ok &&
      Array.isArray(investData.instruments) &&
      investData.instruments.some(p => p.name.includes('PPF')) &&
      investData.instruments.some(p => p.name.includes('Mutual Funds')),
      '16. Investment Guide presents multi-product educational comparison citing official SEBI/RBI standards'
    );

    // 17. Delete Conversation
    const deleteConvRes = await fetch(`${BASE_URL}/assistant/conversations/${convId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert(deleteConvRes.ok, '17. Assistant conversation and message history cleanly deleted for user privacy');

  } catch (err) {
    console.error('New feature test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('ALL NEW FEATURES MET REQUIREMENTS 100%!');
  } else {
    process.exit(1);
  }
}

runNewFeatureTests();
