export default function MetricsSummary({ emails, digestLog }) {
  const total = emails.length;
  const urgent = emails.filter((e) => e.urgencyScore >= 8).length;
  const unread = emails.filter((e) => !e.isRead).length;
  const avgUrgency =
    total > 0
      ? (emails.reduce((sum, e) => sum + e.urgencyScore, 0) / total).toFixed(1)
      : '0';

  const metrics = [
    { label: 'Total Emails', value: total, color: 'bg-brand-50 text-brand-700' },
    { label: 'Urgent (8+)', value: urgent, color: 'bg-red-50 text-red-700' },
    { label: 'Unread', value: unread, color: 'bg-amber-50 text-amber-700' },
    { label: 'Avg Urgency', value: avgUrgency, color: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-xl p-4 ${m.color}`}>
            <p className="text-sm font-medium opacity-80">{m.label}</p>
            <p className="text-3xl font-bold mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {digestLog && (
        <p className="text-sm text-slate-500">
          Last digest run processed {digestLog.totalEmails} email
          {digestLog.totalEmails !== 1 ? 's' : ''} ({digestLog.urgentCount} urgent) at{' '}
          {new Date(digestLog.createdAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
