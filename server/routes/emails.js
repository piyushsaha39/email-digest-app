import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { protect } from '../middleware/protect.js';
import { startOfDay, endOfDay } from '../lib/utils.js';

const router = Router();

router.get('/recent', protect, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const emails = await prisma.emailSummary.findMany({
      where: {
        userId: req.user.id,
        receivedAt: { gte: since },
      },
      orderBy: [{ urgencyScore: 'desc' }, { receivedAt: 'desc' }],
    });

    res.json({ emails, periodLabel: 'Last 24 hours' });
  } catch (err) {
    console.error('GET /api/emails/recent error:', err.message);
    res.status(500).json({ error: 'Failed to fetch recent emails' });
  }
});

router.get('/today', protect, async (req, res) => {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const emails = await prisma.emailSummary.findMany({
      where: {
        userId: req.user.id,
        receivedAt: { gte: todayStart, lte: todayEnd },
      },
      orderBy: [{ urgencyScore: 'desc' }, { receivedAt: 'desc' }],
    });

    res.json({ emails });
  } catch (err) {
    console.error('GET /api/emails/today error:', err.message);
    res.status(500).json({ error: 'Failed to fetch today\'s emails' });
  }
});

router.get('/date/:date', protect, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const emails = await prisma.emailSummary.findMany({
      where: {
        userId: req.user.id,
        receivedAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: [{ urgencyScore: 'desc' }, { receivedAt: 'desc' }],
    });

    const digestLog = await prisma.digestLog.findFirst({
      where: {
        userId: req.user.id,
        digestDate: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      emails,
      digestLog,
      periodLabel: targetDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  } catch (err) {
    console.error('GET /api/emails/date error:', err.message);
    res.status(500).json({ error: 'Failed to fetch emails for date' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const email = await prisma.emailSummary.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({ email });
  } catch (err) {
    console.error('GET /api/emails/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

router.patch('/:id/read', protect, async (req, res) => {
  try {
    const existing = await prisma.emailSummary.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = await prisma.emailSummary.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ email });
  } catch (err) {
    console.error('PATCH /api/emails/:id/read error:', err.message);
    res.status(500).json({ error: 'Failed to mark email as read' });
  }
});

export default router;
