import ShopGrid, { type ShopSearchParams } from "@/components/store/ShopGrid";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return pageMetadata({
    title: q ? `Search results for “${q}”` : "Search",
    path: "/search",
    noindex: true,
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  return (
    <ShopGrid
      title={q ? `Results for “${q}”` : "Search"}
      description={q ? undefined : "Type in the search bar above to find products."}
      baseFilters={{ q }}
      searchParams={sp}
      basePath={`/search`}
      emptyMessage={`No products found for “${q}”. Try a different word — like “kurta”, “dress” or “co-ord”.`}
    />
  );
}
