import { google } from 'googleapis';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  GMAIL_READONLY_SCOPE,
];

const SKIP_LABELS = new Set(['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL']);

function stripEnv(value) {
  if (!value) return value;
  return value.trim().replace(/^["']|["']$/g, '');
}

function createOAuthClient() {
  const clientId = stripEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = stripEnv(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri =
    stripEnv(process.env.GOOGLE_REDIRECT_URI) ||
    'http://localhost:3001/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in server/.env'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl() {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: OAUTH_SCOPES,
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

function getGmailClient(refreshToken) {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function parseSender(fromHeader) {
  if (!fromHeader) {
    return { senderName: 'Unknown', senderEmail: 'unknown@unknown.com' };
  }

  const match = fromHeader.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    const name = (match[1] || match[2].split('@')[0]).trim();
    const email = match[2].trim();
    return { senderName: name || email, senderEmail: email };
  }

  return { senderName: fromHeader, senderEmail: fromHeader };
}

function getHeader(headers, name) {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function extractPlainTextBody(payload) {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plainPart?.body?.data) {
      return Buffer.from(plainPart.body.data, 'base64').toString('utf-8');
    }

    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
    }

    for (const part of payload.parts) {
      const nested = extractPlainTextBody(part);
      if (nested) return nested;
    }
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return '';
}

function shouldProcessMessage(labelIds = []) {
  // Skip only Promotions and Social
  if (labelIds.some((label) => SKIP_LABELS.has(label))) {
    return false;
  }
  // Accept everything that isn't explicitly skipped
  return true;
}

function buildGmailQuery(targetDate) {
  if (!targetDate) {
    // Use IST (UTC+5:30) — subtract 5.5 hours from now to get IST midnight today
    const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const todayIST = `${nowIST.getUTCFullYear()}/${nowIST.getUTCMonth() + 1}/${nowIST.getUTCDate()}`;
    const yesterdayIST = new Date(nowIST);
    yesterdayIST.setUTCDate(yesterdayIST.getUTCDate() - 1);
    const yesterdayStr = `${yesterdayIST.getUTCFullYear()}/${yesterdayIST.getUTCMonth() + 1}/${yesterdayIST.getUTCDate()}`;
    return `after:${yesterdayStr}`;
  }

  const [year, month, day] = targetDate.split('-').map(Number);
  const after = `${year}/${month}/${day}`;
  const nextDay = new Date(year, month - 1, day + 1);
  const before = `${nextDay.getFullYear()}/${nextDay.getMonth() + 1}/${nextDay.getDate()}`;
  return `after:${after} before:${before}`;
}

export async function fetchEmails(refreshToken, targetDate = null) {
  const gmail = getGmailClient(refreshToken);
  const query = buildGmailQuery(targetDate);
  console.log(`[Gmail] Query (q): ${query}`);

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  });

  const messages = listResponse.data.messages || [];
  console.log(`[Gmail] Messages returned by API: ${messages.length}`);
  const emails = [];

  for (const message of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const labelIds = detail.data.labelIds || [];
      if (!shouldProcessMessage(labelIds)) {
        continue;
      }

      const headers = detail.data.payload?.headers || [];
      const fromHeader = getHeader(headers, 'From');
      const subject = getHeader(headers, 'Subject') || '(No subject)';
      const dateHeader = getHeader(headers, 'Date');
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

      const bodyRaw = extractPlainTextBody(detail.data.payload);
      const snippet = detail.data.snippet || bodyRaw.slice(0, 200);
      const { senderName, senderEmail } = parseSender(fromHeader);

      emails.push({
        gmailMessageId: message.id,
        senderName,
        senderEmail,
        subject,
        receivedAt,
        rawSnippet: snippet,
        bodyRaw,
      });
    } catch (err) {
      console.error(`Failed to fetch Gmail message ${message.id}:`, err.message);
    }
  }

  return emails;
}

/** @deprecated Use fetchEmails(refreshToken) — kept for compatibility */
export async function fetchRecentEmails(refreshToken) {
  return fetchEmails(refreshToken, null);
}

export async function getGoogleUserProfile(tokens) {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(tokens);

  if (!tokens.access_token) {
    throw new Error('No access token received from Google');
  }

  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    if (data.email) {
      return data;
    }
  } catch (err) {
    console.warn('userinfo.get failed, falling back to Gmail profile:', err.message);
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const { data } = await gmail.users.getProfile({ userId: 'me' });

  return {
    email: data.emailAddress,
    name: data.emailAddress?.split('@')[0] || data.emailAddress,
  };
}