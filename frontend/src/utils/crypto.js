// AES-256-GCM helpers using Web Crypto

export async function generateAesKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = new Uint8Array(await window.crypto.subtle.exportKey('raw', key));
  const b64 = window.btoa(String.fromCharCode(...raw));
  return { key, raw, b64 };
}

export async function importAesKeyFromBase64(b64) {
  const bin = window.atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return window.crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptFile(file, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const buf = await file.arrayBuffer();
  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buf
  );
  const cipherBytes = new Uint8Array(cipherBuf);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);
  return new Blob([combined], { type: 'application/octet-stream' });
}

export async function decryptToBlob(base64Combined, key, mimeType) {
  const bin = window.atob(base64Combined);
  const combined = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) combined[i] = bin.charCodeAt(i);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new Blob([plainBuf], { type: mimeType || 'application/octet-stream' });
}


