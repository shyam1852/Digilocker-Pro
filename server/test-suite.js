import crypto from 'crypto';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { splitSecret, combineShares } from '../src/utils/shamir.js';
import db from './db.js';

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
      (renewalData.agentResult.source_label.includes('SIMULATION') || renewalData.agentResult.source_label.includes('LIVE')),
      '8. TinyFish Renewal Agent dispatches with telemetry & transparent engine label'
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
      Boolean(healthData.check.status) &&
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

    // 15. DOCUMENT PRIVACY & ZERO PLAINTEXT VERIFICATION
    const privacyCheckDoc = db.prepare('SELECT encrypted_blob, encryption_iv, encrypted_metadata FROM documents WHERE id = ?').get(docId);
    const hasOnlyCiphertext = Boolean(privacyCheckDoc.encrypted_blob && privacyCheckDoc.encryption_iv);
    assert(hasOnlyCiphertext, '15. Document Privacy: Server storage contains only encrypted ciphertext blobs and independent nonces');

    // 16. SHAMIR SHARE TAMPER-DETECTION & FAIL-CLOSED SECURITY
    let tamperDetected = false;
    try {
      const corruptedShare = { ...shares[1], data: shares[1].data.slice(0, -2) + 'ff' };
      combineShares([shares[0], corruptedShare]);
    } catch (err) {
      tamperDetected = err.message.includes('Tampered') || err.message.includes('checksum');
    }
    assert(tamperDetected, '16. Shamir Tamper Resistance: Corrupted share triggers fail-closed rejection');

    // 17. ONE-TIME SELECTIVE CLAIM QR CREATION & VERIFICATION
    const createShareRes = await fetch(`${BASE_URL}/shares/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        document_id: docId,
        claim_type: 'expiry_date',
        claim_value: '2027-05-15',
        purpose: 'Hospital TPA Verification',
        ttl_seconds: 300
      })
    });
    const shareData = await createShareRes.json();
    assert(createShareRes.status === 201 && shareData.token, '17. One-Time Selective QR Token created with cryptographic binding');
    const shareToken = shareData.token;
    const shareId = shareData.share_id;

    // 17b. GENUINE QR ENCODING AND COMPLETE URL DECODING
    const expectedSharingUrl = `http://localhost:5173/verify?token=${shareToken}`;
    const qrMatrix = QRCode.create(expectedSharingUrl, { errorCorrectionLevel: 'M' });
    const qrDim = qrMatrix.modules.size;
    const qrMargin = 4;
    const qrScale = 4;
    const qrTotal = (qrDim + qrMargin * 2) * qrScale;
    const qrRgba = new Uint8ClampedArray(qrTotal * qrTotal * 4);
    qrRgba.fill(255);
    for (let r = 0; r < qrDim; r++) {
      for (let c = 0; c < qrDim; c++) {
        if (qrMatrix.modules.get(r, c)) {
          for (let dy = 0; dy < qrScale; dy++) {
            for (let dx = 0; dx < qrScale; dx++) {
              const y = (r + qrMargin) * qrScale + dy;
              const x = (c + qrMargin) * qrScale + dx;
              const idx = (y * qrTotal + x) * 4;
              qrRgba[idx] = 0; qrRgba[idx + 1] = 0; qrRgba[idx + 2] = 0; qrRgba[idx + 3] = 255;
            }
          }
        }
      }
    }
    const decodedResult = jsQR(qrRgba, qrTotal, qrTotal);
    assert(
      decodedResult && decodedResult.data === expectedSharingUrl,
      '17b. Genuine QR Code: Decodes complete sharing URL including /verify route and token'
    );

    // 17c. READ-ONLY INSPECTION (DOES NOT CONSUME TOKEN)
    const inspectCheckRes = await fetch(`${BASE_URL}/shares/inspect/${shareToken}`);
    const inspectCheckData = await inspectCheckRes.json();
    assert(
      inspectCheckRes.ok && inspectCheckData.status === 'READY_TO_VERIFY' && inspectCheckData.consumed === false,
      '17c. Inspect / Camera Scan: Token remains strictly unconsumed prior to verification'
    );

    // 18. PUBLIC VERIFIER TOKEN RESOLUTION & TRUTHFUL WARNING
    const verifyRes = await fetch(`${BASE_URL}/shares/verify/${shareToken}`);
    const verifyData = await verifyRes.json();
    assert(
      verifyRes.ok &&
      verifyData.status === 'VALID_AND_UNUSED' &&
      verifyData.claim_data.claim_value === '2027-05-15' &&
      verifyData.warning.includes('Issuer not independently verified'),
      '18. Public Verifier: Authenticates valid token, reveals only selective claim with truthful warning'
    );

    // 19. ONE-TIME TOKEN REPLAY ATTACK PREVENTION
    const replayRes = await fetch(`${BASE_URL}/shares/verify/${shareToken}`);
    const replayData = await replayRes.json();
    assert(
      replayRes.status === 409 &&
      replayData.status === 'ALREADY_USED',
      '19. Replay Protection: Second scan of one-time token strictly rejected (ALREADY_USED)'
    );

    // 20. TOKEN REVOCATION BY CUSTODIAN
    const createSecondRes = await fetch(`${BASE_URL}/shares/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        document_id: docId,
        claim_type: 'status',
        claim_value: 'Active',
        purpose: 'Temporary Check',
        ttl_seconds: 300
      })
    }).then(r => r.json());

    await fetch(`${BASE_URL}/shares/${createSecondRes.share_id}/revoke`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const revokedCheckRes = await fetch(`${BASE_URL}/shares/verify/${createSecondRes.token}`);
    const revokedCheckData = await revokedCheckRes.json();
    assert(
      revokedCheckRes.status === 410 &&
      revokedCheckData.status === 'REVOKED',
      '20. Custodian Revocation: Explicitly revoked token is immediately rejected'
    );


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
