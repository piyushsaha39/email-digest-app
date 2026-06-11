import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserProfile,
} from '../services/gmail.js';

const router = Router();

router.get('/google', (_req, res) => {
  const url = getGoogleAuthUrl();
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}/?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/?error=no_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return res.redirect(`${process.env.CLIENT_URL}/?error=no_access_token`);
    }

    const profile = await getGoogleUserProfile(tokens);

    if (!profile.email) {
      return res.redirect(`${process.env.CLIENT_URL}/?error=no_email`);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!tokens.refresh_token && !existingUser) {
      return res.redirect(`${process.env.CLIENT_URL}/?error=no_refresh_token`);
    }

    console.log(`OAuth callback: upserting user ${profile.email}`);

    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name || profile.email,
        ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
      },
      create: {
        email: profile.email,
        name: profile.name || profile.email,
        googleRefreshToken: tokens.refresh_token,
      },
    });

    console.log(`OAuth callback: user saved (id=${user.id})`);

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured in server/.env');
    }

    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    console.log(`OAuth callback: redirecting to dashboard for ${profile.email}`);
    res.redirect(`${clientUrl}/dashboard?token=${sessionToken}`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    if (err.code) console.error('  Prisma error code:', err.code);
    if (err.meta) console.error('  Prisma meta:', JSON.stringify(err.meta));
    console.error(err.stack);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?error=auth_failed`);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
