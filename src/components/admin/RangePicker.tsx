import Link from "next/link";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "90d", label: "90 days" },
];

export default function RangePicker({ basePath, active }: { basePath: string; active: string }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto">
      {PRESETS.map((p) => (
        <Link
          key={p.key}
          href={p.key === "30d" ? basePath : `${basePath}?range=${p.key}`}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
            active === p.key ? "bg-ink-800 text-white" : "border border-cream-300 bg-white text-ink-600"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
