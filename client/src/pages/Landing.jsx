import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getGoogleAuthUrl, getToken, setToken } from '../services/api.js';

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      navigate('/dashboard', { replace: true });
      return;
    }

    const token = getToken();
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      console.error('Auth error:', error);
    }
  }, [searchParams]);

  function handleConnect() {
    window.location.href = getGoogleAuthUrl();
  }

  const authError = searchParams.get('error');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <span className="text-xl font-bold text-brand-700">Email Digest</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 text-brand-600 mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            AI-Powered Email Digest
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Connect your Gmail to receive daily AI summaries, urgency ratings, and instant
            push alerts for important messages — all on a 100% free-tier stack.
          </p>

          {authError && (
            <div className="mt-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              Authentication failed: {authError.replace(/_/g, ' ')}. Please try again.
            </div>
          )}

          <button
            onClick={handleConnect}
            className="mt-8 inline-flex items-center gap-3 rounded-xl bg-brand-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-brand-700 transition"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Connect Gmail
          </button>

          <ul className="mt-12 grid sm:grid-cols-3 gap-6 text-left">
            {[
              { title: 'Daily Summaries', desc: 'Gemini AI condenses every email into 2-3 sentences.' },
              { title: 'Urgency Scoring', desc: 'Each message rated 1-10 with a clear reason.' },
              { title: 'Push Alerts', desc: 'Urgent emails (8+) trigger instant notifications.' },
            ].map((feature) => (
              <li key={feature.title} className="rounded-xl bg-white p-5 border shadow-sm">
                <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{feature.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
