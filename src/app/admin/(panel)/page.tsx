import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { availableOf } from "@/lib/inventory";
import { coreKpis, rangeForPreset, pctChange, PAID_STATUSES } from "@/lib/admin/metrics";

export const metadata = { title: "Dashboard · Admin" };

export default async function AdminDashboard() {
  const { current, previous } = rangeForPreset("30d");
  const [kpis, prev, recentOrders, lowStock, pendingLeads] = await Promise.all([
    coreKpis(current),
    coreKpis(previous),
    db.order.findMany({
      where: { status: { in: [...PAID_STATUSES] as never[] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } }, items: true },
    }),
    db.productVariant.findMany({
      where: { active: true, product: { status: "PUBLISHED" } },
      include: { product: { select: { id: true, name: true, lowStockThreshold: true } } },
      take: 200,
    }),
    db.lead.count({ where: { status: "NEW" } }),
  ]);

  const lowRows = lowStock
    .map((v) => ({ ...v, available: availableOf(v) }))
    .filter((v) => v.available <= v.product.lowStockThreshold)
    .sort((a, b) => a.available - b.available)
    .slice(0, 6);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl">Dashboard</h1>
        <p className="text-xs text-ink-400">Last 30 days vs previous 30 days</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Revenue" value={formatINR(kpis.revenue)} change={pctChange(kpis.revenue, prev.revenue)} />
        <Kpi label="Orders" value={String(kpis.orders)} change={pctChange(kpis.orders, prev.orders)} />
        <Kpi label="Avg order value" value={formatINR(kpis.aov)} change={pctChange(kpis.aov, prev.aov)} />
        <Kpi label="Conversion" value={`${kpis.conversion.toFixed(2)}%`} change={pctChange(kpis.conversion, prev.conversion)} />
        <Kpi label="Visitors" value={kpis.visitors.toLocaleString("en-IN")} change={pctChange(kpis.visitors, prev.visitors)} />
        <Kpi label="Units sold" value={String(kpis.units)} change={pctChange(kpis.units, prev.units)} />
        <Kpi label="New customers" value={String(kpis.newCustomers)} change={pctChange(kpis.newCustomers, prev.newCustomers)} />
        <Kpi label="Cancelled orders" value={String(kpis.cancelled)} change={pctChange(kpis.cancelled, prev.cancelled)} invert />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="border border-cream-300 bg-white">
          <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold uppercase text-terra-600">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-cream-200">
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-cream-50">
                  <div>
                    <p className="text-sm font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-ink-400">
                      {o.user?.name ?? "Guest"} · {o.items.reduce((s, i) => s + i.quantity, 0)} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatINR(o.total)}</p>
                    <p className="text-[11px] uppercase text-terra-600">{o.status.replaceAll("_", " ")}</p>
                  </div>
                </Link>
              </li>
            ))}
            {recentOrders.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-ink-400">No orders yet.</li>
            )}
          </ul>
        </section>

        <section className="border border-cream-300 bg-white">
          <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Stock alerts</h2>
            <Link href="/admin/inventory?f=low" className="text-xs font-semibold uppercase text-terra-600">
              Inventory
            </Link>
          </div>
          <ul className="divide-y divide-cream-200">
            {lowRows.map((v) => (
              <li key={v.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <Link href={`/admin/products/${v.product.id}`} className="text-sm font-medium hover:text-terra-600">
                    {v.product.name}
                  </Link>
                  <p className="text-xs capitalize text-ink-400">{v.color} / {v.size}</p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    v.available === 0 ? "bg-red-50 text-red-600" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {v.available === 0 ? "Out of stock" : `${v.available} left`}
                </span>
              </li>
            ))}
            {lowRows.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-ink-400">All stocked up. Nothing low.</li>
            )}
          </ul>
          {pendingLeads > 0 && (
            <Link href="/admin/leads" className="block border-t border-cream-200 px-5 py-3 text-[13px] text-terra-700 hover:bg-cream-50">
              {pendingLeads} new lead{pendingLeads === 1 ? "" : "s"} waiting →
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

import KpiCard from "@/components/admin/KpiCard";
function Kpi(props: { label: string; value: string; change?: number | null; invert?: boolean }) {
  return <KpiCard {...props} />;
}
