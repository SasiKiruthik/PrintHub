const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'shop'], required: true },
    name: { type: String },
    shopName: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);


