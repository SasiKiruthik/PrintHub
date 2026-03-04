P2P Secure Printing Demo
=========================

Overview
--------
This demo implements a fully peer-to-peer encrypted printing flow using only:
- HTML + CSS + Vanilla JavaScript
- Web Crypto API
- WebRTC DataChannel for P2P transport

No backend, no storage, no plaintext leakage. Files are encrypted client-side,
keys are derived via ECDH, and decryption happens only in the Shop browser memory.

Files
-----
- `index.html` — User page (create offer, encrypt & send file)
- `shop.html` — Shop page (set offer, receive ciphertext, decrypt in memory, print)
- `crypto.js` — Shared helper functions (ECDH, AES-GCM, AES-KW wrapping, hashing)

Quick start
-----------
1. Open `p2p/index.html` in the User browser and `p2p/shop.html` in the Shop browser (local files in modern browsers work; for some browsers you may need a simple static server).
2. On the User page click **Create offer**, copy the Local SDP (base64) and give to Shop.
3. On the Shop page paste the Offer SDP into the textarea and click **Set Offer**, then copy the generated Local SDP back to the User.
4. On the User page paste the Answer SDP into the Remote SDP textarea and click **Set remote SDP**.
5. After the DataChannel opens, the Shop and User exchange ECDH public keys over the secured DataChannel.
6. On the User page choose a file and click **Encrypt & send file to shop**.
7. The Shop will decrypt in-memory, verify SHA-256, and open a sandboxed print dialog. The decrypted bytes are not saved to disk.

Security notes
--------------
- No keys, plaintext, or ciphertext are persisted to disk, localStorage, or IndexedDB.
- The only transfer is between the two browsers over the WebRTC DataChannel (DTLS-protected).
- After printing the shop page zeroes ArrayBuffers, destroys keys, and closes the connection.

Limitations
-----------
- This demo uses base64 encoding for ciphertext in a single message for simplicity; for large files, implement chunked binary transfer on the DataChannel.
- Browsers differ in sandbox/print behavior — the demo uses a sandboxed iframe to avoid direct downloads.

If you want, I can:
- Add chunked transfer support for large files.
- Provide a minimal static server command to serve the `p2p/` folder for local testing.
