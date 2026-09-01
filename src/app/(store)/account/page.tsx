import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "My Account", robots: { index: false } };

export default async function AccountPage() {
  const user = (await getSessionUser())!;
  const [orderCount, wishCount, lastOrder] = await Promise.all([
    db.order.count({ where: { userId: user.id, status: { not: "PAYMENT_PENDING" } } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.order.findFirst({
      where: { userId: user.id, status: { notIn: ["PAYMENT_PENDING", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="border border-cream-300 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-4">
            <dt className="w-16 text-ink-400">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-16 text-ink-400">Email</dt>
            <dd>{user.email}</dd>
          </div>
          {user.phone && (
            <div className="flex gap-4">
              <dt className="w-16 text-ink-400">Phone</dt>
              <dd>{user.phone}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/account/orders" className="border border-cream-300 bg-white p-5 hover:border-terra-300">
          <p className="text-2xl font-semibold">{orderCount}</p>
          <p className="text-[13px] text-ink-400">Orders</p>
        </Link>
        <Link href="/account/wishlist" className="border border-cream-300 bg-white p-5 hover:border-terra-300">
          <p className="text-2xl font-semibold">{wishCount}</p>
          <p className="text-[13px] text-ink-400">Wishlist items</p>
        </Link>
      </div>

      {lastOrder && (
        <section className="border border-cream-300 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Latest order</h2>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{lastOrder.orderNumber}</p>
              <p className="text-xs text-ink-400">
                {new Date(lastOrder.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long" })} ·{" "}
                {formatINR(lastOrder.total)}
              </p>
            </div>
            <Link
              href={`/account/orders/${lastOrder.id}`}
              className="shrink-0 text-xs font-semibold uppercase tracking-wider text-terra-600"
            >
              Track
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
