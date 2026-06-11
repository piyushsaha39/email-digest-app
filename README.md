# AI-Powered Email Digest & Urgency Alert

A full-stack web app that connects to Gmail, summarizes emails with Gemini AI, rates urgency, stores results in Supabase PostgreSQL, and sends FCM push notifications for urgent messages.

**100% free-tier stack:** React + Tailwind (Vercel/Netlify), Express (Render), Supabase, Gmail API, Gemini 1.5 Flash, Firebase Cloud Messaging.

## Project Structure

```
email-digest-app/
├── client/          # React frontend (Vite + Tailwind)
├── server/          # Express API + Prisma
├── .env.example     # Environment variable template
└── README.md
```

## Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) free project (PostgreSQL)
- [Google Cloud](https://console.cloud.google.com) project with Gmail API + OAuth credentials
- [Google AI Studio](https://aistudio.google.com) API key for Gemini
- [Firebase](https://firebase.google.com) project for FCM (optional but recommended)

## Local Setup

### 1. Clone and install

```bash
npm run install:all
```

### 2. Configure environment

Copy variables from `.env.example`:

```bash
# Server
cp .env.example server/.env
# Edit server/.env with your values

# Client
cp .env.example client/.env
# Edit client/.env with VITE_* values
```

### 3. Database

Push the Prisma schema to Supabase:

```bash
npm run db:generate
npm run db:push
```

### 4. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Library → enable **Gmail API**.
2. Create OAuth 2.0 credentials (Web application).
3. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
4. Copy Client ID and Secret to `server/.env`.

### 5. Run locally

Terminal 1 — backend:

```bash
npm run dev:server
```

Terminal 2 — frontend:

```bash
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173), click **Connect Gmail**, and authorize read-only access.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Redirect to Google OAuth |
| GET | `/auth/google/callback` | OAuth callback, issues JWT |
| POST | `/auth/logout` | Logout |
| GET | `/api/user/me` | Current user profile |
| GET | `/api/emails/today` | Today's summarized emails |
| GET | `/api/emails/date/:date` | Emails for a specific date |
| GET | `/api/emails/:id` | Single email detail |
| PATCH | `/api/emails/:id/read` | Mark email as read |
| POST | `/api/digest/cron-trigger` | Cron endpoint (requires `X-Cron-Secret` header) |
| POST | `/api/digest/run-manual` | Manual digest (3/hour limit) |
| POST | `/api/notifications/token` | Save FCM device token |

## Cron Scheduler (Render Free Tier)

Render free services sleep after inactivity. Use an external uptime monitor to ping the digest endpoint daily:

- **URL:** `POST https://your-server.onrender.com/api/digest/cron-trigger`
- **Header:** `X-Cron-Secret: your-cron-secret`
- **Schedule:** Once daily (e.g., 8:00 AM)

Free options: [UptimeRobot](https://uptimerobot.com), [cron-job.org](https://cron-job.org), or GitHub Actions scheduled workflow.

## Deployment

### Backend (Render)

1. Create a **Web Service** connected to your repo, root directory: `server`.
2. Build command: `npm install && npx prisma generate && npx prisma db push`
3. Start command: `npm start`
4. Add all `server/.env` variables in Render dashboard.
5. Set `GOOGLE_REDIRECT_URI` to `https://your-app.onrender.com/auth/google/callback`
6. Set `CLIENT_URL` to your frontend URL.

### Frontend (Vercel / Netlify)

1. Root directory: `client`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add all `VITE_*` environment variables.
5. Set `VITE_API_URL` to your Render backend URL.

### Firebase Service Worker

The `prebuild` script auto-generates `public/firebase-config.js` from `client/.env`. Ensure all `VITE_FIREBASE_*` vars are set before building.

## Features

- **Gmail OAuth 2.0** with read-only scope
- **Category filtering** — skips Promotions/Social, processes Primary & Updates
- **Gemini 3.5 Flash** summarization with 4.5s rate-limit delay (15 RPM free tier)
- **Urgency scoring** 1–10 with instant FCM push for scores ≥ 8
- **Daily digest dashboard** with date picker and metrics
- **Graceful error handling** — single email failures don't halt the pipeline
- **65s Axios timeout** for Render cold-start tolerance

## License

MIT
