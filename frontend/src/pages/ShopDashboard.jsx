import React, { useState, useRef } from "react";
import QrScanner from "qr-scanner";
import {
  importKey,
  decryptFile,
  sha256
} from "../utils/crypto";
import { acceptConnection, waitForIceGathering } from "../utils/p2p";

export default function ShopDashboard() {
  const [offerInput, setOfferInput] = useState("");
  const [answerSDP, setAnswerSDP] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [status, setStatus] = useState("");
  const [receivedPayload, setReceivedPayload] = useState(null);
  const [expectedHash, setExpectedHash] = useState("");

  const peerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [qrError, setQrError] = useState("");
  const [dataChannelStatus, setDataChannelStatus] = useState("No connection");
  const messageBufferRef = useRef(""); // Buffer for reassembling chunked messages

  // STEP 1: Accept Offer & Generate Answer
  async function handleConnect() {
    try {
      console.log("[Shop] handleConnect called");
      setDataChannelStatus("Setting up connection...");
      const peer = acceptConnection(onReceive, () => {
        console.log("[Shop] onChannelOpen callback fired!");
        setDataChannelStatus("✓ DataChannel OPEN - ready to receive file");
      });
      peerRef.current = peer;

      // Diagnostics
      peer.onicecandidate = (e) => {
        console.log("[Shop] ICE candidate:", e.candidate);
      };
      peer.oniceconnectionstatechange = () => {
        console.log("[Shop] ICE state:", peer.iceConnectionState, peer.iceGatheringState);
        setStatus(`Shop ICE: ${peer.iceConnectionState} / ${peer.iceGatheringState}`);
      };

      const remote = JSON.parse(offerInput);
      console.log("[Shop] Applying remote offer:", remote.type);
      await peer.setRemoteDescription(remote);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      await waitForIceGathering(peer);

      setAnswerSDP(JSON.stringify(peer.localDescription));
      setStatus("Answer created — send this back to student.");
    } catch (err) {
      console.error(err);
      const msg = err && err.message ? err.message : String(err);
      setStatus("Failed to connect: " + msg);
    }
  }

  // STEP 2: Receive Encrypted File
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
      setStatus("✓ Encrypted file received. Enter AES key to print.");
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
          if (payload.keyB64) setKeyInput(payload.keyB64);
          if (payload.fileHash) setExpectedHash(payload.fileHash);
          if (payload.offer) setOfferInput(payload.offer);
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
    if (!keyInput.trim()) {
      setStatus("Enter AES key provided by student.");
      return;
    }

    try {
      const encrypted = new Uint8Array(receivedPayload.encrypted).buffer;
      const iv = new Uint8Array(receivedPayload.iv);
      const originalHash = receivedPayload.hash;

      const key = await importKey(keyInput.trim());

      const decrypted = await decryptFile(encrypted, iv, key);

      const newHash = await sha256(decrypted);

      // Verify against the hash carried in the payload
      if (newHash !== originalHash) {
        setStatus("Integrity verification failed (payload hash mismatch). Print aborted.");
        return;
      }

      // If staff provided an expected hash (out-of-band from student), verify it too
      if (expectedHash && expectedHash.trim() !== "") {
        if (expectedHash.trim() !== newHash) {
          setStatus("Expected fingerprint does not match decrypted file. Print aborted.");
          return;
        }
      }

      // Print in memory
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
        setKeyInput("");
        setStatus("Printed successfully. Memory cleared.");
      };

    } catch (err) {
      console.error(err);
      setStatus("Decryption failed.");
    }
  }

  // Paste AES key from clipboard into the AES Key textarea
  async function handlePasteKey() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setStatus('Clipboard is empty or does not contain text.');
        return;
      }
      setKeyInput(text.trim());
      setStatus('AES key pasted from clipboard.');
    } catch (err) {
      console.error('Clipboard read failed', err);
      setStatus('Unable to read clipboard. Please allow clipboard access or paste manually.');
    }
  }

  // Copy AES key from the AES Key textarea to the clipboard
  async function handleCopyKey() {
    try {
      if (!keyInput || !keyInput.trim()) {
        setStatus('No AES key to copy.');
        return;
      }
      await navigator.clipboard.writeText(keyInput.trim());
      setStatus('AES key copied to clipboard.');
    } catch (err) {
      console.error('Clipboard write failed', err);
      setStatus('Unable to copy to clipboard. Please copy manually.');
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
      setStatus('Encrypted file downloaded (ciphertext only). Decryption happens only at print time.');
    } catch (err) {
      console.error('Download failed', err);
      setStatus('Failed to download encrypted file.');
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Shop Dashboard (P2P Secure)</h1>

      <p className="text-sm text-slate-300 mb-4">
        Paste the student's connection code (Offer). You will receive an encrypted file.
        Decryption happens only in memory. No file is stored.
      </p>

      {/* OFFER INPUT */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 mb-4">
        <label className="block text-sm mb-1">Student Offer (Connection Code)</label>
        <textarea
          value={offerInput}
          onChange={(e) => setOfferInput(e.target.value)}
          rows={6}
          className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs font-mono"
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleConnect}
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Connect
          </button>

          <label className="text-xs text-slate-300">Or upload QR image to prefill fields</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleQrFile}
            className="text-xs"
          />
        </div>
        {qrError && <div className="text-xs text-rose-400 mt-2">{qrError}</div>}
      </div>

      {/* ANSWER DISPLAY */}
      {answerSDP && (
        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 mb-4">
          <div className="text-slate-400 text-xs uppercase mb-1">
            Send this Answer back to Student
          </div>
          <textarea
            value={answerSDP}
            readOnly
            rows={6}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs font-mono"
          />
        </div>
      )}

      {/* PRINT SECTION */}
      {receivedPayload && (
        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-3">
          <div>
            <div className="text-slate-400 text-xs uppercase">File</div>
            <div>{receivedPayload.fileName}</div>
            <div className="text-xs text-slate-400">
              Size: {(receivedPayload.fileSize / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">AES Key (Base64)</label>
            <div className="flex items-start gap-3">
              <textarea
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs font-mono"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handlePasteKey}
                  className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Paste from clipboard
                </button>
                <button
                  onClick={handleCopyKey}
                  className="inline-flex items-center justify-center rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-600"
                >
                  Copy key to clipboard
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Expected SHA-256 (from student)</label>
            <textarea
              placeholder="Paste SHA-256 fingerprint here"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs font-mono"
            />
            <div className="text-xs text-slate-400 mt-1">You can paste the fingerprint the student shared (or scan the QR). This will be compared to the decrypted file before printing.</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadEncrypted}
              className="inline-flex items-center justify-center rounded-md bg-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-50 hover:bg-slate-600"
            >
              Download encrypted file
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Print Without Preview
            </button>
          </div>

          <div className="text-xs text-amber-300 mt-2">Note: the downloaded file is ciphertext only (.enc). Do not attempt to open it — decryption happens in-app at print time using the AES key provided by the student.</div>

          <div className="text-xs text-slate-400 space-y-1">
            <p>✓ Ciphertext received via WebRTC</p>
            <p>✓ AES-256-GCM decryption in memory</p>
            <p>✓ SHA-256 integrity verified</p>
            <p>✓ No storage or preview</p>
          </div>
        </div>
      )}

      {status && <p className="text-xs text-slate-300 mt-3">{status}</p>}
      
      {/* DEBUG: Show DataChannel Status */}
      <div className="text-xs text-amber-300 mt-3 p-2 border border-amber-600 rounded bg-slate-900/50">
        <strong>DataChannel Status:</strong> {dataChannelStatus}
      </div>
    </div>
  );
}