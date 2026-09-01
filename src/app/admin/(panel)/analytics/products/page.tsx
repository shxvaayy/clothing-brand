import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { rangeForPreset, PAID_STATUSES } from "@/lib/admin/metrics";
import RangePicker from "@/components/admin/RangePicker";

export const metadata = { title: "Product Analytics · Admin" };

export default async function ProductAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const preset = sp.range ?? "30d";
  const { current, label } = rangeForPreset(preset);

  const [views, carts, sales, products] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "product_view", createdAt: { gte: current.from, lt: current.to }, productId: { not: null } },
      _count: true,
    }),
    db.analyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "add_to_cart", createdAt: { gte: current.from, lt: current.to }, productId: { not: null } },
      _count: true,
    }),
    db.$queryRaw<{ productId: string; units: bigint; revenue: bigint }[]>`
      SELECT oi."productId", SUM(oi.quantity)::bigint AS units, SUM(oi.price * oi.quantity)::bigint AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status::text = ANY(${[...PAID_STATUSES]})
        AND o."createdAt" >= ${current.from} AND o."createdAt" < ${current.to}
        AND oi."productId" IS NOT NULL
      GROUP BY oi."productId"`,
    db.product.findMany({ select: { id: true, name: true, status: true } }),
  ]);

  const viewMap = new Map(views.map((v) => [v.productId!, v._count]));
  const cartMap = new Map(carts.map((v) => [v.productId!, v._count]));
  const saleMap = new Map(sales.map((s) => [s.productId, { units: Number(s.units), revenue: Number(s.revenue) }]));

  const rows = products
    .map((p) => {
      const v = viewMap.get(p.id) ?? 0;
      const c = cartMap.get(p.id) ?? 0;
      const s = saleMap.get(p.id) ?? { units: 0, revenue: 0 };
      return {
        ...p,
        views: v,
        carts: c,
        units: s.units,
        revenue: s.revenue,
        conversion: v > 0 ? (s.units / v) * 100 : 0,
      };
    })
    .filter((r) => r.views > 0 || r.units > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const highTrafficLowConv = rows.filter((r) => r.views >= 20 && r.conversion < 1).slice(0, 3);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Product analytics</h1>
          <p className="text-xs text-ink-400">{label}</p>
        </div>
        <RangePicker basePath="/admin/analytics/products" active={preset} />
      </div>

      {highTrafficLowConv.length > 0 && (
        <div className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <strong>Worth a look:</strong> high traffic but low conversion —{" "}
          {highTrafficLowConv.map((r) => r.name).join(", ")}. Consider better photos, pricing or size availability.
        </div>
      )}

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Add to cart</th>
              <th className="px-4 py-3">Units sold</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">View → buy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-cream-200 last:border-0">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/products/${r.id}`} className="font-medium hover:text-terra-600">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{r.views}</td>
                <td className="px-4 py-2.5">{r.carts}</td>
                <td className="px-4 py-2.5">{r.units}</td>
                <td className="px-4 py-2.5 font-medium">{formatINR(r.revenue)}</td>
                <td className="px-4 py-2.5">{r.conversion.toFixed(1)}%</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-400">
                  No product activity in this period yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
