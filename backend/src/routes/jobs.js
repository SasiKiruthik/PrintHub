const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const PrintEvent = require('../models/PrintEvent');
const auth = require('../middleware/auth');

const router = express.Router();

// Ensure encrypted upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'encrypted_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage because file is already encrypted
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}.enc`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

const tokenAttemptLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many token attempts, try again later'
});

function generateToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Upload encrypted file (user)
router.post(
  '/upload',
  auth('user'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { file } = req;
      const { pageCount, printType, watermarkText } = req.body;
      if (!file) return res.status(400).json({ message: 'File is required' });

      const token = generateToken();
      const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const job = await Job.create({
        owner: req.user.id,
        token,
        tokenExpiresAt,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        pageCount: pageCount ? Number(pageCount) : undefined,
        printType: ['color', 'bw'].includes(printType) ? printType : 'bw',
        watermarkText,
        encryptedPath: file.path
      });

      res.status(201).json({
        id: job._id,
        token: job.token,
        tokenExpiresAt: job.tokenExpiresAt,
        fileName: job.fileName,
        pageCount: job.pageCount,
        status: job.status
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// User jobs listing / status
router.get('/user', auth('user'), async (req, res) => {
  try {
    const jobs = await Job.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User delete job
router.delete('/delete/:id', auth('user'), async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job.status = 'deleted';
    const encryptedPath = job.encryptedPath;
    await job.deleteOne();
    if (encryptedPath) {
      fs.unlink(encryptedPath, () => {});
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Shop: verify token -> metadata only
router.post('/token/verify', auth('shop'), tokenAttemptLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const job = await Job.findOne({ token, status: { $in: ['pending', 'printing'] } });
    if (!job) return res.status(404).json({ message: 'Invalid or expired token' });
    if (job.tokenExpiresAt < new Date()) {
      job.status = 'expired';
      await job.save();
      return res.status(410).json({ message: 'Token expired' });
    }

    res.json({
      id: job._id,
      token: job.token,
      fileName: job.fileName,
      size: job.size,
      pageCount: job.pageCount,
      printType: job.printType,
      watermarkText: job.watermarkText,
      status: job.status,
      createdAt: job.createdAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Shop dashboard list (simple: all pending jobs)
router.get('/shop', auth('shop'), async (req, res) => {
  try {
    const jobs = await Job.find({ status: { $in: ['pending', 'printing'] } }).sort({
      createdAt: -1
    });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Shop print: stream encrypted data + mark printed + delete
router.post('/print', auth('shop'), tokenAttemptLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const job = await Job.findOne({ token, status: { $in: ['pending', 'printing'] } });
    if (!job) return res.status(404).json({ message: 'Invalid or expired token' });
    if (job.tokenExpiresAt < new Date()) {
      job.status = 'expired';
      await job.save();
      return res.status(410).json({ message: 'Token expired' });
    }

    job.status = 'printed';
    job.printedAt = new Date();
    job.used = true;
    await job.save();

    await PrintEvent.create({
      job: job._id,
      shop: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // read encrypted file from disk and return as base64
    fs.readFile(job.encryptedPath, (err, data) => {
      if (err) {
        console.error('Error reading encrypted file from disk', err);
        return res.status(500).json({ message: 'Server error' });
      }
      const payload = {
        encryptedData: data.toString('base64'),
        mimeType: job.mimeType,
        fileName: job.fileName,
        watermarkText: job.watermarkText
      };

      res.json(payload);

      // secure delete after small delay (delete DB record + file)
      setTimeout(async () => {
        try {
          await Job.deleteOne({ _id: job._id });
          fs.unlink(job.encryptedPath, () => {});
        } catch (e) {
          console.error('Error deleting job or file', e);
        }
      }, 1000);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


