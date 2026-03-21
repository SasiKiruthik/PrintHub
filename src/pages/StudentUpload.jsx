import { useState, useRef, useCallback } from "react";
import {
  generatePasscode,
  isPasscodeValid,
  getTimeRemaining,
  deriveKeyFromPasscode,
  encryptFile,
  sha256
} from "../utils/crypto";

export default function StudentUpload() {
  const [file, setFile] = useState(null);
  const [passcode, setPasscode] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState(""); // success, error, info, loading
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  // File type icons
  const getFileIcon = (name) => {
    if (!name) return '📄';
    const ext = name.split('.').pop().toLowerCase();
    const icons = { pdf: '📕', txt: '📝', doc: '📘', docx: '📘', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', csv: '📊', html: '🌐' };
    return icons[ext] || '📄';
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Handle file selection
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setJobId("");
    setPasscode(null);
    setStatus("");

    try {
      const buffer = await f.arrayBuffer();
      const h = await sha256(buffer);
      setFileHash(h);
    } catch {
      setFileHash("");
    }
  }, []);

  const handleFileChange = (e) => {
    handleFile(e.target.files[0]);
  };

  // Drag and drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => { setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // Start countdown timer
  const startTimer = (pc) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const rem = getTimeRemaining(pc);
      setTimeRemaining(rem);
      if (rem === 0) {
        clearInterval(timerRef.current);
        setPasscode(null);
        updateStatus("⏰ Passcode expired. Upload again to get a new one.", "error");
      }
    }, 1000);
  };

  const updateStatus = (msg, type = "info") => {
    setStatus(msg);
    setStatusType(type);
  };

  // MAIN ACTION: Encrypt & Upload
  const handleEncryptAndUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);
      updateStatus("Generating passcode...", "loading");

      // Generate passcode
      const newPasscode = generatePasscode();
      setPasscode(newPasscode);
      startTimer(newPasscode);
      setUploadProgress(20);

      updateStatus("Encrypting your file...", "loading");

      // Read file
      const buffer = await file.arrayBuffer();
      const hash = await sha256(buffer);
      setUploadProgress(40);

      // Derive key from passcode
      const key = await deriveKeyFromPasscode(newPasscode.code);
      setUploadProgress(50);

      // Encrypt
      const { encrypted, iv } = await encryptFile(buffer, key);
      setUploadProgress(70);

      updateStatus("Uploading encrypted file...", "loading");

      // Prepare payload
      const payload = {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        fileName: file.name,
        fileSize: file.size,
        hash
      };

      // Determine the API URL
      // In Electron: shop serves from localhost:3000
      // In browser: could be the same origin or different
      const apiBase = window.location.port === '5173'
        ? 'http://localhost:3000'  // Dev mode: Vite on 5173, Express on 3000
        : '';                       // Production: same origin

      // Upload to Express server
      const response = await fetch(`${apiBase}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setUploadProgress(90);

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }

      const result = await response.json();
      setJobId(result.jobId);
      setUploadProgress(100);
      updateStatus("File encrypted and uploaded! Share the passcode with the shop.", "success");

    } catch (err) {
      console.error("Upload failed:", err);
      updateStatus(`Upload failed: ${err.message}`, "error");
      setPasscode(null);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) 0' }}>

      <div className="animate-fadeInUp" style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800,
          letterSpacing: '-0.02em', marginBottom: '0.5rem'
        }}>
          <span className="gradient-text">Secure Upload</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Your file is encrypted in your browser before uploading. The shop can only print it — never view it.
        </p>
      </div>

      {/* STEP 1: FILE SELECTION */}
      <div className="glass-card animate-fadeInUp delay-1" style={{ marginBottom: '1.25rem' }}>
        <div className="section-step">
          <div className="step-number emerald">1</div>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Select File</h3>
        </div>

        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".pdf,.txt,.jpg,.jpeg,.png,.gif,.doc,.docx,.html,.csv"
          />
          {file ? (
            <div className="animate-scaleIn">
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>
                {getFileIcon(file.name)}
              </span>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--emerald)', marginBottom: '0.375rem' }}>
                {file.name}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {formatSize(file.size)} • Click to change
              </div>
            </div>
          ) : (
            <div>
              <span className="icon">📂</span>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                Drop file here or click to browse
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                PDF, TXT, JPG, PNG, DOC, HTML
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: ENCRYPT & SEND */}
      <div className="glass-card animate-fadeInUp delay-2" style={{ marginBottom: '1.25rem' }}>
        <div className="section-step">
          <div className="step-number blue">2</div>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Encrypt & Send</h3>
        </div>

        <button
          className="btn btn-emerald btn-lg btn-full"
          onClick={handleEncryptAndUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <span className="spinner" />
              Encrypting & Uploading...
            </>
          ) : (
            <>🔒 Encrypt & Upload</>
          )}
        </button>

        {/* Progress bar */}
        {isUploading && (
          <div style={{
            marginTop: '1rem', height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.05)', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: 'var(--gradient-emerald)',
              width: `${uploadProgress}%`,
              transition: 'width 0.4s ease'
            }} />
          </div>
        )}

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
          🔐 AES-256-GCM encryption happens in your browser.
          Only encrypted bytes are sent to the shop.
        </p>
      </div>

      {/* RESULT: PASSCODE */}
      {passcode && jobId && (
        <div className="glass-card animate-scaleIn" style={{
          marginBottom: '1.25rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'rgba(16, 185, 129, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--emerald)' }}>
              ✅ Upload Complete
            </h3>
            <span className="badge badge-emerald">
              ⏱️ {formatTime(timeRemaining)}
            </span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Tell the shop owner this passcode:
          </p>

          <div className="passcode-display" style={{ color: 'var(--emerald-bright)' }}>
            {passcode.code}
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={async () => {
              try {
                await navigator.clipboard.writeText(passcode.code);
                updateStatus("Passcode copied!", "success");
              } catch { updateStatus("Copy failed", "error"); }
            }}>
              📋 Copy Passcode
            </button>
          </div>

          <div style={{
            marginTop: '1rem', padding: '12px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(0,0,0,0.2)', fontSize: '0.75rem', color: 'var(--text-muted)'
          }}>
            <div>📄 <strong style={{ color: 'var(--text-secondary)' }}>{file?.name}</strong></div>
            <div style={{ marginTop: '4px' }}>🆔 Job ID: <span style={{ fontFamily: 'monospace', color: 'var(--blue)' }}>{jobId}</span></div>
            <div style={{ marginTop: '4px' }}>
              🔑 SHA-256: <span style={{ fontFamily: 'monospace', color: 'var(--emerald)' }}>{fileHash.substring(0, 16)}...</span>
            </div>
          </div>
        </div>
      )}

      {/* STATUS */}
      {status && (
        <div className="animate-fadeIn" style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem',
          fontWeight: 500,
          background: statusType === 'success' ? 'var(--emerald-glow)' :
                     statusType === 'error' ? 'var(--red-glow)' :
                     statusType === 'loading' ? 'var(--blue-glow)' :
                     'var(--bg-glass)',
          color: statusType === 'success' ? 'var(--emerald-bright)' :
                 statusType === 'error' ? 'var(--red)' :
                 statusType === 'loading' ? 'var(--blue-bright)' :
                 'var(--text-secondary)',
          border: `1px solid ${
            statusType === 'success' ? 'rgba(16,185,129,0.2)' :
            statusType === 'error' ? 'rgba(239,68,68,0.2)' :
            statusType === 'loading' ? 'rgba(59,130,246,0.2)' :
            'var(--border-subtle)'
          }`,
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {statusType === 'loading' && <span className="spinner" />}
          {status}
        </div>
      )}
    </div>
  );
}
