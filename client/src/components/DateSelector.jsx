export default function DateSelector({ selectedDate, onChange, maxDate }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="date-picker" className="text-sm font-medium text-slate-700">
        Digest date:
      </label>
      <input
        id="date-picker"
        type="date"
        value={selectedDate || ''}
        max={maxDate}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`text-sm font-medium ${
          !selectedDate
            ? 'text-brand-700 underline'
            : 'text-brand-600 hover:text-brand-700'
        }`}
      >
        Last 24 hours
      </button>
    </div>
  );
}
