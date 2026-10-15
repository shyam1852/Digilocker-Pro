import crypto from 'crypto';

// Server-isolated manifest signing secret (kept separate from client-side keys)
const SIGNING_SECRET = process.env.PHOENIX_SIGNING_SECRET || 'phoenix-vault-signing-authority-2026-isolated-secret-v1';
const SIGNING_KEY_REF = 'phoenix-auth-authority-v1';

/**
 * Deterministic JSON canonicalization (RFC 8785 style recursive key sorting)
 */
export function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalizeJson(item)).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Compute SHA-256 hex digest of a string or buffer
 */
export function computeSha256(data) {
  const hash = crypto.createHash('sha256');
  if (typeof data === 'string') {
    hash.update(data, 'utf8');
  } else {
    hash.update(data);
  }
  return hash.digest('hex');
}

/**
 * Sign canonical manifest payload using HMAC-SHA256
 */
export function signManifestPayload(canonicalString) {
  const hmac = crypto.createHmac('sha256', SIGNING_SECRET);
  hmac.update(canonicalString, 'utf8');
  return hmac.digest('hex');
}

/**
 * Verify HMAC-SHA256 signature of canonical manifest payload
 */
export function verifyManifestSignature(canonicalString, signature) {
  if (!canonicalString || !signature) return false;
  try {
    const expected = signManifestPayload(canonicalString);
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Create a complete, authenticated integrity manifest for a document version
 */
export function createIntegrityManifest({
  documentId,
  versionNumber,
  fileName,
  fileSizeBytes,
  fileType,
  contentDigest,
  encryptionAlgorithm = 'AES-256-GCM',
  timestamp = new Date().toISOString()
}) {
  const manifestPayload = {
    algorithm: 'SHA-256',
    contentDigest,
    documentId,
    encryptionAlgorithm,
    fileName,
    fileSizeBytes: Number(fileSizeBytes),
    fileType,
    recoveryEligible: true,
    timestamp,
    versionNumber: Number(versionNumber)
  };

  const canonicalPayload = canonicalizeJson(manifestPayload);
  const signature = signManifestPayload(canonicalPayload);

  return {
    id: `mnf_${crypto.randomBytes(8).toString('hex')}`,
    algorithm: 'SHA-256',
    manifestPayload: canonicalPayload,
    authenticationMethod: 'HMAC-SHA256',
    signatureOrMac: signature,
    keyReference: SIGNING_KEY_REF,
    createdAt: timestamp,
    parsedPayload: manifestPayload
  };
}

/**
 * Verify an existing stored manifest and document blob
 */
export function verifyDocumentIntegrity(storedBlob, manifestRecord) {
  const checkTimestamp = new Date().toISOString();

  if (!manifestRecord) {
    return {
      status: 'VERIFICATION_FAILED',
      reason: 'Missing integrity manifest record.',
      checks: {
        manifestPresent: false,
        signatureValid: false,
        contentDigestMatch: false
      },
      verifiedAt: checkTimestamp
    };
  }

  const payload = manifestRecord.manifest_payload || manifestRecord.manifestPayload;
  const signature = manifestRecord.signature_or_mac || manifestRecord.signatureOrMac;

  // 1. Verify Manifest Signature / MAC
  const isSignatureValid = verifyManifestSignature(payload, signature);

  if (!isSignatureValid) {
    return {
      status: 'TAMPERING_DETECTED',
      reason: 'Manifest signature validation failed. Unauthorized modification to integrity metadata detected.',
      checks: {
        manifestPresent: true,
        signatureValid: false,
        contentDigestMatch: false
      },
      verifiedAt: checkTimestamp
    };
  }

  let parsedPayload;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return {
      status: 'VERIFICATION_FAILED',
      reason: 'Manifest payload corrupted or unparseable.',
      checks: {
        manifestPresent: true,
        signatureValid: false,
        contentDigestMatch: false
      },
      verifiedAt: checkTimestamp
    };
  }

  // 2. Compute digest of stored ciphertext blob
  const computedBlobDigest = computeSha256(storedBlob || '');
  const expectedDigest = parsedPayload.contentDigest;

  const isDigestMatch = computedBlobDigest.toLowerCase() === (expectedDigest || '').toLowerCase();

  if (!isDigestMatch) {
    return {
      status: 'TAMPERING_DETECTED',
      reason: `Content digest mismatch. Expected baseline: ${expectedDigest.substring(0, 16)}..., Computed: ${computedBlobDigest.substring(0, 16)}...`,
      checks: {
        manifestPresent: true,
        signatureValid: true,
        contentDigestMatch: false
      },
      computedDigest: computedBlobDigest,
      expectedDigest,
      verifiedAt: checkTimestamp
    };
  }

  return {
    status: 'VERIFIED',
    reason: 'Cryptographic integrity verified. Content and manifest signature match authenticated baseline.',
    checks: {
      manifestPresent: true,
      signatureValid: true,
      contentDigestMatch: true
    },
    computedDigest: computedBlobDigest,
    expectedDigest,
    verifiedAt: checkTimestamp
  };
}
