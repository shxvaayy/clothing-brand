import Link from "next/link";
import { db } from "@/lib/db";
import { queryProducts, type ShopFilters, type ShopSort } from "@/lib/products";
import ProductCard from "./ProductCard";
import FilterSort from "./FilterSort";

export type ShopSearchParams = { [key: string]: string | string[] | undefined };

export function parseShopParams(sp: ShopSearchParams): {
  filters: ShopFilters;
  sort: ShopSort;
  page: number;
} {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const price = get("price");
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (price) {
    const [a, b] = price.split("-").map(Number);
    if (!Number.isNaN(a)) minPrice = a;
    if (!Number.isNaN(b)) maxPrice = b;
  }
  return {
    filters: {
      sizes: get("sizes")?.split(",").filter(Boolean),
      colors: get("colors")?.split(",").filter(Boolean),
      minPrice,
      maxPrice,
      inStockOnly: get("stock") === "1",
    },
    sort: (get("sort") as ShopSort) ?? "recommended",
    page: Math.max(1, Number(get("page") ?? 1) || 1),
  };
}

async function facetOptions() {
  const variants = await db.productVariant.findMany({
    where: { active: true, product: { status: "PUBLISHED" } },
    select: { size: true, color: true },
    distinct: ["size", "color"],
  });
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];
  const sizes = [...new Set(variants.map((v) => v.size))].sort(
    (a, b) => (sizeOrder.indexOf(a) + 100) % 100 - (sizeOrder.indexOf(b) + 100) % 100
  );
  const colors = [...new Set(variants.map((v) => v.color.toLowerCase()))].sort();
  return { sizes, colors };
}

export default async function ShopGrid({
  title,
  description,
  baseFilters,
  searchParams,
  basePath,
  emptyMessage,
}: {
  title: string;
  description?: string | null;
  baseFilters: ShopFilters;
  searchParams: ShopSearchParams;
  basePath: string;
  emptyMessage?: string;
}) {
  const { filters, sort, page } = parseShopParams(searchParams);
  const merged: ShopFilters = { ...baseFilters, ...filters };
  const [result, facets] = await Promise.all([queryProducts(merged, sort, page), facetOptions()]);

  const pageLink = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string" && k !== "page") next.set(k, v);
    }
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-4 sm:mb-6">
        <h1 className="font-display text-2xl text-ink-900 sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-400">{description}</p>}
        <p className="mt-1 text-xs text-ink-400 sm:hidden">{result.total} products</p>
      </header>

      <FilterSort sizes={facets.sizes} colors={facets.colors} total={result.total} />

      {result.cards.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-xl text-ink-600">
            {emptyMessage ?? "No products match these filters."}
          </p>
          <Link
            href={basePath}
            className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-terra-600"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 sm:mt-6 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">
          {result.cards.map((c, i) => (
            <ProductCard key={c.id} product={c} priority={i < 4} />
          ))}
        </div>
      )}

      {result.pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Link href={pageLink(page - 1)} className="border border-cream-400 bg-white px-4 py-2 text-sm">
              Previous
            </Link>
          )}
          <span className="px-3 text-sm text-ink-400">
            Page {page} of {result.pages}
          </span>
          {page < result.pages && (
            <Link href={pageLink(page + 1)} className="border border-cream-400 bg-white px-4 py-2 text-sm">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
