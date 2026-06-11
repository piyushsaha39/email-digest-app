import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmailCard from '../components/EmailCard.jsx';
import MetricsSummary from '../components/MetricsSummary.jsx';
import DateSelector from '../components/DateSelector.jsx';
import {
  getCurrentUser,
  getRecentEmails,
  getEmailsByDate,
  runDigest,
  logout,
  setToken,
  getToken,
} from '../services/api.js';
import { initFcm } from '../services/fcmInit.js';

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [emails, setEmails] = useState([]);
  const [digestLog, setDigestLog] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [periodLabel, setPeriodLabel] = useState('Last 24 hours');
  const [loading, setLoading] = useState(true);
  const [digestRunning, setDigestRunning] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const loadEmails = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      if (!date) {
        const data = await getRecentEmails();
        setEmails(data.emails);
        setDigestLog(null);
        setPeriodLabel(data.periodLabel || 'Last 24 hours');
      } else {
        const data = await getEmailsByDate(date);
        setEmails(data.emails);
        setDigestLog(data.digestLog);
        setPeriodLabel(data.periodLabel || formatDisplayDate(date));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      searchParams.delete('token');
      setSearchParams(searchParams, { replace: true });
    }

    if (!getToken()) {
      navigate('/', { replace: true });
      return;
    }

    async function init() {
      try {
        const profile = await getCurrentUser();
        setUser(profile);

        await initFcm((payload) => {
          setToast({
            title: payload.notification?.title || 'New notification',
            body: payload.notification?.body || '',
          });
        });
      } catch (err) {
        console.error('Init error:', err);
      }
    }

    init();
  }, [navigate, searchParams, setSearchParams]);

  useEffect(() => {
    loadEmails(selectedDate);
  }, [selectedDate, loadEmails]);

  useEffect(() => {
    const emailId = searchParams.get('email');
    if (emailId) {
      setExpandedId(emailId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleRunDigest() {
    setDigestRunning(true);
    setError(null);
    try {
      const result = await runDigest(selectedDate);
      setPeriodLabel(result.periodLabel || (selectedDate ? formatDisplayDate(selectedDate) : 'Last 24 hours'));
      setToast({
        title: 'Digest complete',
        body: `${result.periodLabel}: processed ${result.processedCount} new email(s), ${result.urgentCount} urgent.`,
      });
      await loadEmails(selectedDate);
    } catch (err) {
      setError(err.response?.data?.error || 'Digest failed');
    } finally {
      setDigestRunning(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  function handleEmailRead(updated) {
    setEmails((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm rounded-xl bg-white border shadow-lg p-4">
          <p className="font-semibold text-slate-900">{toast.title}</p>
          <p className="text-sm text-slate-600 mt-1">{toast.body}</p>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-700">Email Digest</h1>
            {user && (
              <p className="text-sm text-slate-500">
                {user.name || user.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunDigest}
              disabled={digestRunning}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {digestRunning ? 'Running...' : 'Run Digest'}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Email Digest</h2>
            <p className="mt-1 text-sm font-medium text-brand-700">
              Showing: {periodLabel}
            </p>
          </div>
          <DateSelector
            selectedDate={selectedDate}
            onChange={setSelectedDate}
            maxDate={todayString()}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <MetricsSummary emails={emails} digestLog={digestLog} />

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-white border">
            <p className="text-slate-600">No emails found for {periodLabel.toLowerCase()}.</p>
            <p className="text-sm text-slate-500 mt-2">
              Click &quot;Run Digest&quot; to fetch and summarize Gmail messages for this period.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                expanded={expandedId === email.id}
                onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                onRead={handleEmailRead}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
