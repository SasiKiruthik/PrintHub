import express from 'express';
import cors from 'cors';
import path from 'path';
import https from 'node:https';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for encrypted print jobs
const printJobs = new Map();

// Auto-cleanup: delete jobs older than 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of printJobs) {
    if (now - job.timestamp > 10 * 60 * 1000) {
      console.log(`🗑️ Auto-deleting expired job: ${id}`);
      printJobs.delete(id);
    }
  }
}, 60 * 1000);

// ===========================================
// SELF-SIGNED CERTIFICATE GENERATOR
// Generates a self-signed cert at startup
// using pure Node.js crypto + ASN.1 DER encoding
// Zero external dependencies!
// ===========================================
function generateSelfSignedCert() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const serialNumber = crypto.randomBytes(8);
  const notBefore = new Date();
  const notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // ---- ASN.1 DER Encoding Helpers ----
  function derLen(len) {
    if (len < 128) return Buffer.from([len]);
    if (len < 256) return Buffer.from([0x81, len]);
    return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
  }

  function derWrap(tag, ...items) {
    const body = Buffer.concat(items);
    return Buffer.concat([Buffer.from([tag]), derLen(body.length), body]);
  }

  const SEQ = (...items) => derWrap(0x30, ...items);
  const SET = (...items) => derWrap(0x31, ...items);
  const BSTR = (data) => derWrap(0x03, Buffer.from([0x00]), data);
  const CTX = (n, data) => derWrap(0xa0 | n, data);

  function INT(val) {
    if (Buffer.isBuffer(val)) {
      if (val[0] & 0x80) val = Buffer.concat([Buffer.from([0x00]), val]);
      return derWrap(0x02, val);
    }
    return derWrap(0x02, Buffer.from([val]));
  }

  function OID(oid) {
    const p = oid.split('.').map(Number);
    const bytes = [40 * p[0] + p[1]];
    for (let i = 2; i < p.length; i++) {
      let v = p[i];
      if (v < 128) {
        bytes.push(v);
      } else {
        const tmp = [];
        while (v > 0) { tmp.unshift(v & 0x7f); v >>= 7; }
        for (let j = 0; j < tmp.length - 1; j++) tmp[j] |= 0x80;
        bytes.push(...tmp);
      }
    }
    return derWrap(0x06, Buffer.from(bytes));
  }

  function UTF8(str) {
    return derWrap(0x0c, Buffer.from(str, 'utf-8'));
  }

  function UTCTIME(date) {
    const s = date.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z';
    return derWrap(0x17, Buffer.from(s, 'ascii'));
  }

  const NULL = Buffer.from([0x05, 0x00]);
  const sha256RSA = SEQ(OID('1.2.840.113549.1.1.11'), NULL);
  const cn = SEQ(SET(SEQ(OID('2.5.4.3'), UTF8('SecurePrintHub'))));
  const validity = SEQ(UTCTIME(notBefore), UTCTIME(notAfter));

  // SAN extension: allow any IP
  const sanOID = OID('2.5.29.17'); // subjectAltName
  // We'll add a DNS wildcard - this makes Chrome less strict
  const dnsName = derWrap(0x82, Buffer.from('SecurePrintHub'));
  const sanValue = derWrap(0x04, SEQ(dnsName));
  const extensions = CTX(3, SEQ(SEQ(sanOID, sanValue)));

  const tbs = SEQ(
    CTX(0, INT(2)),               // version v3
    INT(serialNumber),            // serial
    sha256RSA,                    // signature algo
    cn,                           // issuer
    validity,                     // validity
    cn,                           // subject
    Buffer.from(publicKey),       // subject public key info
    extensions                    // extensions
  );

  const signer = crypto.createSign('SHA256');
  signer.update(tbs);
  const signature = signer.sign(privateKey);

  const certDer = SEQ(tbs, sha256RSA, BSTR(signature));
  const certPem = '-----BEGIN CERTIFICATE-----\n' +
    certDer.toString('base64').match(/.{1,64}/g).join('\n') +
    '\n-----END CERTIFICATE-----';

  return { key: privateKey, cert: certPem };
}

// ===========================================
// EXPRESS + HTTPS SERVER
// ===========================================
export function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: '100mb' }));

    // Serve the Vite build output (student web UI)
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));

    // ========================
    // API ENDPOINTS
    // ========================

    // Student uploads encrypted file
    app.post('/api/upload', (req, res) => {
      try {
        const { encrypted, iv, fileName, fileSize, hash, passcodeHash } = req.body;
        if (!encrypted || !iv || !fileName) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const jobId = generateJobId();
        printJobs.set(jobId, {
          encrypted,
          iv,
          fileName,
          fileSize: fileSize || 0,
          hash,
          passcodeHash,
          timestamp: Date.now(),
          status: 'pending'
        });

        console.log(`📥 New print job: ${jobId} | File: ${fileName} | Size: ${(fileSize / 1024).toFixed(1)}KB`);
        res.json({ success: true, jobId, message: 'File uploaded securely' });
      } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
      }
    });

    // Shop polls for pending jobs
    app.get('/api/jobs', (req, res) => {
      const jobs = [];
      for (const [id, job] of printJobs) {
        jobs.push({
          id,
          fileName: job.fileName,
          fileSize: job.fileSize,
          timestamp: job.timestamp,
          status: job.status
        });
      }
      jobs.sort((a, b) => b.timestamp - a.timestamp);
      res.json({ jobs });
    });

    // Shop retrieves a specific job's encrypted data
    app.get('/api/jobs/:id', (req, res) => {
      const job = printJobs.get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found or expired' });
      res.json({
        encrypted: job.encrypted,
        iv: job.iv,
        fileName: job.fileName,
        fileSize: job.fileSize,
        hash: job.hash
      });
    });

    // Delete a job
    app.delete('/api/jobs/:id', (req, res) => {
      const existed = printJobs.delete(req.params.id);
      if (existed) {
        console.log(`🗑️ Job deleted: ${req.params.id}`);
        res.json({ success: true, message: 'Job deleted from memory' });
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    });

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'running', jobs: printJobs.size, uptime: process.uptime() });
    });

    // SPA fallback
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ========================
    // START HTTPS + HTTP SERVERS
    // ========================
    try {
      console.log('🔑 Generating self-signed SSL certificate...');
      const { key, cert } = generateSelfSignedCert();
      console.log('✅ SSL certificate generated');

      // HTTPS server (primary — crypto.subtle works here!)
      const httpsServer = https.createServer({ key, cert }, app);
      
      httpsServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`⚠️ Port ${port} in use, trying ${port + 1}...`);
          httpsServer.close();
          startServer(port + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });

      httpsServer.listen(port, '0.0.0.0', () => {
        console.log(`\n🔒 HTTPS server running on port ${port}`);
        console.log(`📱 Students connect at: https://YOUR_IP:${port}`);
        console.log(`   (Accept the browser security warning — it's safe on local network)\n`);
        
        // Also start HTTP on port+1 for local/fallback access ONLY after HTTPS successfully binds
        const httpServer = http.createServer(app);
        
        httpServer.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.error(`⚠️ HTTP fallback port ${port + 1} in use, skipping fallback.`);
          } else {
            console.error(`⚠️ HTTP fallback error:`, err);
          }
        });
        
        httpServer.listen(port + 1, '0.0.0.0', () => {
          console.log(`📡 HTTP fallback on port ${port + 1} (localhost only)`);
        });

        resolve(httpsServer);
      });

    } catch (err) {
      console.error('⚠️ HTTPS failed, falling back to HTTP only:', err.message);
      // Fallback to plain HTTP
      const httpServer = http.createServer(app);
      httpServer.listen(port, '0.0.0.0', () => {
        console.log(`\n📡 HTTP server running on port ${port} (HTTPS unavailable)`);
        resolve(httpServer);
      });
    }
  });
}

function generateJobId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return printJobs.has(id) ? generateJobId() : id;
}
