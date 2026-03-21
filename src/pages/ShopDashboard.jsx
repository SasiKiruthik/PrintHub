import { useState, useEffect, useRef } from "react";
import {
  deriveKeyFromPasscode,
  decryptFile,
  sha256
} from "../utils/crypto";
import { printDecryptedFile } from "../utils/printHandler";

// Check if running inside Electron
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

export default function ShopDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [isPrinting, setIsPrinting] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [isPolling, setIsPolling] = useState(false);

  const pollIntervalRef = useRef(null);

  // Determine API base URL
  const getApiBase = () => {
    if (window.location.port === '5173') return 'http://localhost:3000';
    return '';
  };

  // Get network info and printers
  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getNetworkInfo().then(setNetworkInfo);
      window.electronAPI.getPrinters().then((list) => {
        // SECURITY FEATURE: Block virtual printers (Print to PDF, XPS, OneNote, Fax)
        // This ensures the shop owner can ONLY print to physical paper, preventing them
        // from saving the customer's private document as a digital file.
        const physicalPrinters = list.filter(p => {
          const name = p.name.toLowerCase();
          return !name.includes('pdf') && 
                 !name.includes('xps') && 
                 !name.includes('onenote') && 
                 !name.includes('fax');
        });

        setPrinters(physicalPrinters);
        
        // Select default physical printer if available
        const defaultPrinter = physicalPrinters.find(p => p.isDefault) || physicalPrinters[0];
        if (defaultPrinter) setSelectedPrinter(defaultPrinter.name);
      });
    }
  }, []);

  // Poll for new jobs
  const startPolling = () => {
    setIsPolling(true);
    fetchJobs();
    pollIntervalRef.current = setInterval(fetchJobs, 3000);
  };

  const stopPolling = () => {
    setIsPolling(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // Server not running - expected during dev
    }
  };

  const updateStatus = (msg, type = "info") => {
    setStatus(msg);
    setStatusType(type);
  };

  // Format relative time
  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (name) => {
    if (!name) return '📄';
    const ext = name.split('.').pop().toLowerCase();
    const icons = { pdf: '📕', txt: '📝', doc: '📘', docx: '📘', jpg: '🖼️', jpeg: '🖼️', png: '🖼️' };
    return icons[ext] || '📄';
  };

  // DECRYPT & PRINT
  const handlePrint = async () => {
    if (!selectedJob || !passcodeInput.trim()) {
      updateStatus("Select a job and enter the passcode.", "error");
      return;
    }

    if (!/^\d{6}$/.test(passcodeInput.trim())) {
      updateStatus("Passcode must be exactly 6 digits.", "error");
      return;
    }

    try {
      setIsPrinting(true);
      updateStatus("Fetching encrypted file...", "loading");

      // Get the full encrypted data for this job
      const res = await fetch(`${getApiBase()}/api/jobs/${selectedJob.id}`);
      if (!res.ok) throw new Error("Job not found or expired");
      const jobData = await res.json();

      updateStatus("Decrypting file...", "loading");

      // Reconstruct binary data
      const encrypted = new Uint8Array(jobData.encrypted).buffer;
      const iv = new Uint8Array(jobData.iv);

      // Derive key from passcode
      const key = await deriveKeyFromPasscode(passcodeInput.trim());

      // Decrypt
      const decrypted = await decryptFile(encrypted, iv, key);

      // Verify integrity
      updateStatus("Verifying integrity...", "loading");
      const newHash = await sha256(decrypted);
      if (jobData.hash && newHash !== jobData.hash) {
        throw new Error("Integrity check failed — file may be corrupted");
      }

      // Print!
      updateStatus("Sending to printer...", "loading");

      if (!selectedPrinter) {
        throw new Error("SECURITY BLOCK: No physical hardware printer selected. Virtual 'Save to PDF' printers are disabled to ensure the document cannot be saved digitally.");
      }

      const result = await printDecryptedFile(decrypted, jobData.fileName, selectedPrinter);

      // Delete job from server after successful print
      try {
        await fetch(`${getApiBase()}/api/jobs/${selectedJob.id}`, { method: 'DELETE' });
      } catch {
        // Non-critical
      }

      // Clear state
      setSelectedJob(null);
      setPasscodeInput("");
      updateStatus(result.message || "Document printed successfully!", "success");
      fetchJobs(); // Refresh job list

    } catch (err) {
      console.error("Print failed:", err);
      updateStatus(`Failed: ${err.message}`, "error");
    } finally {
      setIsPrinting(false);
    }
  };

  // Delete a job manually
  const handleDeleteJob = async (jobId) => {
    try {
      await fetch(`${getApiBase()}/api/jobs/${jobId}`, { method: 'DELETE' });
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
        setPasscodeInput("");
      }
      fetchJobs();
      updateStatus("Job deleted from memory.", "success");
    } catch {
      updateStatus("Failed to delete job.", "error");
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) 0' }}>

      {/* Header */}
      <div className="animate-fadeInUp" style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800,
          letterSpacing: '-0.02em', marginBottom: '0.5rem'
        }}>
          <span style={{ color: 'var(--blue-bright)' }}>🏪</span>{' '}
          <span className="gradient-text">Shop Dashboard</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Receive encrypted files and print them securely
        </p>
      </div>

      {/* NETWORK INFO (Electron) */}
      {(isElectron && networkInfo) && (
        <div className="glass-card animate-fadeInUp delay-1" style={{
          marginBottom: '1.25rem',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          background: 'rgba(59, 130, 246, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📡</span>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--blue-bright)' }}>
              Student Connection URL
            </h3>
          </div>
          {networkInfo.ips.map((ip, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: i < networkInfo.ips.length - 1 ? '8px' : 0
            }}>
              <code style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', fontFamily: 'monospace',
                fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)'
              }}>
                https://{ip.address}:{networkInfo.port}
              </code>
              <button className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: '0.8125rem' }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`https://${ip.address}:${networkInfo.port}`);
                    updateStatus("URL copied!", "success");
                  } catch { }
                }}>📋</button>
            </div>
          ))}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Students open this secure URL in Chrome and click "Advanced → Proceed"
          </p>
        </div>
      )}

      {/* PRINTER SELECTION (Electron) */}
      {isElectron && printers.length > 0 && (
        <div className="glass-card animate-fadeInUp delay-2" style={{ marginBottom: '1.25rem' }}>
          <div className="section-step">
            <span style={{ fontSize: '1.25rem' }}>🖨️</span>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Printer</h3>
          </div>
          <select
            className="input"
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {printers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.displayName} {p.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* INCOMING JOBS */}
      <div className="glass-card animate-fadeInUp delay-2" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="section-step" style={{ marginBottom: 0 }}>
            <div className="step-number blue">1</div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Print Queue</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPolling && (
              <span className="badge badge-emerald" style={{ fontSize: '0.6875rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                Live
              </span>
            )}
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
              onClick={fetchJobs}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            color: 'var(--text-muted)', fontSize: '0.9375rem'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>📭</div>
            <p>No print jobs yet</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem' }}>
              Waiting for students to upload files...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`job-card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedJob(job);
                  setPasscodeInput("");
                }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: '1.5rem' }}>{getFileIcon(job.fileName)}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {job.fileName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {formatSize(job.fileSize)} • {timeAgo(job.timestamp)} • ID: {job.id}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STEP 2: PASSCODE & PRINT */}
      {selectedJob && (
        <div className="glass-card animate-scaleIn" style={{
          marginBottom: '1.25rem',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <div className="section-step">
            <div className="step-number emerald">2</div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Decrypt & Print</h3>
          </div>

          <div style={{
            padding: '12px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-input)', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '1.25rem' }}>{getFileIcon(selectedJob.fileName)}</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                {selectedJob.fileName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formatSize(selectedJob.fileSize)}
              </div>
            </div>
          </div>

          <label style={{
            display: 'block', fontSize: '0.875rem', fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: '0.5rem'
          }}>
            Enter Student's 6-Digit Passcode
          </label>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <input
              type="text"
              className="input input-passcode"
              placeholder="000000"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              autoFocus
            />
            <button className="btn btn-ghost" style={{ padding: '12px' }}
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setPasscodeInput(text.trim().replace(/\D/g, '').slice(0, 6));
                } catch { }
              }}>📋 Paste</button>
          </div>

          <button
            className="btn btn-emerald btn-lg btn-full"
            onClick={handlePrint}
            disabled={passcodeInput.length !== 6 || isPrinting}
          >
            {isPrinting ? (
              <>
                <span className="spinner" />
                {isElectron ? 'Printing silently...' : 'Printing...'}
              </>
            ) : (
              <>{isElectron ? '🔇 Silent Print' : '🖨️ Print'}</>
            )}
          </button>

          <div style={{
            marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
            fontSize: '0.75rem', color: 'var(--text-muted)'
          }}>
            <span>✅ AES-256-GCM decryption</span>
            <span>•</span>
            <span>✅ SHA-256 verification</span>
            <span>•</span>
            <span>✅ {isElectron ? 'Silent print (no preview)' : 'Browser print dialog'}</span>
            <span>•</span>
            <span>✅ Auto-delete after print</span>
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
