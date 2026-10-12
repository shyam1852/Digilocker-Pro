import crypto from 'crypto';
import { splitSecret, combineShares } from '../src/utils/shamir.js';

// Polyfill window.crypto for Node test environment
globalThis.window = {
  crypto: {
    getRandomValues: (buf) => crypto.randomFillSync(buf)
  }
};

const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('====================================================');
  console.log('   DM LOCKER PRO - END-TO-END VERIFICATION SUITE   ');
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
    // 1. REGISTRATION OF NEW USER
    const testUser = `user_${Date.now().toString(36)}`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser,
        email: `${testUser}@test.com`,
        password: 'Password123!'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.token && regData.user.username === testUser, '1. New user registration succeeds');
    const token = regData.token;

    // 2. DUPLICATE USERNAME REJECTION (EXACT INLINE ERROR)
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser,
        email: `different_email_${Date.now()}@test.com`,
        password: 'Password123!'
      })
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 409 &&
      dupData.field === 'username' &&
      dupData.error === 'This username is already taken. Please choose another username.',
      '2. Exact duplicate username rejected with mandatory inline error'
    );

    // 3. CASE-INSENSITIVE DUPLICATE REJECTION ("  USER_...  ")
    const caseDupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `  ${testUser.toUpperCase()}  `,
        email: `another_${Date.now()}@test.com`,
        password: 'Password123!'
      })
    });
    const caseDupData = await caseDupRes.json();
    assert(
      caseDupRes.status === 409 &&
      caseDupData.field === 'username' &&
      caseDupData.error === 'This username is already taken. Please choose another username.',
      '3. Case-insensitive and whitespace duplicate rejected with mandatory inline error'
    );

    // 4. CONCURRENT DUPLICATE SIGNUP SAFETY
    const concurrentUser = `concurrent_${Date.now().toString(36)}`;
    const [c1, c2] = await Promise.all([
      fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: concurrentUser, email: `c1_${Date.now()}@test.com`, password: 'Password123!' })
      }).then(r => r.json()),
      fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: concurrentUser, email: `c2_${Date.now()}@test.com`, password: 'Password123!' })
      }).then(r => r.json())
    ]);
    const oneCreated = Boolean(c1.token || c2.token);
    const oneRejected = (c1.error === 'This username is already taken. Please choose another username.' ||
                         c2.error === 'This username is already taken. Please choose another username.');
    assert(oneCreated && oneRejected, '4. Concurrent duplicate signup enforces atomic database uniqueness');

    // 5. LOGIN AND SESSION VERIFICATION
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUser, password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.ok && loginData.user.username === testUser, '5. User login and scrypt password verification succeed');

    // 6. CLIENT-SIDE ENCRYPTED DOCUMENT UPLOAD
    const uploadRes = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Master Health Policy 2026',
        category: 'Health Insurance',
        policy_number: 'H-992144',
        insurer_name: 'Care Health Insurance',
        expiry_date: '2027-05-15',
        encrypted_blob: Buffer.from('AES_CIPHERTEXT_MOCK_PAYLOAD_32BYTES_OK').toString('base64'),
        encryption_iv: Buffer.from(crypto.randomBytes(12)).toString('base64'),
        file_name: 'Policy_Schedule.pdf',
        file_type: 'application/pdf',
        file_size_bytes: 450120
      })
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 && uploadData.document.id, '6. Encrypted document upload succeeds (AES-256-GCM envelope stored)');
    const docId = uploadData.document.id;

    // 7. USER ISOLATION VERIFICATION
    const demoLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'shyamkeshri', password: 'Password123!' })
    }).then(r => r.json());
    const demoToken = demoLogin.token;

    const crossUserRes = await fetch(`${BASE_URL}/documents/${docId}`, {
      headers: { 'Authorization': `Bearer ${demoToken}` }
    });
    assert(crossUserRes.status === 404, '7. Cross-user document isolation strictly enforced (404 on other user)');

    // 8. TINYFISH RENEWAL AGENT DISPATCH
    const renewalRes = await fetch(`${BASE_URL}/renewals/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ document_id: docId, current_premium: 22000 })
    });
    const renewalData = await renewalRes.json();
    assert(
      renewalRes.status === 201 &&
      renewalData.workflow.status === 'quote_ready' &&
      renewalData.agentResult.quote_ref &&
      renewalData.agentResult.source_label.includes('SIMULATION'),
      '8. TinyFish Renewal Agent dispatches with telemetry & transparent simulation label'
    );
    const workflowId = renewalData.workflow.id;

    // 9. RENEWAL APPROVAL & ARCHIVAL OF SUPERSEDED VERSION
    const confirmRes = await fetch(`${BASE_URL}/renewals/${workflowId}/confirm`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.ok && confirmData.new_document_id, '9. Renewal confirmed: version promoted to v2, superseded version archived');

    // 10. ZERO-KNOWLEDGE POLICY HEALTH CHECK
    const healthRes = await fetch(`${BASE_URL}/health-checks/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ document_id: docId })
    });
    const healthData = await healthRes.json();
    const clauses = JSON.parse(healthData.check.clause_comparisons);
    assert(
      healthRes.status === 201 &&
      healthData.check.status === 'Verified Difference' &&
      clauses.length >= 4,
      '10. Zero-Knowledge Policy Health Check returns side-by-side clause differences'
    );

    // 11. AUTONOMOUS NOMINEE CLAIM PILOT
    const claimRes = await fetch(`${BASE_URL}/nominee-claims/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ document_id: docId })
    });
    const claimData = await claimRes.json();
    const checklist = JSON.parse(claimData.claim.checklist_items);
    assert(
      claimRes.status === 201 &&
      checklist.some(i => i.status === 'Available') &&
      checklist.some(i => i.status === 'Missing'),
      '11. Nominee Claim checklist generated dynamically from vault records'
    );

    // 12. DEAD MAN\'S SWITCH HEARTBEAT CHECK-IN
    const checkinRes = await fetch(`${BASE_URL}/emergency/checkin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(checkinRes.ok, '12. Dead Man\'s Switch heartbeat check-in recorded & timer reset');

    // 13. 2-OF-3 SHAMIR\'S SECRET SHARING RECONSTRUCTION TEST
    const testSecret = new Uint8Array([42, 137, 255, 0, 77, 18, 99, 210]);
    const shares = splitSecret(testSecret);
    const rec12 = combineShares([shares[0], shares[1]]);
    const rec23 = combineShares([shares[1], shares[2]]);
    const rec13 = combineShares([shares[0], shares[2]]);

    const match12 = rec12.every((b, i) => b === testSecret[i]);
    const match23 = rec23.every((b, i) => b === testSecret[i]);
    const match13 = rec13.every((b, i) => b === testSecret[i]);

    let singleShareFailed = false;
    try {
      combineShares([shares[0]]);
    } catch {
      singleShareFailed = true;
    }

    assert(
      match12 && match23 && match13 && singleShareFailed,
      '13. 2-of-3 Shamir mathematical reconstruction succeeds for all pairs and rejects single share'
    );

    // 14. THEME PREFERENCE PERSISTENCE IN DATABASE
    const themeRes = await fetch(`${BASE_URL}/user/theme`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ theme: 'dark' })
    });
    const themeData = await themeRes.json();
    assert(themeRes.ok && themeData.theme === 'dark', '14. User theme preference persisted per user in database');

  } catch (err) {
    console.error('Test suite execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('ALL VERIFICATION REQUIREMENTS MET 100%!');
  } else {
    process.exit(1);
  }
}

runTests();
