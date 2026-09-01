import Link from "next/link";
import { db } from "@/lib/db";
import LeadRow from "@/components/admin/LeadRow";

export const metadata = { title: "Leads · Admin" };

const TABS = ["", "NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP", "CONVERTED", "LOST"] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;

  const [leads, counts] = await Promise.all([
    db.lead.findMany({
      where: sp.status ? { status: sp.status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    db.lead.groupBy({ by: ["status"], _count: true }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const total = counts.reduce((s, c) => s + c._count, 0);
  const converted = countMap.CONVERTED ?? 0;

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl">Leads</h1>
      <p className="mb-5 text-sm text-ink-400">
        {total} total · {countMap.NEW ?? 0} new · {converted} converted
        {total > 0 && ` (${((converted / total) * 100).toFixed(1)}% conversion)`}
      </p>

      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t || "all"}
            href={t ? `/admin/leads?status=${t}` : "/admin/leads"}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
              (sp.status ?? "") === t
                ? "bg-ink-800 text-white"
                : "border border-cream-300 bg-white text-ink-600"
            }`}
          >
            {t ? t.replaceAll("_", " ") : "All"}
            {t && countMap[t] ? ` (${countMap[t]})` : ""}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Message / interest</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={{
                  id: lead.id,
                  name: lead.name,
                  email: lead.email,
                  phone: lead.phone,
                  source: lead.source,
                  message: lead.message,
                  productInterest: lead.productInterest,
                  status: lead.status,
                  createdAt: lead.createdAt.toISOString(),
                }}
              />
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ink-400">
                  No leads yet. Newsletter signups and contact-form messages appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
