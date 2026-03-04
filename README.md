# Secure PrintHub – Privacy-Preserving Cloud Printing

A client–server cloud printing system where documents are **encrypted in the browser** and the server
stores **only ciphertext + metadata**. Print shops can print documents without previewing or
downloading them.

## Architecture

- **Client-side encryption**: Files encrypted with AES-256-GCM in browser before upload
- **Zero-trust server**: Server never sees plaintext or AES keys
- **Encrypted storage**: Only ciphertext and metadata (name, size, pages, print type, hash) stored
- **Integrity verification**: SHA-256 hash comparison ensures printed document matches original
- **Crypto-shredding**: Plaintext destroyed from memory immediately after printing

## How It Works

### User Flow (Student)
1. Student selects file → browser computes SHA-256 fingerprint of original plaintext  
2. Browser generates AES-256 key and encrypts file with AES-256-GCM  
3. Browser uploads **only ciphertext + metadata + hash** to backend  
4. Backend stores encrypted file on disk + job metadata in MongoDB  
5. Student receives:
   - 6‑digit **print token**  
   - AES key (base64) – shown once  
6. Student shares token + key with shop (or via QR)

### Shop Flow
1. Shop opens dashboard and enters **token + AES key**  
2. Backend validates token, returns **metadata only** (name, size, pages, type)  
3. Shop clicks **Print**:
   - Backend streams encrypted file to shop browser  
   - Browser decrypts in memory using AES key  
   - Browser recomputes SHA‑256 hash on decrypted bytes  
   - Hash is compared with stored fingerprint  
   - If hashes match → browser sends bytes directly to OS print dialog  
4. Encrypted file and job record are deleted shortly after printing

## Security Guarantees

- ✅ **No plaintext on server** – only encrypted blobs and metadata  
- ✅ **Keys never stored** – AES key lives only in student + shop browsers  
- ✅ **No preview/download** – shop sees metadata only, app never shows file contents  
- ✅ **Integrity proof** – SHA‑256 ensures printed output equals original upload  
- ✅ **Crypto-shredding** – plaintext buffer zeroed after printing

## Running the Project

### Backend

```bash
cd backend
npm install
npm run dev
```

Server runs at `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Technology Stack

- **Frontend**: React + Vite + Tailwind CSS  
- **Backend**: Node.js + Express  
- **Database**: MongoDB  
- **Crypto**: Web Crypto API (AES‑256‑GCM, SHA‑256)  

