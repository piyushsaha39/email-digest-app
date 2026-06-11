import { Router } from 'express';
import { protect } from '../middleware/protect.js';
import { isValidDateString } from '../lib/utils.js';
import { processUserDigest, processAllUsersDigest } from '../services/digestProcessor.js';

const router = Router();

const manualRateLimits = new Map();
const MAX_MANUAL_RUNS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

function checkManualRateLimit(userId) {
  const now = Date.now();
  const record = manualRateLimits.get(userId) || { count: 0, windowStart: now };

  if (now - record.windowStart > HOUR_MS) {
    record.count = 0;
    record.windowStart = now;
  }

  if (record.count >= MAX_MANUAL_RUNS_PER_HOUR) {
    return false;
  }

  record.count += 1;
  manualRateLimits.set(userId, record);
  return true;
}

function verifyCronSecret(req, res, next) {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.post('/cron-trigger', verifyCronSecret, async (_req, res) => {
  try {
    const results = await processAllUsersDigest();
    res.json({ message: 'Digest cron completed', results });
  } catch (err) {
    console.error('POST /api/digest/cron-trigger error:', err.message);
    res.status(500).json({ error: 'Cron digest failed' });
  }
});

async function handleRunDigest(req, res) {
  if (!checkManualRateLimit(req.user.id)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Maximum 3 manual runs per hour.',
    });
  }

  const rawTargetDate = req.body?.targetDate;
  const targetDate =
    rawTargetDate && String(rawTargetDate).trim() !== ''
      ? String(rawTargetDate).trim()
      : null;

  if (targetDate && !isValidDateString(targetDate)) {
    return res.status(400).json({
      error: 'Invalid targetDate. Use YYYY-MM-DD format.',
    });
  }

  try {
    const result = await processUserDigest(req.user.id, targetDate);
    res.json({ message: 'Digest completed', ...result });
  } catch (err) {
    console.error('POST /api/digest/run error:', err.message);
    res.status(500).json({ error: 'Digest failed' });
  }
}

router.post('/run', protect, handleRunDigest);
router.post('/run-manual', protect, handleRunDigest);

export default router;
