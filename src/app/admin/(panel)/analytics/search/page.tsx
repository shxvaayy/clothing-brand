import { db } from "@/lib/db";
import { rangeForPreset } from "@/lib/admin/metrics";
import RangePicker from "@/components/admin/RangePicker";

export const metadata = { title: "Search Analytics · Admin" };

export default async function SearchAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const preset = sp.range ?? "30d";
  const { current, label } = rangeForPreset(preset);

  const queries = await db.analyticsEvent.groupBy({
    by: ["query"],
    where: { type: "search", createdAt: { gte: current.from, lt: current.to }, query: { not: null } },
    _count: true,
    orderBy: { _count: { query: "desc" } },
    take: 50,
  });

  // check which queries currently return zero results
  const withResults = await Promise.all(
    queries.map(async (q) => {
      const count = await db.product.count({
        where: {
          status: "PUBLISHED",
          OR: [
            { name: { contains: q.query!, mode: "insensitive" } },
            { description: { contains: q.query!, mode: "insensitive" } },
            { tags: { hasSome: q.query!.toLowerCase().split(/\s+/) } },
          ],
        },
      });
      return { query: q.query!, searches: q._count, results: count };
    })
  );

  const noResults = withResults.filter((q) => q.results === 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Search analytics</h1>
          <p className="text-xs text-ink-400">{label} — what customers are looking for</p>
        </div>
        <RangePicker basePath="/admin/analytics/search" active={preset} />
      </div>

      {noResults.length > 0 && (
        <div className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <strong>Product opportunities:</strong> customers searched for{" "}
          {noResults.slice(0, 5).map((q) => `“${q.query}”`).join(", ")} but found nothing.
        </div>
      )}

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Search query</th>
              <th className="px-4 py-3">Times searched</th>
              <th className="px-4 py-3">Matching products</th>
            </tr>
          </thead>
          <tbody>
            {withResults.map((q) => (
              <tr key={q.query} className="border-b border-cream-200 last:border-0">
                <td className="px-4 py-2.5 font-medium">{q.query}</td>
                <td className="px-4 py-2.5">{q.searches}</td>
                <td className="px-4 py-2.5">
                  {q.results === 0 ? (
                    <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-red-600">
                      No results
                    </span>
                  ) : (
                    q.results
                  )}
                </td>
              </tr>
            ))}
            {withResults.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-ink-400">
                  No searches recorded in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
