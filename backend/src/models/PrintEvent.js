const mongoose = require('mongoose');

const printEventSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PrintEvent', printEventSchema);


