import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/protect.js';

const router = Router();

router.get('/me', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        fcmToken: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('GET /api/user/me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/token', protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { fcmToken: token },
    });

    res.json({ message: 'FCM token saved' });
  } catch (err) {
    console.error('POST /api/notifications/token error:', err.message);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

export default router;
