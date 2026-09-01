import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { PAID_STATUSES } from "@/lib/admin/metrics";

export const metadata = { title: "Customers · Admin" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        where: { status: { in: [...PAID_STATUSES] as never[] } },
        select: { total: true, createdAt: true },
      },
    },
    take: 100,
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Customers</h1>
        <form>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="w-56 border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-terra-500"
          />
        </form>
      </div>

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Total spent</th>
              <th className="px-4 py-3">Last order</th>
              <th className="px-4 py-3">Segment</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const spent = u.orders.reduce((s, o) => s + o.total, 0);
              const last = u.orders.reduce<Date | null>(
                (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
                null
              );
              const segment =
                u.orders.length === 0
                  ? { label: "No orders", cls: "bg-cream-200 text-ink-600" }
                  : spent >= 500000
                    ? { label: "VIP", cls: "bg-terra-100 text-terra-800" }
                    : u.orders.length > 1
                      ? { label: "Returning", cls: "bg-green-100 text-green-800" }
                      : { label: "One-time", cls: "bg-cream-200 text-ink-600" };
              return (
                <tr key={u.id} className="border-b border-cream-200 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-ink-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">
                    {u.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5">{u.orders.length}</td>
                  <td className="px-4 py-2.5 font-medium">{formatINR(spent)}</td>
                  <td className="px-4 py-2.5 text-ink-600">
                    {last ? last.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${segment.cls}`}>
                      {segment.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-400">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
