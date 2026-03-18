import { useState, useRef, useEffect } from "react";
import {
  generatePasscode,
  isPasscodeValid,
  getTimeRemaining,
  deriveKeyFromPasscode,
  encryptFile,
  sha256
} from "../utils/crypto";
import { createConnection, sendData, waitForIceGathering, getConnectionStatus, getDataChannelStatus } from "../utils/p2p";

function UserUpload() {
  const [file, setFile] = useState(null);
  const [studentPasscode, setStudentPasscode] = useState(null); // {code, timestamp}
  const [shopPasscode, setShopPasscode] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [status, setStatus] = useState("");
  const [dataChannelStatus, setDataChannelStatus] = useState("No connection");
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [offerSDP, setOfferSDP] = useState("");
  const [answerSDP, setAnswerSDP] = useState("");
  const [showOfferStep, setShowOfferStep] = useState(false);
  const [showAnswerStep, setShowAnswerStep] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [diagnostics, setDiagnostics] = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);

    // compute sha256 fingerprint immediately so it can be shared with shop
    (async () => {
      try {
        const buffer = await f.arrayBuffer();
        const h = await sha256(buffer);
        setFileHash(h);
      } catch (err) {
        console.error("Failed to compute file hash:", err);
        setFileHash("");
      }
    })();
  };

  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);

  // Countdown timer for passcode validity
  useEffect(() => {
    if (!studentPasscode) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getTimeRemaining(studentPasscode);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setStudentPasscode(null);
        setStatus("⏰ Passcode expired. Generate a new one.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [studentPasscode]);

  // STEP 1: Generate Student Passcode
  const generateNewPasscode = () => {
    const newPasscode = generatePasscode();
    setStudentPasscode(newPasscode);
    setShopPasscode("");
    setStatus("✓ Passcode generated. Share with shop keeper.");
  };

  // STEP 2: Create Offer manually
  const createOfferForShop = async () => {
    if (!studentPasscode) {
      alert("Generate your passcode first");
      return;
    }

    if (!isPasscodeValid(studentPasscode)) {
      alert("Your passcode expired. Generate a new one.");
      setStudentPasscode(null);
      return;
    }

    if (!shopPasscode.trim() || !/^\d{6}$/.test(shopPasscode.trim())) {
      alert("Enter shop keeper's 6-digit passcode");
      return;
    }

    try {
      setStatus("🔄 Validating passcode and creating connection...");
      setConnectionStatus("Initializing...");
      
      // Create peer connection
      const peer = createConnection(
        () => {},
        () => {
          console.log("[Student] Channel opened!");
          setDataChannelStatus("✅ DataChannel OPEN");
          setConnectionStatus("✅ Connected");
          setIsConnected(true);
          setStatus("✅ Connected! Ready to send file.");
        },
        undefined,
        (ch) => {
          console.log("[Student] Data channel created");
          dataChannelRef.current = ch;
        }
      );
      peerRef.current = peer;

      peer.onicecandidate = (ev) => {
        console.log("[Student] ICE candidate:", ev.candidate?.candidate || "gathering...");
      };
      
      peer.oniceconnectionstatechange = () => {
        const state = peer.iceConnectionState;
        console.log("[Student] ICE state:", state);
        
        if (state === "connected" || state === "completed") {
          setConnectionStatus("🔗 ICE Connected - Waiting for data channel...");
        } else if (state === "checking") {
          setConnectionStatus("🔍 Checking connection...");
        } else if (state === "failed") {
          setConnectionStatus("❌ ICE Connection Failed");
          setStatus("❌ Connection failed. Ensure you entered correct passcode and try again.");
        } else if (state === "disconnected") {
          setConnectionStatus("⚠️ ICE Disconnected");
        }
      };
      
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log("[Student] Peer connection state:", state);
        
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

      // Create offer
      setStatus("📝 Creating WebRTC offer...");
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      setStatus("⏳ Gathering ICE candidates (may take a few seconds)...");
      await waitForIceGathering(peer, 8000);

      // Display offer as JSON (more reliable than base64 on mobile)
      const offerJSON = JSON.stringify(peer.localDescription);
      setOfferSDP(offerJSON);
      setShowOfferStep(true);
      setShowAnswerStep(false);
      setStatus("✅ Offer created! Copy the offer and share with shop keeper.");

    } catch (err) {
      console.error("Failed to create offer:", err);
      setStatus("❌ Error: " + err.message);
      setConnectionStatus("Failed");
    }
  };

  // STEP 2.5: Copy offer to clipboard
  const copyOfferToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(offerSDP);
      setStatus("✅ Offer copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      setStatus("❌ Failed to copy. Please copy manually.");
    }
  };

  // STEP 2.75: Paste answer from shop
  const pasteAnswerFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAnswerSDP(text);
      setStatus("✅ Answer pasted. Click 'Set Answer' to complete connection.");
    } catch (err) {
      console.error("Failed to paste:", err);
      setStatus("❌ Failed to paste from clipboard.");
    }
  };

  // STEP 2.9: Set remote answer
  const setRemoteAnswer = async () => {
    if (!answerSDP.trim()) {
      alert("Paste the answer SDP first");
      return;
    }

    try {
      setStatus("🔄 Setting remote answer...");
      const answerJSON = answerSDP.trim();
      const answer = JSON.parse(answerJSON);
      await peerRef.current.setRemoteDescription(answer);
      setStatus("✅ Answer set! Waiting for data channel to open (this may take 5-10 seconds)...");
      setShowAnswerStep(false);
      
      // Wait for data channel to actually open (up to 15 seconds)
      let timeout = 0;
      const maxTimeout = 15000;
      const checkInterval = 500;
      
      const waitForChannelOpen = setInterval(() => {
        timeout += checkInterval;
        const connStatus = getConnectionStatus(peerRef.current);
        const chStatus = dataChannelRef.current ? getDataChannelStatus(dataChannelRef.current) : { readyState: 'not created' };
        
        setDiagnostics(`ICE: ${connStatus.iceConnectionState} | Peer: ${connStatus.connectionState} | Channel: ${chStatus.readyState}`);
        
        if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
          clearInterval(waitForChannelOpen);
          setDataChannelStatus("✅ DataChannel OPEN");
          setConnectionStatus("✅ Connected");
          setIsConnected(true);
          setStatus("✅ Connected! Ready to send file.");
          setDiagnostics("");
        } else if (timeout >= maxTimeout) {
          clearInterval(waitForChannelOpen);
          setStatus("❌ Data channel did not open after 15 seconds. Check internet connection and try again.");
          const finalStatus = getConnectionStatus(peerRef.current);
          setDiagnostics(`Final state - ICE: ${finalStatus.iceConnectionState} | Peer: ${finalStatus.connectionState}`);
        }
      }, checkInterval);
      
    } catch (err) {
      console.error("Failed to set answer:", err);
      setStatus("❌ Error setting answer: " + err.message);
      const connStatus = getConnectionStatus(peerRef.current);
      setDiagnostics(JSON.stringify(connStatus, null, 2));
    }
  };

  // STEP 3: Encrypt & Send
  const handleUpload = async () => {
    if (!file) {
      alert("Select a file first");
      return;
    }
    
    if (!studentPasscode) {
      alert("Generate your passcode first");
      return;
    }

    if (!isPasscodeValid(studentPasscode)) {
      alert("Your passcode expired. Generate a new one.");
      setStudentPasscode(null);
      return;
    }

    if (!isConnected) {
      alert("Data channel not open. Ensure connection is established.");
      return;
    }

    try {
      setIsSending(true);
      setStatus("🔒 Encrypting file...");
      // Convert to ArrayBuffer
      const buffer = await file.arrayBuffer();

      // Generate SHA-256 fingerprint
      const hash = await sha256(buffer);

      // Derive AES-256 key from student's passcode
      const key = await deriveKeyFromPasscode(studentPasscode.code);

      // Encrypt file
      const { encrypted, iv } = await encryptFile(buffer, key);

      // Convert to sendable format
      const payload = {
        fileName: file.name,
        fileSize: file.size,
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        hash
      };

      const payloadStr = JSON.stringify(payload);
      console.log("[Student] About to send payload, size:", payloadStr.length);
      setStatus(`📤 Sending file (${Math.round(payloadStr.length / 1024)} KB in chunks)...`);
      sendData(payloadStr);
      console.log("[Student] Payload send initiated!");

      // Wait a bit for all chunks to be sent
      setTimeout(() => {
        setStatus("✅ File encrypted and sent! Share your 6-digit passcode with shop keeper.");
        setIsSending(false);
      }, 2000);
    } catch (err) {
      console.error("[Student] Error during send:", err);
      setStatus("❌ Error: " + err.message);
      setIsSending(false);
      alert("Error: " + err.message);
    }
  };

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
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>📱 Secure Upload</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '2rem' }}>Send encrypted files directly to the print shop</p>

        {/* FILE SELECTION */}
        <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'white' }}>Select File to Print</label>
          <input 
            type="file" 
            onChange={handleFileChange} 
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #444', borderRadius: '6px', backgroundColor: '#0a0a0a', color: 'white', cursor: 'pointer' }}
          />
          {file && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
              <span style={{ fontWeight: 'bold', color: '#10b981' }}>✅ {file.name}</span>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Size: {(file.size / 1024).toFixed(2)} KB<br/>
                Hash: <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{fileHash.substring(0, 16)}...</span>
              </div>
            </div>
          )}
        </div>

        {/* STEP 1: GENERATE PASSCODE */}
        <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'white' }}>Step 1: Generate Your Code</h3>
            {studentPasscode && (
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '20px', backgroundColor: '#10b981', color: '#000' }}>
                ⏱️ {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </span>
            )}
          </div>
          <button
            onClick={generateNewPasscode}
            style={{ backgroundColor: '#10b981', color: '#000', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
          >
            🔐 Generate 6-Digit Code
          </button>

          {studentPasscode && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '6px', backgroundColor: '#1a4d2e', border: '2px solid #10b981' }}>
              <p style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '0.75rem' }}>📤 Share this code with shop keeper:</p>
              <p style={{ fontSize: '2.5rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#10b981', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '0.2em' }}>
                {studentPasscode.code}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#10b981', textAlign: 'center' }}>Call, SMS, WhatsApp, or tell them in-person</p>
            </div>
          )}
        </div>

        {/* STEP 2: ESTABLISH CONNECTION */}
        {studentPasscode && isPasscodeValid(studentPasscode) && (
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.75rem', color: 'white' }}>Step 2: Establish Connection</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>Shop keeper provides their code after receiving yours</p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem', display: 'block' }}>Shop Keeper's 6-Digit Code:</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="000000"
                  value={shopPasscode}
                  onChange={(e) => setShopPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  style={{ width: '8rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center', color: '#10b981' }}
                />
                <button
                  onClick={createOfferForShop}
                  disabled={shopPasscode.length !== 6}
                  style={{ backgroundColor: shopPasscode.length === 6 ? '#3b82f6' : '#666', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: shopPasscode.length === 6 ? 'pointer' : 'not-allowed', opacity: shopPasscode.length === 6 ? 1 : 0.5 }}
                >
                  ✓ Create Offer
                </button>
              </div>
            </div>

            {(showOfferStep || isConnected) && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 'bold', backgroundColor: isConnected ? '#1a4d2e' : '#1a3a4d', border: isConnected ? '1px solid #10b981' : '1px solid #3b82f6', color: isConnected ? '#10b981' : '#3b82f6' }}>
                {isConnected ? '✅ Connected!' : '🔄 ' + connectionStatus}
              </div>
            )}

            {showOfferStep && offerSDP && (
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '6px', backgroundColor: '#1a3a4d', border: '2px solid #3b82f6' }}>
                <p style={{ fontSize: '0.875rem', color: '#3b82f6', marginBottom: '0.75rem', fontWeight: 'bold' }}>📤 Share this offer with shop keeper:</p>
                <textarea
                  readOnly
                  value={offerSDP}
                  style={{ width: '100%', height: '6rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', resize: 'none' }}
                />
                <button
                  onClick={copyOfferToClipboard}
                  style={{ marginTop: '0.75rem', width: '100%', backgroundColor: '#444', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  📋 Copy Offer to Clipboard
                </button>
              </div>
            )}

            {showOfferStep && (
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '6px', backgroundColor: '#4d3a1a', border: '2px solid #f59e0b' }}>
                <p style={{ fontSize: '0.875rem', color: '#f59e0b', marginBottom: '0.75rem', fontWeight: 'bold' }}>📥 Paste shop keeper's answer here:</p>
                <textarea
                  value={answerSDP}
                  onChange={(e) => setAnswerSDP(e.target.value)}
                  placeholder="Paste the answer text here..."
                  style={{ width: '100%', height: '6rem', borderRadius: '6px', backgroundColor: '#0a0a0a', border: '1px solid #444', padding: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', resize: 'none', marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={pasteAnswerFromClipboard}
                    style={{ flex: 1, backgroundColor: '#444', color: '#cbd5e1', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    📋 Paste from Clipboard
                  </button>
                  <button
                    onClick={setRemoteAnswer}
                    disabled={!answerSDP.trim()}
                    style={{ flex: 1, backgroundColor: answerSDP.trim() ? '#10b981' : '#666', color: '#000', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: answerSDP.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', opacity: answerSDP.trim() ? 1 : 0.5 }}
                  >
                    ✓ Set Answer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ENCRYPT & SEND */}
        {isConnected && (
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem', backgroundColor: '#1a1a1a', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.75rem', color: 'white' }}>Step 3: Encrypt & Send File</h3>
            <button
              onClick={handleUpload}
              disabled={!file || isSending}
              style={{ width: '100%', backgroundColor: !file || isSending ? '#666' : '#8b5cf6', color: 'white', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: !file || isSending ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: !file || isSending ? 0.5 : 1 }}
            >
              {isSending ? "🔄 Sending..." : "🚀 Encrypt & Send"}
            </button>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
              File will be encrypted with your passcode and securely sent
            </p>
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
      </div>
    </div>
  );
}

export default UserUpload;