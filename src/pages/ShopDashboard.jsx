import React, { useState, useRef, useEffect } from "react";
import QrScanner from "qr-scanner";
import {
  generatePasscode,
  isPasscodeValid,
  getTimeRemaining,
  deriveKeyFromPasscode,
  decryptFile,
  sha256
} from "../utils/crypto";
import { acceptConnection, waitForIceGathering, getConnectionStatus, getDataChannelStatus } from "../utils/p2p";

export default function ShopDashboard() {
  const [studentPasscodeInput, setStudentPasscodeInput] = useState("");
  const [shopPasscode, setShopPasscode] = useState(null); // {code, timestamp}
  const [studentPasscodeVerified, setStudentPasscodeVerified] = useState(false);
  const [status, setStatus] = useState("");
  const [dataChannelStatus, setDataChannelStatus] = useState("No connection");
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [receivedPayload, setReceivedPayload] = useState(null);
  const [expectedHash, setExpectedHash] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [offerSDP, setOfferSDP] = useState("");
  const [answerSDP, setAnswerSDP] = useState("");
  const [showAnswerStep, setShowAnswerStep] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [diagnostics, setDiagnostics] = useState("");

  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const fileInputRef = useRef(null);
  const [qrError, setQrError] = useState("");
  const messageBufferRef = useRef(""); // Buffer for reassembling chunked messages

  // Countdown timer for passcodes
  useEffect(() => {
    if (!studentPasscodeVerified && !shopPasscode) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      let remaining = 0;
      if (shopPasscode) {
        remaining = getTimeRemaining(shopPasscode);
        setTimeRemaining(remaining);
        if (remaining === 0) {
          setShopPasscode(null);
          setStatus("⏰ Shop passcode expired. Generate a new one to reconnect.");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shopPasscode, studentPasscodeVerified]);

  // STEP 1: Validate Student's Passcode and create peer
  const handleValidateStudentPasscode = async () => {
    if (!studentPasscodeInput.trim() || !/^\d{6}$/.test(studentPasscodeInput.trim())) {
      alert("Enter student's 6-digit passcode");
      return;
    }

    try {
      setStatus("🔄 Validating passcode and preparing to accept connection...");
      setConnectionStatus("Initializing...");
      
      // Generate shop's response passcode
      const newShopPasscode = generatePasscode();
      setShopPasscode(newShopPasscode);
      setStudentPasscodeVerified(true);

      // Create peer to accept connection
      const peer = acceptConnection(onReceive, () => {
        console.log("[Shop] DataChannel opened!");
        setDataChannelStatus("✅ DataChannel OPEN");
        setConnectionStatus("✅ Connected");
        setStatus("✅ Connected! Waiting for encrypted file...");
      }, undefined, (ch) => {
        console.log("[Shop] Data channel created");
        dataChannelRef.current = ch;
      });
      peerRef.current = peer;

      peer.onicecandidate = (e) => {
        console.log("[Shop] ICE candidate:", e.candidate?.candidate || "gathering...");
      };
      
      peer.oniceconnectionstatechange = () => {
        const state = peer.iceConnectionState;
        console.log("[Shop] ICE state:", state);
        
        if (state === "connected" || state === "completed") {
          setConnectionStatus("🔗 ICE Connected - Waiting for data channel...");
        } else if (state === "checking") {
          setConnectionStatus("🔍 Checking connection...");
        } else if (state === "failed") {
          setConnectionStatus("❌ ICE Connection Failed");
          setStatus("❌ Connection failed. Verify student passcode and try again.");
        } else if (state === "disconnected") {
          setConnectionStatus("⚠️ ICE Disconnected");
        }
      };
      
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log("[Shop] Peer connection state:", state);
        
        if (state === "connected") {
          setConnectionStatus("🔗 Peer Connected");
        } else if (state === "connecting") {
          setConnectionStatus("🔄 Connecting...");
        } else if (state === "failed") {
          setConnectionStatus("❌ Connection Failed");
          setStatus("❌ Peer connection failed. Check your internet and try again.");
        } else if (state === "disconnected") {
          setConnectionStatus("⚠️ Disconnected");
        }
      };

      setStatus("✅ Ready to receive offer from student!");

    } catch (err) {
      console.error(err);
      const msg = err && err.message ? err.message : String(err);
      setStatus("❌ Failed to validate: " + msg);
      setConnectionStatus("Failed");
    }
  };

  // STEP 1.5: Paste student's offer
  const pasteStudentOffer = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOfferSDP(text);
      setStatus("✅ Offer pasted. Click 'Set Offer' to process.");
    } catch (err) {
      console.error("Failed to paste:", err);
      setStatus("❌ Failed to paste from clipboard.");
    }
  };

  // STEP 2: Set student's offer and create answer
  const setStudentOfferAndCreateAnswer = async () => {
    if (!offerSDP.trim()) {
      alert("Paste the student's offer first");
      return;
    }

    if (!peerRef.current) {
      alert("Validate student's passcode first");
      return;
    }

    try {
      setStatus("🔄 Processing offer...");
      const offerJSON = offerSDP.trim();
      const offer = JSON.parse(offerJSON);
      
      console.log("[Shop] Setting remote offer");
      await peerRef.current.setRemoteDescription(offer);

      // Create answer
      setStatus("📝 Creating answer...");
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      
      setStatus("⏳ Gathering ICE candidates...");
      await waitForIceGathering(peerRef.current, 10000);

      // Display answer as JSON (more reliable than base64 on mobile)
      const answerJSON = JSON.stringify(peerRef.current.localDescription);
      setAnswerSDP(answerJSON);
      setShowAnswerStep(true);
      setStatus("✅ Answer created! Copy and send back to student.");
      
      // Start monitoring for data channel (shop receives the data channel from student)
      let timeout = 0;
      const maxTimeout = 20000;
      const checkInterval = 500;
      
      const monitorChannel = setInterval(() => {
        timeout += checkInterval;
        const connStatus = getConnectionStatus(peerRef.current);
        const chStatus = dataChannelRef.current ? getDataChannelStatus(dataChannelRef.current) : { readyState: 'waiting for student channel' };
        
        setDiagnostics(`ICE: ${connStatus.iceConnectionState} | Peer: ${connStatus.connectionState} | Channel: ${chStatus.readyState}`);
        
        if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
          clearInterval(monitorChannel);
          setDataChannelStatus("✅ DataChannel OPEN");
          setConnectionStatus("✅ Connected");
          setStatus("✅ Connected! Waiting for encrypted file...");
          setDiagnostics("");
        } else if (timeout >= maxTimeout) {
          clearInterval(monitorChannel);
          // Don't show timeout error on shop side, just update diagnostics
          const finalStatus = getConnectionStatus(peerRef.current);
          setDiagnostics(`Final state - ICE: ${finalStatus.iceConnectionState} | Peer: ${finalStatus.connectionState}`);
        }
      }, checkInterval);

    } catch (err) {
      console.error("Failed to process offer:", err);
      setStatus("❌ Connection error: " + err.message);
      setConnectionStatus("Failed");
      const connStatus = getConnectionStatus(peerRef.current);
      setDiagnostics(JSON.stringify(connStatus, null, 2));
    }
  };

  // STEP 2.5: Copy answer to clipboard
  const copyAnswerToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(answerSDP);
      setStatus("✅ Answer copied to clipboard! Send it back to student.");
    } catch (err) {
      console.error("Failed to copy:", err);
      setStatus("❌ Failed to copy. Please copy manually.");
    }
  };

  // Receive Encrypted File
  function onReceive(data) {
    console.log('[Shop] onReceive called, data type:', typeof data);
    
    // Accumulate incoming chunks
    if (typeof data === 'string') {
      messageBufferRef.current += data;
    } else {
      messageBufferRef.current = data;
    }
    
    // Try to parse the accumulated buffer
    try {
      const parsed = typeof messageBufferRef.current === 'string' 
        ? JSON.parse(messageBufferRef.current) 
        : messageBufferRef.current;
      console.log('[Shop] Parsed successfully:', parsed);
      setReceivedPayload(parsed);
      setStatus("✅ Encrypted file received! Enter student passcode to decrypt and print.");
      messageBufferRef.current = ""; // Clear buffer after successful parse
    } catch (err) {
      // Not a complete JSON yet, wait for more chunks
      console.log('[Shop] Incomplete JSON, waiting for more chunks. Buffer size:', messageBufferRef.current.length);
    }
  }

  // QR helper: parse scanned QR payload (JSON) and populate fields
  function handleQrFile(e) {
    setQrError("");
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    QrScanner.scanImage(file, { returnDetailedScanResult: false })
      .then((result) => {
        try {
          const payload = JSON.parse(result.data || result);
          if (payload.fileHash) setExpectedHash(payload.fileHash);
          setQrError("");
        } catch (err) {
          console.error("Failed to parse QR payload:", err);
          setQrError("QR content is not valid JSON or missing expected fields.");
        }
      })
      .catch((err) => {
        console.error("QR scan failed:", err);
        setQrError("Failed to scan QR image.");
      });
  }

  // STEP 3: Decrypt + Verify + Print
  async function handlePrint() {
    if (!receivedPayload) return;
    if (!studentPasscodeInput.trim()) {
      setStatus("❌ Enter the student's 6-digit passcode to decrypt.");
      return;
    }

    // Validate passcode format
    if (!/^\d{6}$/.test(studentPasscodeInput.trim())) {
      setStatus("❌ Passcode must be exactly 6 digits.");
      return;
    }

    try {
      setIsDecrypting(true);
      setStatus("🔓 Decrypting file...");
      const encrypted = new Uint8Array(receivedPayload.encrypted).buffer;
      const iv = new Uint8Array(receivedPayload.iv);
      const originalHash = receivedPayload.hash;

      // Derive AES key from student's passcode
      const key = await deriveKeyFromPasscode(studentPasscodeInput.trim());

      const decrypted = await decryptFile(encrypted, iv, key);

      setStatus("✔️ Verifying file integrity...");
      const newHash = await sha256(decrypted);

      // Verify against the hash carried in the payload
      if (newHash !== originalHash) {
        setStatus("❌ Integrity verification failed. Print aborted.");
        setIsDecrypting(false);
        return;
      }

      // If staff provided an expected hash (out-of-band from student), verify it too
      if (expectedHash && expectedHash.trim() !== "") {
        if (expectedHash.trim() !== newHash) {
          setStatus("❌ Expected fingerprint doesn't match. Print aborted.");
          setIsDecrypting(false);
          return;
        }
      }

      // Print in memory
      setStatus("🞨 Opening print dialog...");
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow.print();
        URL.revokeObjectURL(url);

        // Clear memory
        setReceivedPayload(null);
        setStudentPasscodeInput("");
        setStatus("✅ Printed successfully. Memory cleared.");
        setIsDecrypting(false);
      };

    } catch (err) {
      console.error(err);
      setStatus("❌ Decryption failed. Check the passcode and try again.");
      setIsDecrypting(false);
    }
  }

  // Paste passcode from clipboard
  async function handlePastePasscode() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setStatus('❌ Clipboard is empty.');
        return;
      }
      setStudentPasscodeInput(text.trim().substring(0, 6));
      setStatus('✅ Passcode pasted from clipboard.');
    } catch (err) {
      console.error('Clipboard read failed', err);
      setStatus('❌ Unable to read clipboard. Please allow clipboard access or paste manually.');
    }
  }

  // Copy shop passcode to clipboard
  async function handleCopyShopPasscode() {
    try {
      if (!shopPasscode || !shopPasscode.code) {
        setStatus('❌ No passcode to copy.');
        return;
      }
      await navigator.clipboard.writeText(shopPasscode.code);
      setStatus('✅ Shop passcode copied to clipboard.');
    } catch (err) {
      console.error('Clipboard write failed', err);
      setStatus('❌ Unable to copy to clipboard. Please copy manually.');
    }
  }

  // Download the ciphertext as a .enc file (ciphertext only)
  function handleDownloadEncrypted() {
    if (!receivedPayload) return;
    try {
      const arr = new Uint8Array(receivedPayload.encrypted);
      const blob = new Blob([arr], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      const name = receivedPayload.fileName ? `${receivedPayload.fileName}.enc` : 'file.enc';
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
      }, 500);
      setStatus('✅ Encrypted file downloaded (ciphertext only). Decryption happens only at print time.');
    } catch (err) {
      console.error('Download failed', err);
      setStatus('❌ Failed to download encrypted file.');
    }
  }

  return (
    <div>
      {/* VIDEO SECTION */}
      <div style={{ marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', backgroundColor: '#000' }}>
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', aspectRatio: '16/9', maxHeight: '250px' }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          >
            <source src="/13232-246463976.mp4" type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, #0f172a)', opacity: '0.4' }}></div>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>🏪 Shop Dashboard</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '2rem' }}>Receive and decrypt encrypted files securely</p>

        {/* STEP 1 */}
        <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.75rem', color: 'white' }}>Step 1: Validate Student Code</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Student provides their 6-digit code</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="000000"
              value={studentPasscodeInput}
              onChange={(e) => setStudentPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              style={{ width: '8rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center', color: '#10b981' }}
            />
            <button
              onClick={handleValidateStudentPasscode}
              disabled={studentPasscodeInput.length !== 6}
              style={{ backgroundColor: studentPasscodeInput.length === 6 ? '#10b981' : '#666', color: studentPasscodeInput.length === 6 ? '#000' : '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: studentPasscodeInput.length === 6 ? 'pointer' : 'not-allowed', opacity: studentPasscodeInput.length === 6 ? 1 : 0.5 }}
            >
              ✓ Validate
            </button>
            <button
              onClick={handlePastePasscode}
              style={{ backgroundColor: '#444', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              📋 Paste
            </button>
          </div>
        </div>

        {/* STATUS */}
        {studentPasscodeVerified && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 'bold', backgroundColor: dataChannelStatus === "✅ DataChannel OPEN" ? '#1a4d2e' : '#1a3a4d', border: dataChannelStatus === "✅ DataChannel OPEN" ? '1px solid #10b981' : '1px solid #3b82f6', color: dataChannelStatus === "✅ DataChannel OPEN" ? '#10b981' : '#3b82f6' }}>
            {dataChannelStatus === "✅ DataChannel OPEN" ? '✅ Connected!' : '🔄 ' + connectionStatus}
          </div>
        )}

        {/* STEP 2 */}
        {studentPasscodeVerified && (
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.75rem', color: 'white' }}>Step 2: Establish Connection</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Student sends their offer - paste it here:</p>
            <textarea
              value={offerSDP}
              onChange={(e) => setOfferSDP(e.target.value)}
              placeholder="Paste student's offer here..."
              style={{ width: '100%', height: '6rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', resize: 'none', marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={pasteStudentOffer}
                style={{ flex: 1, backgroundColor: '#444', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                📋 Paste Offer
              </button>
              <button
                onClick={setStudentOfferAndCreateAnswer}
                disabled={!offerSDP.trim()}
                style={{ flex: 1, backgroundColor: offerSDP.trim() ? '#3b82f6' : '#666', color: 'white', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: offerSDP.trim() ? 'pointer' : 'not-allowed', opacity: offerSDP.trim() ? 1 : 0.5 }}
              >
                ✓ Process Offer
              </button>
            </div>

            {showAnswerStep && answerSDP && (
              <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: '#1a3a4d', border: '2px solid #3b82f6' }}>
                <p style={{ fontSize: '0.875rem', color: '#3b82f6', marginBottom: '0.75rem', fontWeight: 'bold' }}>📤 Share this answer with student:</p>
                <textarea
                  readOnly
                  value={answerSDP}
                  style={{ width: '100%', height: '6rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', resize: 'none' }}
                />
                <button
                  onClick={copyAnswerToClipboard}
                  style={{ marginTop: '0.75rem', width: '100%', backgroundColor: '#444', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  📋 Copy Answer to Clipboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2B */}
        {studentPasscodeVerified && shopPasscode && (
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'white' }}>Your Code (for Student)</h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '20px', backgroundColor: timeRemaining > 60 ? '#10b981' : '#f59e0b', color: '#000' }}>
                ⏱️ {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Show this to the student so they can complete the connection</p>
            <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: '#1a3a4d', border: '2px solid #3b82f6', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.5rem' }}>📥 Student enters this code:</p>
              <p style={{ fontSize: '2.5rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#3b82f6', textAlign: 'center', letterSpacing: '0.2em' }}>
                {shopPasscode.code}
              </p>
            </div>
            <button
              onClick={handleCopyShopPasscode}
              style={{ width: '100%', backgroundColor: '#444', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              📋 Copy Code to Clipboard
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {receivedPayload && (
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.75rem', color: 'white' }}>Step 3: Decrypt & Print</h3>
            
            <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>📄 File Received:</div>
              <div style={{ fontWeight: 'bold', color: '#10b981' }}>{receivedPayload.fileName}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Size: {(receivedPayload.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>🔐 Student's 6-Digit Passcode</label>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Enter the student's passcode to decrypt the file</p>
              <input
                type="text"
                placeholder="000000"
                value={studentPasscodeInput}
                onChange={(e) => setStudentPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength="6"
                style={{ width: '8rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center', color: '#10b981' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>Expected SHA-256 (Optional)</label>
              <textarea
                placeholder="Paste SHA-256 fingerprint from student for extra verification..."
                value={expectedHash}
                onChange={(e) => setExpectedHash(e.target.value)}
                style={{ width: '100%', height: '3rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', resize: 'none', marginBottom: '0.5rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🔒 Optional: Ask student to share SHA-256 for integrity verification</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={handleDownloadEncrypted}
                style={{ flex: 1, backgroundColor: '#444', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                📥 Save Encrypted
              </button>
              <button
                onClick={handlePrint}
                disabled={!studentPasscodeInput || studentPasscodeInput.length !== 6 || isDecrypting}
                style={{ flex: 1, backgroundColor: !studentPasscodeInput || studentPasscodeInput.length !== 6 || isDecrypting ? '#666' : '#0ea5e9', color: 'white', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: !studentPasscodeInput || studentPasscodeInput.length !== 6 || isDecrypting ? 'not-allowed' : 'pointer', opacity: !studentPasscodeInput || studentPasscodeInput.length !== 6 || isDecrypting ? 0.5 : 1 }}
              >
                {isDecrypting ? "🔄 Decrypting..." : "🖨️ Print Now"}
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingTop: '0.75rem', borderTop: '1px solid #444', lineHeight: '1.8' }}>
              <p>✅ File received via secure WebRTC</p>
              <p>✅ AES-256-GCM decryption in memory</p>
              <p>✅ SHA-256 integrity verification</p>
              <p>✅ No file stored on device</p>
            </div>
          </div>
        )}

        {/* STATUS */}
        {status && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '6px', backgroundColor: '#1a1a1a', border: '1px solid #444' }}>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{status}</p>
          </div>
        )}

        {diagnostics && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '6px', backgroundColor: '#1a1a1a', border: '1px solid #444' }}>
            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1' }}>{diagnostics}</p>
          </div>
        )}

        {qrError && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', backgroundColor: '#7f1d1d', border: '1px solid #dc2626', color: '#fca5a5', fontSize: '0.75rem' }}>
            {qrError}
          </div>
        )}
      </div>
    </div>
  );
}
