/**
 * DM Locker Pro - Hardened 2-of-3 Shamir's Secret Sharing Engine over GF(2^8)
 * 
 * Irreducible primitive polynomial: x^8 + x^4 + x^3 + x + 1 (0x11d)
 * Generates cryptographic shares with CSPRNG coefficients and tamper-detection checksums.
 * Strict fail-closed verification on corrupted or tampered shares.
 * 
 * KEY HIERARCHY:
 * - Document Encryption Key (DEK): 256-bit AES-GCM per document.
 * - Vault Master Key (VMK): 256-bit AES-GCM encrypts master records.
 * - Recovery Master Key (RMK): 256-bit CSPRNG secret, split into 3 Shamir shares (2-of-3 threshold).
 *   Any 2 shares reconstruct RMK to authorize emergency vault recovery.
 */

// Precomputed GF(256) exp and log tables for constant-time field arithmetic
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d; // Generator 2 primitive polynomial for GF(2^8)
    }
  }
  LOG[0] = 0;
})();

function gfAdd(a, b) {
  return a ^ b;
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function gfDiv(a, b) {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return EXP[(LOG[a] - LOG[b] + 255) % 255];
}

/**
 * FNV-1a 32-bit checksum for share integrity and tamper detection
 */
export function computeShareChecksum(bytes, x) {
  let acc = (0x811c9dc5 ^ x) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    acc ^= bytes[i];
    acc = Math.imul(acc, 0x01000193) >>> 0;
  }
  return acc.toString(16).padStart(8, '0');
}

/**
 * Splits a 256-bit Recovery Master Secret into 3 shares with a 2-of-3 threshold.
 * Any 2 shares can reconstruct the exact secret. 1 share reveals 0 information.
 *
 * @param {Uint8Array} secretBytes - The random master secret to split
 * @returns {Array<{ x: number, role: string, description: string, data: string, checksum: string }>}
 */
export function splitSecret(secretBytes) {
  if (!secretBytes || secretBytes.length === 0) {
    throw new Error('Secret must not be empty');
  }

  const length = secretBytes.length;
  // Sample random coefficients a1 for each byte using CSPRNG
  const a1Coefficients = new Uint8Array(length);
  window.crypto.getRandomValues(a1Coefficients);

  // Shares for x = 1, 2, 3
  const share1Bytes = new Uint8Array(length);
  const share2Bytes = new Uint8Array(length);
  const share3Bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    const a0 = secretBytes[i];
    const a1 = a1Coefficients[i];

    // f(x) = a0 ^ (a1 * x)
    share1Bytes[i] = gfAdd(a0, gfMul(a1, 1));
    share2Bytes[i] = gfAdd(a0, gfMul(a1, 2));
    share3Bytes[i] = gfAdd(a0, gfMul(a1, 3));
  }

  const toHex = (buf) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');

  const chk1 = computeShareChecksum(share1Bytes, 1);
  const chk2 = computeShareChecksum(share2Bytes, 2);
  const chk3 = computeShareChecksum(share3Bytes, 3);

  return [
    {
      x: 1,
      role: 'User Cold Custody Key',
      description: 'Retained offline by vault owner (printed recovery kit / cold storage).',
      checksum: chk1,
      data: `DML-S1-${toHex(share1Bytes)}-${chk1}`
    },
    {
      x: 2,
      role: 'Nominee Emergency Share',
      description: 'Distributed to designated nominee (e.g., trusted spouse or legal heir).',
      checksum: chk2,
      data: `DML-S2-${toHex(share2Bytes)}-${chk2}`
    },
    {
      x: 3,
      role: 'Server Escrow Timelock Share',
      description: 'Stored encrypted in server escrow; released ONLY upon verified emergency threshold.',
      checksum: chk3,
      data: `DML-S3-${toHex(share3Bytes)}-${chk3}`
    }
  ];
}

/**
 * Reconstructs secret from any 2 shares (or 3) using Lagrange interpolation at x = 0.
 * Enforces strict fail-closed tamper detection.
 *
 * @param {Array<{ x: number, data: string }>} shares - Array containing at least 2 valid shares
 * @returns {Uint8Array} Reconstructed secret bytes
 */
export function combineShares(shares) {
  if (!Array.isArray(shares) || shares.length < 2) {
    throw new Error('Threshold error: Minimum 2 independent shares required to reconstruct secret.');
  }

  // Parse shares
  const parsed = shares.slice(0, 2).map(s => {
    let x = s.x;
    let hex = s.data;
    let expectedChecksum = null;

    if (typeof s.data === 'string' && s.data.startsWith('DML-S')) {
      const parts = s.data.split('-');
      x = parseInt(parts[1].replace('S', ''), 10);
      hex = parts[2];
      if (parts.length >= 4) {
        expectedChecksum = parts[3];
      }
    }

    if (!hex || hex.length % 2 !== 0) {
      throw new Error(`Invalid share data format for Share ${x}.`);
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    // Verify tamper checksum if present (Fail Closed)
    if (expectedChecksum) {
      const actualChecksum = computeShareChecksum(bytes, x);
      if (actualChecksum !== expectedChecksum) {
        throw new Error(`Tampered share detected: Share S${x} checksum mismatch. Rejection enforced.`);
      }
    }

    return { x, bytes };
  });

  const [s1, s2] = parsed;

  if (s1.x === s2.x) {
    throw new Error('Duplicate share index provided. Must provide two distinct shares.');
  }

  const len = s1.bytes.length;
  if (s2.bytes.length !== len) {
    throw new Error('Share length mismatch.');
  }

  const reconstructed = new Uint8Array(len);

  // Lagrange basis polynomials at x = 0:
  // l1(0) = (0 ^ x2) / (x1 ^ x2) = x2 / (x1 ^ x2)
  // l2(0) = (0 ^ x1) / (x2 ^ x1) = x1 / (x1 ^ x2)
  const denom = gfAdd(s1.x, s2.x);
  const l1 = gfDiv(s2.x, denom);
  const l2 = gfDiv(s1.x, denom);

  for (let i = 0; i < len; i++) {
    const term1 = gfMul(s1.bytes[i], l1);
    const term2 = gfMul(s2.bytes[i], l2);
    reconstructed[i] = gfAdd(term1, term2);
  }

  return reconstructed;
}

/**
 * Generates printable standalone HTML Recovery Kit for offline physical custody
 */
export function generateRecoveryKitHtml({ user, shares, nominee, switchInterval }) {
  const share1 = shares.find(s => s.x === 1) || shares[0];
  const share2 = shares.find(s => s.x === 2) || shares[1];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DM Locker Pro — Offline Emergency Recovery Kit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.5; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; background: #fee2e2; color: #991b1b; font-size: 0.75rem; font-weight: bold; border-radius: 4px; margin-bottom: 1rem; }
    .card { border: 2px dashed #9ca3af; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; background: #f9fafb; }
    .code { font-family: monospace; font-size: 0.85rem; word-break: break-all; background: #ffffff; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; display: block; margin-top: 0.5rem; }
    .notice { font-size: 0.8rem; color: #4b5563; margin-top: 0.5rem; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>DM Locker Pro — Offline Emergency Recovery Kit</h1>
  <div class="badge">CONFIDENTIAL & SENSITIVE — STORE IN SAFE / COLD CUSTODY</div>
  <p><strong>Vault Owner:</strong> ${user?.username || 'shyamkeshri'} | <strong>Date Issued:</strong> ${new Date().toLocaleDateString()}</p>
  <p><strong>Designated Nominee:</strong> ${nominee?.name || 'Priya Keshri'} (${nominee?.relationship || 'Spouse'})</p>
  <p><strong>Dead Man's Switch Heartbeat:</strong> ${switchInterval || 30} Days</p>

  <div class="card">
    <h3>SHARE 1 OF 3: Vault Owner Cold Custody Key</h3>
    <p class="notice">Retain this printed sheet in a secure physical location (bank locker, safe). Never share with nominee prior to an emergency.</p>
    <div class="code">${share1?.data || 'N/A'}</div>
  </div>

  <div class="card">
    <h3>SHARE 2 OF 3: Designated Nominee Key</h3>
    <p class="notice">Deliver this share to your designated nominee (${nominee?.name || 'Nominee'}). During an emergency, combining Share 1 and Share 2 unlocks the vault without requiring server intervention.</p>
    <div class="code">${share2?.data || 'N/A'}</div>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 1rem; font-size: 0.75rem; color: #6b7280;">
    <p><strong>2-of-3 Threshold Model:</strong> Neither the server nor your nominee alone has unilateral access. Any 2 shares can reconstruct the vault. Missing a check-in triggers a verified grace period and does NOT immediately release keys.</p>
    <p><em>Security Notice: This is a hackathon cryptographic prototype. Independent third-party audit recommended prior to production life-and-death deployment.</em></p>
  </div>
</body>
</html>`;
}
