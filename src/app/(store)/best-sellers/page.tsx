import ShopGrid, { type ShopSearchParams } from "@/components/store/ShopGrid";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Best Sellers",
  description: "The Rare Naari pieces our customers keep coming back for.",
  path: "/best-sellers",
});

export default async function BestSellersPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const sp = await searchParams;
  return (
    <ShopGrid
      title="Best Sellers"
      description="Most-loved pieces, restocked as fast as we can."
      baseFilters={{ bestSeller: true }}
      searchParams={sp}
      basePath="/best-sellers"
    />
  );
}
