import ShopGrid, { type ShopSearchParams } from "@/components/store/ShopGrid";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "New Arrivals",
  description: "The latest Rare Naari drops — fresh silhouettes, new colours, limited runs.",
  path: "/new-arrivals",
});

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const sp = await searchParams;
  return (
    <ShopGrid
      title="New Arrivals"
      description="Fresh silhouettes, straight from the studio."
      baseFilters={{ newArrival: true }}
      searchParams={sp}
      basePath="/new-arrivals"
    />
  );
}
