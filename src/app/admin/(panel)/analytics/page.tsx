import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { coreKpis, rangeForPreset, pctChange, dailySeries, PAID_STATUSES } from "@/lib/admin/metrics";
import KpiCard from "@/components/admin/KpiCard";
import RangePicker from "@/components/admin/RangePicker";
import RevenueChart from "@/components/admin/RevenueChart";

export const metadata = { title: "Analytics · Admin" };

export default async function AnalyticsOverview({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const preset = sp.range ?? "30d";
  const { current, previous, label } = rangeForPreset(preset);

  const [kpis, prev, series, topProducts, byCountry, bySource, byDevice] = await Promise.all([
    coreKpis(current),
    coreKpis(previous),
    dailySeries(current),
    db.orderItem.groupBy({
      by: ["productId", "name"],
      where: {
        order: { status: { in: [...PAID_STATUSES] as never[] }, createdAt: { gte: current.from, lt: current.to } },
      },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 6,
    }),
    db.analyticsEvent.groupBy({
      by: ["country"],
      where: { createdAt: { gte: current.from, lt: current.to }, type: "page_view" },
      _count: true,
      orderBy: { _count: { country: "desc" } },
      take: 6,
    }),
    db.order.groupBy({
      by: ["utmSource"],
      where: { status: { in: [...PAID_STATUSES] as never[] }, createdAt: { gte: current.from, lt: current.to } },
      _count: true,
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 6,
    }),
    db.analyticsEvent.groupBy({
      by: ["device"],
      where: { createdAt: { gte: current.from, lt: current.to }, type: "page_view" },
      _count: true,
    }),
  ]);

  // revenue per top product = sum(price * qty) approximated via avg — compute precisely
  const productRevenue = await db.$queryRaw<{ productId: string; revenue: bigint }[]>`
    SELECT oi."productId", SUM(oi.price * oi.quantity)::bigint AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status::text = ANY(${[...PAID_STATUSES]})
      AND o."createdAt" >= ${current.from} AND o."createdAt" < ${current.to}
      AND oi."productId" IS NOT NULL
    GROUP BY oi."productId"`;
  const revMap = new Map(productRevenue.map((r) => [r.productId, Number(r.revenue)]));

  const deviceTotal = byDevice.reduce((s, d) => s + d._count, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Analytics</h1>
          <p className="text-xs text-ink-400">{label} vs previous period</p>
        </div>
        <RangePicker basePath="/admin/analytics" active={preset} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Revenue" value={formatINR(kpis.revenue)} change={pctChange(kpis.revenue, prev.revenue)} />
        <KpiCard label="Orders" value={String(kpis.orders)} change={pctChange(kpis.orders, prev.orders)} />
        <KpiCard label="Visitors" value={kpis.visitors.toLocaleString("en-IN")} change={pctChange(kpis.visitors, prev.visitors)} />
        <KpiCard label="Conversion" value={`${kpis.conversion.toFixed(2)}%`} change={pctChange(kpis.conversion, prev.conversion)} />
        <KpiCard label="Avg order value" value={formatINR(kpis.aov)} change={pctChange(kpis.aov, prev.aov)} />
        <KpiCard label="Units sold" value={String(kpis.units)} change={pctChange(kpis.units, prev.units)} />
        <KpiCard label="Product views" value={kpis.productViews.toLocaleString("en-IN")} change={pctChange(kpis.productViews, prev.productViews)} />
        <KpiCard label="Add to carts" value={kpis.addToCarts.toLocaleString("en-IN")} change={pctChange(kpis.addToCarts, prev.addToCarts)} />
      </div>

      <section className="mt-6 border border-cream-300 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Revenue over time</h2>
        <RevenueChart data={series} />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="border border-cream-300 bg-white">
          <h2 className="border-b border-cream-200 px-5 py-3 text-sm font-semibold uppercase tracking-wider">
            Top products
          </h2>
          <ul className="divide-y divide-cream-200">
            {topProducts.map((p) => (
              <li key={p.productId ?? p.name} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                <span className="min-w-0 truncate">{p.name}</span>
                <span className="shrink-0 text-right">
                  <span className="font-semibold">{formatINR(revMap.get(p.productId ?? "") ?? 0)}</span>
                  <span className="ml-2 text-xs text-ink-400">{p._sum.quantity} sold</span>
                </span>
              </li>
            ))}
            {topProducts.length === 0 && <li className="px-5 py-8 text-center text-sm text-ink-400">No sales yet.</li>}
          </ul>
        </section>

        <section className="border border-cream-300 bg-white">
          <h2 className="border-b border-cream-200 px-5 py-3 text-sm font-semibold uppercase tracking-wider">
            Revenue by source
          </h2>
          <ul className="divide-y divide-cream-200">
            {bySource.map((s) => (
              <li key={s.utmSource ?? "direct"} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="capitalize">{s.utmSource ?? "Direct / unknown"}</span>
                <span>
                  <span className="font-semibold">{formatINR(s._sum.total ?? 0)}</span>
                  <span className="ml-2 text-xs text-ink-400">{s._count} orders</span>
                </span>
              </li>
            ))}
            {bySource.length === 0 && <li className="px-5 py-8 text-center text-sm text-ink-400">No attributed orders yet.</li>}
          </ul>
        </section>

        <section className="border border-cream-300 bg-white">
          <h2 className="border-b border-cream-200 px-5 py-3 text-sm font-semibold uppercase tracking-wider">
            Traffic
          </h2>
          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">By device</p>
            <ul className="mt-1.5 space-y-1.5">
              {byDevice.map((d) => (
                <li key={d.device ?? "unknown"} className="text-sm">
                  <div className="flex justify-between">
                    <span className="capitalize">{d.device ?? "Unknown"}</span>
                    <span className="text-ink-400">
                      {deviceTotal > 0 ? Math.round((d._count / deviceTotal) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded-full bg-cream-200">
                    <div
                      className="h-full rounded-full bg-terra-500"
                      style={{ width: `${deviceTotal > 0 ? (d._count / deviceTotal) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
              {byDevice.length === 0 && <li className="text-sm text-ink-400">No traffic yet.</li>}
            </ul>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-400">By country</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {byCountry.map((c) => (
                <li key={c.country ?? "unknown"} className="flex justify-between">
                  <span>{c.country ?? "Unknown"}</span>
                  <span className="text-ink-400">{c._count} views</span>
                </li>
              ))}
              {byCountry.length === 0 && (
                <li className="text-ink-400">Country data appears when deployed behind a CDN/proxy.</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
