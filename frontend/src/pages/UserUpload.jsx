import { useState, useRef } from "react";
import {
  generateAESKey,
  exportKey,
  encryptFile,
  sha256
} from "../utils/crypto";
import { createConnection, sendData, waitForIceGathering } from "../utils/p2p";

function UserUpload() {
  const [file, setFile] = useState(null);
  const [shareKey, setShareKey] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [offerSDP, setOfferSDP] = useState("");
  const [answerSDP, setAnswerSDP] = useState("");
  const [status, setStatus] = useState("");
  const [dataChannelStatus, setDataChannelStatus] = useState("No connection");

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

  // STEP 1: Create WebRTC Offer
  const createOffer = async () => {
    const peer = createConnection(() => {}, () => {
      console.log("[Student] Channel opened!");
      setDataChannelStatus("✓ DataChannel OPEN - connected to shop");
    });
    peerRef.current = peer;

    // Diagnostics
    peer.onicecandidate = (ev) => {
      console.log("[Student] ICE candidate:", ev.candidate);
    };
    peer.oniceconnectionstatechange = () => {
      console.log("[Student] ICE state:", peer.iceConnectionState, peer.iceGatheringState);
      setStatus(`Student ICE: ${peer.iceConnectionState} / ${peer.iceGatheringState}`);
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await waitForIceGathering(peer);

    setOfferSDP(JSON.stringify(peer.localDescription));
  };

  // STEP 2: Accept Shop Answer
  const acceptAnswer = async () => {
    if (!peerRef.current) {
      alert("No offer created yet. Generate connection code first.");
      return;
    }

    try {
      const remote = JSON.parse(answerSDP);
      console.log("[Student] Setting remote description:", remote.type);
      await peerRef.current.setRemoteDescription(remote);
      setStatus("Remote answer applied — waiting for data channel to open.");
    } catch (err) {
      console.error("Failed to set remote description:", err);
      const msg = err && err.message ? err.message : String(err);
      alert("Invalid answer SDP. Check the pasted data.\n" + msg);
      setStatus("Error applying remote answer: " + msg);
    }
  };

  // STEP 3: Encrypt & Send
  const handleUpload = async () => {
    if (!file) {
      alert("Select a file first");
      return;
    }

    try {
      setStatus("Encrypting file...");
      // Convert to ArrayBuffer
      const buffer = await file.arrayBuffer();

      // Generate SHA-256 fingerprint
      const hash = await sha256(buffer);

      // Generate AES-256 key
      const key = await generateAESKey();
      const exportedKey = await exportKey(key);
      setShareKey(exportedKey);

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

      console.log("[Student] About to send payload, size:", JSON.stringify(payload).length);
      setStatus("Sending encrypted file in chunks...");
      sendData(JSON.stringify(payload));
      console.log("[Student] Payload send initiated!");

      // Wait a bit for all chunks to be sent
      setTimeout(() => {
        setStatus("✓ Encrypted file sent to shop. Share this AES key with the print shop.");
      }, 2000);
    } catch (err) {
      console.error("[Student] Error during send:", err);
      setStatus("Error: " + err.message);
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Secure Upload</h2>

      <input type="file" onChange={handleFileChange} />

      <div className="mt-4">
        <button onClick={createOffer} className="bg-blue-500 text-white px-4 py-2 rounded">
          Generate Connection Code
        </button>
      </div>

      {offerSDP && (
        <div className="mt-4">
          <p className="font-semibold">Share this with Shop:</p>
          <textarea value={offerSDP} readOnly rows={6} className="w-full border p-2" />
          {file && (
            <div className="mt-2 text-sm">
              <div className="font-semibold">File:</div>
              <div className="font-mono break-all">{file.name}</div>
              <div className="font-semibold mt-2">SHA-256 fingerprint (hex):</div>
              <div className="font-mono break-all">{fileHash || "computing..."}</div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <textarea
          placeholder="Paste Shop Answer Here"
          value={answerSDP}
          onChange={(e) => setAnswerSDP(e.target.value)}
          rows={4}
          className="w-full border p-2"
        />
        <button onClick={acceptAnswer} className="bg-green-500 text-white px-4 py-2 mt-2 rounded">
          Connect
        </button>
      </div>

      <div className="mt-6">
        <button onClick={handleUpload} className="bg-purple-600 text-white px-6 py-2 rounded">
          Encrypt & Send File
        </button>
      </div>

      {shareKey && (
        <div className="mt-6 bg-yellow-100 p-4 rounded">
          <p className="font-semibold">Share this AES Key with Shop:</p>
          <p className="break-all">{shareKey}</p>
        </div>
      )}

      {fileHash && (
        <div className="mt-2 text-xs text-slate-300">Share the SHA-256 fingerprint with the shop so they can verify the decrypted file before printing.</div>
      )}

      {status && <p className="text-xs text-slate-300 mt-3">{status}</p>}
      
      {/* DEBUG: Show DataChannel Status */}
      <div className="text-xs text-amber-300 mt-3 p-2 border border-amber-600 rounded bg-slate-900/50">
        <strong>DataChannel Status:</strong> {dataChannelStatus}
      </div>
    </div>
  );
}

export default UserUpload;