const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    tokenExpiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    pageCount: { type: Number },
    printType: { type: String, enum: ['color', 'bw'], default: 'bw' },
    watermarkText: { type: String },
    encryptedPath: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'printing', 'printed', 'deleted', 'expired'],
      default: 'pending'
    },
    printedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);


