export default function KpiCard({
  label,
  value,
  change,
  invert,
}: {
  label: string;
  value: string;
  change?: number | null;
  invert?: boolean; // for metrics where down = good (e.g. cancellations)
}) {
  const good = change != null && (invert ? change < 0 : change > 0);
  const bad = change != null && (invert ? change > 0 : change < 0);
  return (
    <div className="border border-cream-300 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-ink-900 sm:text-2xl">{value}</p>
      {change !== undefined && (
        <p
          className={`mt-1 text-xs font-medium ${
            good ? "text-green-700" : bad ? "text-red-600" : "text-ink-400"
          }`}
        >
          {change == null
            ? "— vs previous period"
            : `${change > 0 ? "↑" : change < 0 ? "↓" : "•"} ${Math.abs(change).toFixed(1)}% vs previous`}
        </p>
      )}
    </div>
  );
}
