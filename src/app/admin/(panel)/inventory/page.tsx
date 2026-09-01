import Link from "next/link";
import { db } from "@/lib/db";
import { availableOf } from "@/lib/inventory";
import StockAdjuster from "@/components/admin/StockAdjuster";

export const metadata = { title: "Inventory · Admin" };

const TABS = [
  { key: "", label: "All" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
] as const;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const variants = await db.productVariant.findMany({
    where: {
      active: true,
      product: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    include: {
      product: { select: { id: true, name: true, sku: true, lowStockThreshold: true, status: true } },
      _count: { select: { orderItems: true } },
    },
    orderBy: [{ product: { name: "asc" } }, { color: "asc" }],
    take: 300,
  });

  const rows = variants
    .map((v) => ({
      ...v,
      available: availableOf(v),
      state:
        availableOf(v) <= 0
          ? "OUT"
          : availableOf(v) <= v.product.lowStockThreshold
            ? "LOW"
            : "IN",
    }))
    .filter((v) => (sp.f === "low" ? v.state === "LOW" : sp.f === "out" ? v.state === "OUT" : true));

  const lowCount = variants.filter((v) => {
    const a = availableOf(v);
    return a > 0 && a <= v.product.lowStockThreshold;
  }).length;
  const outCount = variants.filter((v) => availableOf(v) <= 0).length;

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl">Inventory</h1>
      <p className="mb-5 text-sm text-ink-400">
        {variants.length} variants · <span className="text-terra-600">{lowCount} low</span> ·{" "}
        <span className="text-red-600">{outCount} out of stock</span>
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key ? `/admin/inventory?f=${t.key}` : "/admin/inventory"}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
                (sp.f ?? "") === t.key
                  ? "bg-ink-800 text-white"
                  : "border border-cream-300 bg-white text-ink-600"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form className="ml-auto">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search product or SKU…"
            className="w-56 border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-terra-500"
          />
        </form>
      </div>

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Product / Variant</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-b border-cream-200 last:border-0">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/products/${v.product.id}`} className="font-medium hover:text-terra-600">
                    {v.product.name}
                  </Link>
                  <p className="text-xs capitalize text-ink-400">
                    {v.color} / {v.size}
                  </p>
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-400">{v.sku}</td>
                <td className="px-4 py-2.5 font-semibold">{v.available}</td>
                <td className="px-4 py-2.5 text-ink-400">{v.reservedStock}</td>
                <td className="px-4 py-2.5 text-ink-400">{v._count.orderItems}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      v.state === "OUT"
                        ? "bg-red-50 text-red-600"
                        : v.state === "LOW"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {v.state === "OUT" ? "Out of stock" : v.state === "LOW" ? "Low stock" : "In stock"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <StockAdjuster variantId={v.id} current={v.stock} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-400">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
