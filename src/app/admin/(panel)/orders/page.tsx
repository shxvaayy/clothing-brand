import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Orders · Admin" };

const TABS = [
  "",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const orders = await db.order.findMany({
    where: {
      status: sp.status ? (sp.status as never) : { not: "PAYMENT_PENDING" },
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { guestEmail: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { items: true, user: { select: { name: true, email: true } }, payment: true },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl">Orders</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t || "all"}
              href={t ? `/admin/orders?status=${t}` : "/admin/orders"}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
                (sp.status ?? "") === t
                  ? "bg-ink-800 text-white"
                  : "border border-cream-300 bg-white text-ink-600"
              }`}
            >
              {t ? t.replaceAll("_", " ") : "All"}
            </Link>
          ))}
        </div>
        <form className="ml-auto">
          <input
            name="q"
            defaultValue={q}
            placeholder="Order no, customer…"
            className="w-56 border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-terra-500"
          />
        </form>
      </div>

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-50">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-terra-700 hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-ink-400">
                    {new Date(o.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  {o.user?.name ?? "Guest"}
                  <p className="text-xs text-ink-400">{o.user?.email ?? o.guestEmail}</p>
                </td>
                <td className="px-4 py-2.5">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="px-4 py-2.5 font-medium">{formatINR(o.total)}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      o.payment?.status === "SUCCESS"
                        ? "bg-green-100 text-green-800"
                        : "bg-cream-200 text-ink-600"
                    }`}
                  >
                    {o.payment?.status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-terra-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-terra-700">
                    {o.status.replaceAll("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-400">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
