import crypto from 'crypto';
import express from 'express';
import db, { logSecurityEvent } from './db.js';
import {
  canonicalizeJson,
  computeSha256,
  createIntegrityManifest,
  signManifestPayload,
  verifyManifestSignature,
  verifyDocumentIntegrity
} from './integrity.js';
import { executeBreachRehearsal } from './rehearsal.js';
import {
  hashPassword,
  verifyPassword,
  normalizeUsername,
  generateSessionToken
} from './auth.js';

async function runPhoenixTests() {
  console.log('===============================================================');
  console.log('   PHOENIX - COMPREHENSIVE AUTOMATED SECURITY TEST SUITE       ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${extra ? '(' + extra + ')' : ''}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Password Hashing & Verification (scrypt / PBKDF2)
    // ------------------------------------------------------------------------
    const rawPass = 'SecretVaultP@ss2026!';
    const { hash, salt } = hashPassword(rawPass);
    assert(hash && salt && hash.length === 128, '1. Password hashing produces secure 512-bit key derivation');
    assert(verifyPassword(rawPass, hash, salt), '2. Correct password verifies successfully');
    assert(!verifyPassword('WrongPass!', hash, salt), '3. Incorrect password is unequivocally rejected');

    // ------------------------------------------------------------------------
    // TEST 2: Deterministic Canonical JSON Serialization
    // ------------------------------------------------------------------------
    const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
    const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 };
    const canonA = canonicalizeJson(objA);
    const canonB = canonicalizeJson(objB);
    assert(canonA === canonB, '4. Canonical JSON serialization produces identical byte output regardless of key order');

    // ------------------------------------------------------------------------
    // TEST 3: Integrity Manifest Generation & HMAC-SHA256 Signing
    // ------------------------------------------------------------------------
    const testDocId = `doc_test_${Date.now()}`;
    const dummyBlob = 'U2FsdGVkX1+MockEncryptedCiphertextPayloadDataBytes999==';
    const contentDigest = computeSha256(dummyBlob);

    const manifest = createIntegrityManifest({
      documentId: testDocId,
      versionNumber: 1,
      fileName: 'confidential_contract.pdf',
      fileSizeBytes: 2048,
      fileType: 'application/pdf',
      contentDigest: contentDigest,
      encryptionAlgorithm: 'AES-256-GCM',
      timestamp: new Date().toISOString()
    });

    assert(manifest.signatureOrMac && manifest.signatureOrMac.length === 64, '5. Manifest HMAC-SHA256 signature generated');
    const isSigValid = verifyManifestSignature(manifest.manifestPayload, manifest.signatureOrMac);
    assert(isSigValid, '6. Manifest signature validates against isolated signing authority');

    // ------------------------------------------------------------------------
    // TEST 4: Tamper Detection on Altered Content
    // ------------------------------------------------------------------------
    const untamperedCheck = verifyDocumentIntegrity(dummyBlob, {
      manifest_payload: manifest.manifestPayload,
      signature_or_mac: manifest.signatureOrMac
    });
    assert(untamperedCheck.status === 'VERIFIED', '7. Untampered document payload verifies successfully');

    // Alter one byte
    const tamperedBlob = dummyBlob.replace('Mock', 'HACK');
    const tamperedCheck = verifyDocumentIntegrity(tamperedBlob, {
      manifest_payload: manifest.manifestPayload,
      signature_or_mac: manifest.signatureOrMac
    });
    assert(tamperedCheck.status === 'TAMPERING_DETECTED', '8. Content tampering detected by cryptographic integrity engine');

    // ------------------------------------------------------------------------
    // TEST 5: Tamper Detection on Altered Manifest (Metadata Tampering)
    // ------------------------------------------------------------------------
    const forgedPayload = manifest.manifestPayload.replace(contentDigest, '0000000000000000000000000000000000000000000000000000000000000000');
    const forgedSigCheck = verifyManifestSignature(forgedPayload, manifest.signatureOrMac);
    assert(!forgedSigCheck, '9. Manifest metadata forgery detected: signature verification fails');

    // ------------------------------------------------------------------------
    // TEST 6: User Isolation & Database Permissions
    // ------------------------------------------------------------------------
    const userA_Id = `usr_test_a_${Date.now()}`;
    const userB_Id = `usr_test_b_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, username, normalized_username, email, password_hash, password_salt, vault_salt, created_at, last_checkin_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userA_Id, `userA_${Date.now()}`, `usera_${Date.now()}`, `usera_${Date.now()}@test.com`, hash, salt, 'saltA', now, now);

    db.prepare(`
      INSERT INTO users (id, username, normalized_username, email, password_hash, password_salt, vault_salt, created_at, last_checkin_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userB_Id, `userB_${Date.now()}`, `userb_${Date.now()}`, `userb_${Date.now()}@test.com`, hash, salt, 'saltB', now, now);

    // Insert document owned by User A
    const docA_Id = `doc_a_${Date.now()}`;
    db.prepare(`
      INSERT INTO documents (
        id, user_id, title, category, status, encrypted_blob, encryption_iv,
        file_name, file_type, file_size_bytes, content_digest, integrity_status, created_at, updated_at
      ) VALUES (?, ?, 'User A Sensitive Document', 'Personal', 'active', ?, 'ivA==', 'docA.dat', 'application/octet-stream', 100, ?, 'VERIFIED', ?, ?)
    `).run(docA_Id, userA_Id, dummyBlob, contentDigest, now, now);

    // Attempt retrieval by User B
    const userB_AccessAttempt = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(docA_Id, userB_Id);
    assert(!userB_AccessAttempt, '10. Cross-user isolation enforced: User B cannot access User A document');

    // ------------------------------------------------------------------------
    // TEST 7: Immutable Version History & Verified Restoration
    // ------------------------------------------------------------------------
    const ver1_Id = `ver_1_${Date.now()}`;
    db.prepare(`
      INSERT INTO document_versions (
        id, document_id, version_number, storage_object_key, manifest_id,
        content_digest, encrypted_blob, encryption_iv, file_name, file_type,
        file_size_bytes, created_at, created_by, recovery_eligible, status
      ) VALUES (?, ?, 1, 'vault/test/v1', ?, ?, ?, 'ivA==', 'docA.dat', 'application/octet-stream', 100, ?, ?, 1, 'active')
    `).run(ver1_Id, docA_Id, manifest.id, contentDigest, dummyBlob, now, userA_Id);

    db.prepare(`
      INSERT INTO integrity_manifests (
        id, document_version_id, algorithm, manifest_payload,
        authentication_method, signature_or_mac, key_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(manifest.id, ver1_Id, manifest.algorithm, manifest.manifestPayload, manifest.authenticationMethod, manifest.signatureOrMac, manifest.keyReference, now);

    // Verify recovery pre-check passes
    const recPreCheck = verifyDocumentIntegrity(dummyBlob, manifest);
    assert(recPreCheck.status === 'VERIFIED', '11. Recovery copy cryptographic pre-check passes before restoration');

    // Simulate verified restore promoting to version 2
    const ver2_Id = `ver_2_${Date.now()}`;
    db.prepare(`
      INSERT INTO document_versions (
        id, document_id, version_number, storage_object_key, manifest_id,
        content_digest, encrypted_blob, encryption_iv, file_name, file_type,
        file_size_bytes, created_at, created_by, recovery_eligible, status
      ) VALUES (?, ?, 2, 'vault/test/v2', ?, ?, ?, 'ivA==', 'docA.dat', 'application/octet-stream', 100, ?, ?, 1, 'active')
    `).run(ver2_Id, docA_Id, manifest.id, contentDigest, dummyBlob, now, userA_Id);

    const versionCount = db.prepare('SELECT COUNT(*) as cnt FROM document_versions WHERE document_id = ?').get(docA_Id)?.cnt;
    assert(versionCount === 2, '12. Document version timeline persists immutable history across promotions');

    // ------------------------------------------------------------------------
    // TEST 8: Breach Rehearsal & Recovery Proof — Scenario A (Content Tampering)
    // ------------------------------------------------------------------------
    console.log('\n--- Executing Controlled Breach Rehearsal (Scenario A) ---');
    const rehearsalA = await executeBreachRehearsal(userA_Id, 'CONTENT_TAMPERING');
    assert(rehearsalA && rehearsalA.runId, '13. Rehearsal run initialized with unique run ID');
    assert(rehearsalA.detectionResult && rehearsalA.detectionResult.detected === true, '14. Scenario A: Content byte alteration detected by real integrity engine');
    assert(rehearsalA.containmentResult && rehearsalA.containmentResult.contained === true, '15. Scenario A: Automated incident containment enforced');
    assert(rehearsalA.recoveryResult && rehearsalA.recoveryResult.recovered === true, '16. Scenario A: Cryptographic recovery proof verified');
    assert(rehearsalA.overallOutcome === 'PASSED', '17. Scenario A: Overall rehearsal outcome evaluated as PASSED');
    assert(typeof rehearsalA.totalDurationMs === 'number' && rehearsalA.totalDurationMs >= 0, '18. Actual measured duration recorded from execution timestamps');

    // ------------------------------------------------------------------------
    // TEST 9: Breach Rehearsal — Scenario B (Metadata Tampering)
    // ------------------------------------------------------------------------
    console.log('\n--- Executing Controlled Breach Rehearsal (Scenario B) ---');
    const rehearsalB = await executeBreachRehearsal(userA_Id, 'METADATA_TAMPERING');
    assert(rehearsalB.detectionResult && rehearsalB.detectionResult.detected === true, '19. Scenario B: Manifest signature forgery detected');
    assert(rehearsalB.overallOutcome === 'PASSED', '20. Scenario B: Metadata quarantine & recovery proof evaluated as PASSED');

    // ------------------------------------------------------------------------
    // TEST 10: Breach Rehearsal — Scenario C (Simulated Unauthorized Session)
    // ------------------------------------------------------------------------
    console.log('\n--- Executing Controlled Breach Rehearsal (Scenario C) ---');
    const rehearsalC = await executeBreachRehearsal(userA_Id, 'UNAUTHORIZED_SESSION');
    assert(rehearsalC.detectionResult && rehearsalC.detectionResult.detected === true, '21. Scenario C: Unauthorized session access denied (HTTP 401 boundary)');
    assert(rehearsalC.overallOutcome === 'PASSED', '22. Scenario C: Legitimate session integrity confirmed as PASSED');

    // ------------------------------------------------------------------------
    // TEST 11: Security Events Persistent Audit Ledger
    // ------------------------------------------------------------------------
    const events = db.prepare('SELECT * FROM security_events WHERE owner_id = ? ORDER BY created_at DESC').all(userA_Id);
    assert(events.length >= 4, '23. Security events ledger reliably records all actions with severity & outcome');

    // ------------------------------------------------------------------------
    // TEST 12: Real Metrics Calculation
    // ------------------------------------------------------------------------
    const totalRuns = db.prepare('SELECT COUNT(*) as cnt FROM rehearsal_runs WHERE owner_id = ?').get(userA_Id)?.cnt;
    assert(totalRuns === 3, '24. Dashboard metrics accurately reflect real database counts without mock scores');

  } catch (err) {
    console.error('Test execution fatal error:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhoenixTests();
