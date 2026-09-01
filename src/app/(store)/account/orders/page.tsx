import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "My Orders", robots: { index: false } };

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-600",
  REFUNDED: "bg-red-50 text-red-600",
  RETURNED: "bg-cream-200 text-ink-600",
};

export default async function OrdersPage() {
  const user = (await getSessionUser())!;
  const orders = await db.order.findMany({
    where: { userId: user.id, status: { not: "PAYMENT_PENDING" } },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl text-ink-600">No orders yet</p>
        <Link
          href="/shop"
          className="mt-4 inline-block bg-terra-600 px-8 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.id} className="border border-cream-300 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{order.orderNumber}</p>
              <p className="text-xs text-ink-400">
                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <span
              className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                STATUS_STYLES[order.status] ?? "bg-terra-50 text-terra-700"
              }`}
            >
              {order.status.replaceAll("_", " ")}
            </span>
          </div>
          <Link href={`/account/orders/${order.id}`} className="flex items-center gap-3 px-4 py-3">
            <div className="flex -space-x-3">
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} className="relative h-14 w-11 overflow-hidden border border-white bg-cream-200">
                  {item.image && <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink-600">
                {order.items.map((i) => i.name).join(", ")}
              </p>
              <p className="text-xs text-ink-400">
                {order.items.reduce((s, i) => s + i.quantity, 0)} items · {formatINR(order.total)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-terra-600">
              View
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
