require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const httpsEnforce = require('./middleware/httpsEnforce');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');

const app = express();

app.use(httpsEnforce);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', jobRoutes);

const PORT = process.env.PORT || 4000;

async function seedDemoShops() {
  try {
    const count = await User.countDocuments({ role: 'shop' });
    if (count === 0) {
      const shops = [
        {
          email: 'shop1@demo.com',
          password: 'Shop@1234',
          shopName: 'Demo Print Shop 1'
        },
        {
          email: 'shop2@demo.com',
          password: 'Shop@1234',
          shopName: 'Demo Print Shop 2'
        }
      ];
      for (const s of shops) {
        const passwordHash = await bcrypt.hash(s.password, 10);
        await User.create({
          email: s.email,
          passwordHash,
          role: 'shop',
          shopName: s.shopName
        });
      }
      console.log('Seeded demo shop accounts:');
      shops.forEach((s) => {
        console.log(`  Email: ${s.email}  Password: ${s.password}`);
      });
    } else {
      console.log(`Shop accounts already exist (${count}). No seeding needed.`);
    }
  } catch (err) {
    console.error('Error seeding demo shops', err);
  }
}

connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_printhub').then(() => {
  seedDemoShops().finally(() => {
    app.listen(PORT, () => {
      console.log(`Secure PrintHub backend running on port ${PORT}`);
    });
  });
});


