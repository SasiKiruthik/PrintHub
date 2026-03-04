/*
 Shared crypto utilities for P2P printing demo

 Security notes:
 - All crypto uses the Web Crypto API. No secrets are persisted.
 - ECDH (P-256) is used to derive a shared key. That shared key is turned
   into an AES-KW wrapping key used to wrap/unwrap the file AES-GCM key.
 - File encryption uses AES-256-GCM with a 12-byte IV and 128-bit auth tag.
 - Hashing uses SHA-256 and produces a hex fingerprint the uploader computes
   before encryption and the printer verifies after decryption.

 Limitations & recommendations:
 - This demo encodes ciphertext as base64 for simplicity; for large files
   use chunked binary DataChannel transfers to avoid memory blowup.
 - Never export or store private keys. This code keeps keys in memory only.
 - After use, callers should zero ArrayBuffers and close the RTCPeerConnection.
*/

// Utilities
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export async function sha256Hex(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ECDH key pair (P-256)
export async function generateEcdhKeyPair() {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
}

export async function exportPublicKeyBase64(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(raw);
}

export async function importPublicKeyBase64(b64) {
  const raw = base64ToArrayBuffer(b64);
  return crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

// Derive an AES-KW wrapping key from our private ECDH key and their public key
export async function deriveAesKwFromEcdh(privateKey, theirPublicKey) {
  // Derive a raw 256-bit key using ECDH then import as AES-KW
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    privateKey,
    { name: 'AES-KW', length: 256 },
    true,
    ['wrapKey', 'unwrapKey']
  );
  return derivedKey;
}

// File AES-GCM key
export async function generateFileKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
}

export async function encryptArrayBuffer(plainBuf, fileKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, fileKey, plainBuf);
  // Cipher already contains auth tag appended (Subtle returns ciphertext||tag)
  return { iv: iv.buffer, cipher }; // both ArrayBuffer
}

export async function decryptArrayBuffer(cipherBuf, ivBuf, fileKey) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(ivBuf) }, fileKey, cipherBuf);
}

// Wrap/unwrap fileKey using AES-KW wrapping key
export async function wrapFileKey(fileKey, wrappingKey) {
  const wrapped = await crypto.subtle.wrapKey('raw', fileKey, wrappingKey, { name: 'AES-KW' });
  return wrapped; // ArrayBuffer
}

export async function unwrapFileKey(wrappedBuf, wrappingKey) {
  return crypto.subtle.unwrapKey('raw', wrappedBuf, wrappingKey, { name: 'AES-KW' }, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}

// Export raw key bytes (for debug only; avoid persisting)
export async function exportRawKey(key) {
  return crypto.subtle.exportKey('raw', key);
}

// Zero an ArrayBuffer (best-effort). Callers should release references afterwards.
export function zeroArrayBuffer(buf) {
  try {
    const arr = new Uint8Array(buf);
    arr.fill(0);
  } catch (e) {
    // ignore
  }
}
