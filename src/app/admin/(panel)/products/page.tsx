import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatINR, discountPercent } from "@/lib/money";
import { availableOf } from "@/lib/inventory";

export const metadata = { title: "Products · Admin" };

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Draft" },
  { key: "UNPUBLISHED", label: "Unpublished" },
] as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status;

  const products = await db.product.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      variants: { select: { stock: true, reservedStock: true } },
      category: { select: { name: true } },
    },
    take: 100,
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-terra-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
        >
          + New product
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key ? `/admin/products?status=${t.key}` : "/admin/products"}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium ${
                (status ?? "") === t.key
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
            placeholder="Search name or SKU…"
            className="w-56 border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-terra-500"
          />
        </form>
      </div>

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.variants.reduce((s, v) => s + availableOf(v), 0);
              return (
                <tr key={p.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <div className="relative h-12 w-9 shrink-0 overflow-hidden bg-cream-200">
                        {p.images[0] && (
                          <Image src={p.images[0].url} alt="" fill sizes="36px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-ink-400">{p.sku}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {formatINR(p.sellingPrice)}
                    {discountPercent(p.mrp, p.sellingPrice) > 0 && (
                      <span className="ml-1 text-xs text-terra-600">
                        {discountPercent(p.mrp, p.sellingPrice)}% off
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        stock === 0
                          ? "font-medium text-red-600"
                          : stock <= p.lowStockThreshold
                            ? "font-medium text-terra-600"
                            : ""
                      }
                    >
                      {stock}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        p.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : p.status === "DRAFT"
                            ? "bg-cream-200 text-ink-600"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.draftData !== null && (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        Draft edits
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/admin/products/${p.id}`} className="text-xs font-semibold uppercase tracking-wider text-terra-600">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-400">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
