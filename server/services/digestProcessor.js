import prisma from '../lib/prisma.js';
import { formatDisplayDate } from '../lib/utils.js';
import { fetchEmails } from './gmail.js';
// Swapped Gemini for Mistral
import { analyzeEmailWithMistral } from './mistral.js'; 
import { sendUrgentNotification } from './fcm.js';

// Helper utility for safety pauses
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildPeriodMeta(targetDate) {
  if (targetDate) {
    return {
      type: 'date',
      targetDate,
      periodLabel: formatDisplayDate(targetDate),
    };
  }

  return {
    type: 'last24h',
    targetDate: null,
    periodLabel: 'Last 24 hours',
  };
}

export async function processUserDigest(userId, targetDate = null) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const period = buildPeriodMeta(targetDate);
  const emails = await fetchEmails(user.googleRefreshToken, targetDate);
  let processedCount = 0;
  let urgentCount = 0;
  let skippedAlreadyProcessed = 0;

  for (const email of emails) {
    try {
      const existing = await prisma.emailSummary.findUnique({
        where: { gmailMessageId: email.gmailMessageId },
      });

      if (existing) {
        skippedAlreadyProcessed += 1;
        continue;
      }

      // Format the email data into a single text block for Mistral to analyze
      const emailContext = `From: ${email.senderName} <${email.senderEmail}>\nSubject: ${email.subject}\nBody:\n${email.bodyRaw}`;
      
      const aiResult = await analyzeEmailWithMistral(emailContext);
      
      const summary = await prisma.emailSummary.create({
        data: {
          userId: user.id,
          gmailMessageId: email.gmailMessageId,
          senderName: email.senderName,
          senderEmail: email.senderEmail,
          subject: email.subject,
          receivedAt: email.receivedAt,
          rawSnippet: email.rawSnippet,
          aiSummary: aiResult.summary,
          urgencyScore: aiResult.urgencyScore,
          // Fallback: Use the summary as the urgency reason if Mistral didn't return one
          urgencyReason: aiResult.urgencyReason || aiResult.summary, 
        },
      });

      processedCount += 1;

      if (aiResult.urgencyScore >= 8 && user.fcmToken) {
        const sent = await sendUrgentNotification(user.fcmToken, {
          senderName: email.senderName,
          urgencyReason: aiResult.urgencyReason || aiResult.summary,
          emailId: summary.id,
          subject: email.subject,
        });

        if (sent) {
          await prisma.emailSummary.update({
            where: { id: summary.id },
            data: { notificationSent: true },
          });
          urgentCount += 1;
        }
      } else if (aiResult.urgencyScore >= 8) {
        urgentCount += 1;
      }
    } catch (err) {
      console.error(
        `Failed to process email ${email.gmailMessageId} for user ${userId}:`,
        err.message
      );
      // Safety Net: If a hard error occurs, pause for 5 seconds to cool down the API 
      // before attempting the next email in the loop.
      await sleep(5000);
    }
  }

  console.log(
    `[Gmail] Messages after filtering out already-processed: ${emails.length - skippedAlreadyProcessed}`
  );

  if (processedCount > 0) {
    await prisma.digestLog.create({
      data: {
        userId: user.id,
        digestDate: new Date(),
        totalEmails: processedCount,
        urgentCount,
      },
    });
  }

  return {
    processedCount,
    urgentCount,
    totalFetched: emails.length,
    ...period,
  };
}

export async function processAllUsersDigest() {
  const users = await prisma.user.findMany();
  const results = [];

  for (const user of users) {
    try {
      const result = await processUserDigest(user.id);
      results.push({ userId: user.id, email: user.email, ...result, success: true });
    } catch (err) {
      console.error(`Digest failed for user ${user.email}:`, err.message);
      results.push({ userId: user.id, email: user.email, success: false, error: err.message });
    }
  }

  return results;
}