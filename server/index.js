import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import digestRoutes from './routes/digest.js';
import userRoutes from './routes/user.js';

const app = express();
const PORT = process.env.PORT || 3001;

const requiredEnv = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'CLIENT_URL',
  'GEMINI_API_KEY',
  'CRON_SECRET',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set`);
  }
}

const redirectUri =
  process.env.GOOGLE_REDIRECT_URI?.trim() ||
  'http://localhost:3001/auth/google/callback';
console.log(`Google OAuth redirect URI: ${redirectUri}`);
console.log(
  `Google OAuth client configured: ${process.env.GOOGLE_CLIENT_ID ? 'yes' : 'no'}`
);
console.log(
  `Gemini model: ${process.env.GEMINI_MODEL || 'gemini-2.0-flash'} (API ${process.env.GEMINI_API_VERSION || 'v1beta'})`
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', userRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`Database connected (${userCount} user(s) in DB)`);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    if (err.code) console.error('  Prisma error code:', err.code);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
