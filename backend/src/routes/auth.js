const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

// Generic register (for seeding users/shops)
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name, shopName } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role, name, shopName });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name, shopName: user.shopName }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
router.post('/user', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'user' });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Shop login
router.post('/shop', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'shop' });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, shopName: user.shopName }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


