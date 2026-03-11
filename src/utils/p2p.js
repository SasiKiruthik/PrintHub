// Hardened WebRTC P2P helper

let peer = null;
let channel = null;
let iceCandidatesLocal = [];
let iceCandidatesRemote = [];

const rtcConfig = {
  iceServers: [
    // STUN servers for NAT traversal
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    // TURN servers for relaying when direct connection is impossible
    { 
      urls: ["turn:turnserver.twilio.com:3478?transport=udp"],
      username: "d8a6b97add2c6dc1f6621e092f8eac2d62e37744c2bf47d1b149a247e8675dff",
      credential: "GJaML8g+A8r3dEFfMhqCLn0nABCDEFGHIJKLMNOPQRSTUVWXYZ="
    }
  ],
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};

// ==============================
// CREATE CONNECTION (Student)
// ==============================
export function createConnection(onReceive, onChannelOpen, onIceCandidate) {
  peer = new RTCPeerConnection(rtcConfig);
  iceCandidatesLocal = [];
  iceCandidatesRemote = [];

  channel = peer.createDataChannel("secure-file", {
    ordered: true
  });

  channel.onmessage = (event) => {
    console.log("[Student] onmessage received, data type:", typeof event.data);
    onReceive(event.data);
  };

  channel.onopen = () => {
    console.log("[Student] Data channel OPEN!");
    if (onChannelOpen) onChannelOpen();
  };

  channel.onerror = (err) => {
    console.error("[Student] Channel error:", err);
  };

  channel.onclose = () => {
    console.warn("[Student] Channel closed");
  };

  // ICE candidate handling
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("[Student] New ICE candidate:", event.candidate.candidate);
      iceCandidatesLocal.push(event.candidate);
      if (onIceCandidate) onIceCandidate(event.candidate);
    } else {
      console.log("[Student] ICE gathering complete");
    }
  };

  peer.onconnectionstatechange = () => {
    console.log("[Student] Connection state:", peer.connectionState);
  };

  peer.oniceconnectionstatechange = () => {
    console.log("[Student] ICE connection state:", peer.iceConnectionState);
  };

  peer.onicegatheringstatechange = () => {
    console.log("[Student] ICE gathering state:", peer.iceGatheringState);
  };

  return peer;
}

// ==============================
// ACCEPT CONNECTION (Shop)
// ==============================
export function acceptConnection(onReceive, onChannelOpen, onIceCandidate) {
  peer = new RTCPeerConnection(rtcConfig);
  iceCandidatesLocal = [];
  iceCandidatesRemote = [];

  peer.ondatachannel = (event) => {
    channel = event.channel;
    console.log("[Shop] DataChannel received! Label:", channel.label, "State:", channel.readyState);

    channel.onmessage = (e) => {
      onReceive(e.data);
    };

    channel.onopen = () => {
      console.log("[Shop] Data channel OPEN!");
      if (onChannelOpen) onChannelOpen();
    };

    channel.onerror = (err) => {
      console.error("[Shop] Channel error:", err);
    };

    channel.onclose = () => {
      console.warn("[Shop] Channel closed");
    };
  };

  // ICE candidate handling
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("[Shop] New ICE candidate:", event.candidate.candidate);
      iceCandidatesLocal.push(event.candidate);
      if (onIceCandidate) onIceCandidate(event.candidate);
    } else {
      console.log("[Shop] ICE gathering complete");
    }
  };

  peer.onconnectionstatechange = () => {
    console.log("[Shop] Connection state:", peer.connectionState);
  };

  peer.oniceconnectionstatechange = () => {
    console.log("[Shop] ICE connection state:", peer.iceConnectionState);
  };

  peer.onicegatheringstatechange = () => {
    console.log("[Shop] ICE gathering state:", peer.iceGatheringState);
  };

  return peer;
}

// ==============================
// SEND DATA SAFELY
// ==============================
export function sendData(data) {
  if (!channel || channel.readyState !== "open") {
    const err = "Data channel not open (state: " + (channel ? channel.readyState : "null") + ")";
    console.error("[P2P] " + err);
    throw new Error(err);
  }

  console.log("[P2P] Sending", data.length || data.byteLength, "bytes");

  // Use larger chunks and intelligent backpressure based on bufferedAmount
  const CHUNK_SIZE = 8192; // 8KB chunks
  if (typeof data === "string" && data.length > CHUNK_SIZE) {
    console.log("[P2P] Chunking into", Math.ceil(data.length / CHUNK_SIZE), "chunks of", CHUNK_SIZE, "bytes");
    
    let chunkIndex = 0;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    
    const sendNextChunk = () => {
      const start = chunkIndex * CHUNK_SIZE;
      const end = start + CHUNK_SIZE;
      const chunk = data.slice(start, end);
      
      try {
        channel.send(chunk);
        chunkIndex++;
        console.log("[P2P] Sent chunk", chunkIndex, '/', totalChunks);
        
        if (end < data.length) {
          // Only delay if buffer is getting full (>32KB pending)
          // This is much faster than always delaying
          if (channel.bufferedAmount > 32768) {
            console.log("[P2P] Buffer full (" + channel.bufferedAmount + " bytes), waiting...");
            setTimeout(sendNextChunk, 20);
          } else {
            // Send next chunk immediately if buffer has space
            setTimeout(sendNextChunk, 0);
          }
        } else {
          console.log("[P2P] All chunks sent!");
        }
      } catch (err) {
        console.error("[P2P] Send error on chunk", chunkIndex, ":", err);
        throw err;
      }
    };
    
    sendNextChunk();
  } else {
    channel.send(data);
    console.log("[P2P] Sent single payload");
  }
}

// ==============================
// WAIT FOR ICE GATHERING
// ==============================
export function waitForIceGathering(pc, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }

    let timeoutHandle = setTimeout(() => {
      resolve(); // Resolve after timeout
    }, timeoutMs);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeoutHandle);
        resolve();
      }
    };
  });
}

// ==============================
// GET LOCAL ICE CANDIDATES
// ==============================
export function getLocalIceCandidates() {
  return iceCandidatesLocal;
}

// ==============================
// ADD REMOTE ICE CANDIDATES
// ==============================
export function addRemoteIceCandidate(candidate) {
  if (peer && candidate) {
    try {
      peer.addIceCandidate(candidate).catch((err) => {
        console.warn("[P2P] Failed to add ICE candidate:", err);
      });
    } catch (err) {
      console.warn("[P2P] Error adding ICE candidate:", err);
    }
  }
}

// ==============================
// CLOSE CONNECTION
// ==============================
export function closeConnection() {
  if (channel) {
    channel.close();
    channel = null;
  }
  if (peer) {
    peer.close();
    peer = null;
  }
}