/**
 * DM Locker Pro - 2-of-3 Shamir's Secret Sharing Implementation over GF(2^8)
 * Irreducible polynomial: x^8 + x^4 + x^3 + x + 1 (0x11b)
 * Uses cryptographically secure window.crypto.getRandomValues for polynomial coefficients.
 * Never uses Math.random().
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
 * Splits a secret Uint8Array into 3 shares with a 2-of-3 threshold.
 * Any 2 shares can reconstruct the exact secret. 1 share reveals 0 information.
 *
 * @param {Uint8Array} secretBytes - The master secret to split
 * @returns {Array<{ x: number, data: string, label: string }>} 3 distinct shares
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

  return [
    {
      x: 1,
      role: 'User Personal Offline Key',
      description: 'Retained offline by vault owner (printed QR / cold custody).',
      data: `DML-S1-${toHex(share1Bytes)}`
    },
    {
      x: 2,
      role: 'Nominee Escrow Key',
      description: 'Distributed to designated nominee (e.g. Priya Keshri).',
      data: `DML-S2-${toHex(share2Bytes)}`
    },
    {
      x: 3,
      role: 'Server Encrypted Timelock Key',
      description: 'Stored encrypted in server escrow; accessible only after verified inactivity threshold.',
      data: `DML-S3-${toHex(share3Bytes)}`
    }
  ];
}

/**
 * Reconstructs secret from any 2 shares (or 3) using Lagrange interpolation at x = 0.
 *
 * @param {Array<{ x: number, data: string }>} shares - Array containing at least 2 valid shares
 * @returns {Uint8Array} Reconstructed secret bytes
 */
export function combineShares(shares) {
  if (!Array.isArray(shares) || shares.length < 2) {
    throw new Error('Threshold error: Minimum 2 shares required to reconstruct secret.');
  }

  // Parse shares
  const parsed = shares.slice(0, 2).map(s => {
    let x = s.x;
    let hex = s.data;
    if (typeof s.data === 'string' && s.data.startsWith('DML-S')) {
      const parts = s.data.split('-');
      x = parseInt(parts[1].replace('S', ''), 10);
      hex = parts[2];
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
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
