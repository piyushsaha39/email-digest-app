import { useState } from 'react';
import { markEmailAsRead } from '../services/api.js';

function urgencyColor(score) {
  if (score >= 8) return 'bg-red-100 text-red-800 border-red-200';
  if (score >= 5) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-green-100 text-green-800 border-green-200';
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EmailCard({ email, onRead, expanded, onToggle }) {
  const [marking, setMarking] = useState(false);

  async function handleMarkRead(e) {
    e.stopPropagation();
    if (email.isRead) return;

    setMarking(true);
    try {
      const updated = await markEmailAsRead(email.id);
      onRead(updated);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    } finally {
      setMarking(false);
    }
  }

  return (
    <article
      className={`rounded-xl border bg-white shadow-sm transition hover:shadow-md cursor-pointer ${
        email.isRead ? 'opacity-75' : 'border-brand-200'
      }`}
      onClick={() => onToggle(email.id)}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${urgencyColor(
                  email.urgencyScore
                )}`}
              >
                Urgency {email.urgencyScore}/10
              </span>
              {email.notificationSent && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                  Notified
                </span>
              )}
              {!email.isRead && (
                <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" title="Unread" />
              )}
            </div>
            <h3 className="font-semibold text-slate-900 truncate">{email.subject}</h3>
            <p className="text-sm text-slate-600 mt-0.5">
              {email.senderName} &lt;{email.senderEmail}&gt;
            </p>
          </div>
          <time className="text-xs text-slate-500 whitespace-nowrap">
            {formatTime(email.receivedAt)}
          </time>
        </div>

        <p className="mt-3 text-sm text-slate-700 line-clamp-2">{email.aiSummary}</p>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                AI Summary
              </h4>
              <p className="text-sm text-slate-700 mt-1">{email.aiSummary}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Urgency Reason
              </h4>
              <p className="text-sm text-slate-700 mt-1">{email.urgencyReason}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Snippet
              </h4>
              <p className="text-sm text-slate-600 mt-1">{email.rawSnippet}</p>
            </div>
            {!email.isRead && (
              <button
                onClick={handleMarkRead}
                disabled={marking}
                className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {marking ? 'Marking...' : 'Mark as Read'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
