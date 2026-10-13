/**
 * DM Locker Pro - Client-Side Cryptographic Vault Engine
 * Implements AES-256-GCM authenticated encryption using the standard Web Crypto API.
 * Keys never leave client memory; plaintexts are never exposed to the server.
 */

// Helper: Convert Uint8Array/ArrayBuffer to Base64
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 string to Uint8Array
export function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper: Hex string to Uint8Array
export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Helper: Bytes to Hex
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives a 256-bit AES-GCM Vault Key using PBKDF2-HMAC-SHA256 (100,000 rounds)
 */
export async function deriveVaultKey(passphrase, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBytes = hexToBytes(saltHex || '00000000000000000000000000000000');

  const vaultKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // Key cannot be extracted
    ['encrypt', 'decrypt']
  );

  return vaultKey;
}

/**
 * Encrypts an ArrayBuffer or string with a fresh 12-byte random IV
 */
export async function encryptData(data, vaultKey) {
  let dataBuffer;
  if (typeof data === 'string') {
    dataBuffer = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    dataBuffer = data;
  } else if (data instanceof Uint8Array) {
    dataBuffer = data.buffer;
  } else {
    throw new Error('Unsupported data format for encryption');
  }

  // Fresh 12-byte (96-bit) IV as specified by NIST SP 800-38D
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    vaultKey,
    dataBuffer
  );

  return {
    ciphertextBase64: bufferToBase64(ciphertextBuffer),
    ivBase64: bufferToBase64(iv)
  };
}

/**
 * Decrypts AES-256-GCM ciphertext
 */
export async function decryptData(ciphertextBase64, ivBase64, vaultKey) {
  try {
    const ciphertextBytes = base64ToBuffer(ciphertextBase64);
    const ivBytes = base64ToBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
        tagLength: 128
      },
      vaultKey,
      ciphertextBytes
    );

    return decryptedBuffer;
  } catch (err) {
    throw new Error('Decryption failed. Invalid vault key or corrupted authentication tag.');
  }
}

/**
 * Encrypts both document buffer and sensitive metadata with independent, unique 96-bit nonces.
 * Strictly guarantees nonce uniqueness (never reuses an IV for document and metadata).
 */
export async function encryptDocumentPackage(fileBuffer, sensitiveMetadata, vaultKey) {
  // 1. Independent 12-byte IV for file payload
  const fileIv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileCipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: fileIv, tagLength: 128 },
    vaultKey,
    fileBuffer
  );

  // 2. Independent 12-byte IV for metadata payload
  const metaIv = window.crypto.getRandomValues(new Uint8Array(12));
  const metaPlainBytes = new TextEncoder().encode(JSON.stringify(sensitiveMetadata));
  const metaCipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: metaIv, tagLength: 128 },
    vaultKey,
    metaPlainBytes
  );

  return {
    encrypted_blob: bufferToBase64(fileCipherBuffer),
    encryption_iv: bufferToBase64(fileIv),
    encrypted_metadata: bufferToBase64(metaCipherBuffer),
    metadata_iv: bufferToBase64(metaIv)
  };
}

/**
 * Decrypts sensitive metadata payload
 */
export async function decryptMetadata(encryptedMetadataBase64, metadataIvBase64, vaultKey) {
  if (!encryptedMetadataBase64 || !metadataIvBase64) return null;
  try {
    const decryptedBuffer = await decryptData(encryptedMetadataBase64, metadataIvBase64, vaultKey);
    const jsonStr = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.warn('Metadata decryption skipped or tag mismatch:', err.message);
    return null;
  }
}

/**
 * Computes cryptographically secure SHA-256 hex digest
 */
export async function sha256Hex(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Helper to download decrypted buffer as a file
 */
export function downloadFile(buffer, fileName, mimeType = 'application/octet-stream') {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

