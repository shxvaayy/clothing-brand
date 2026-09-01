import ShopGrid, { type ShopSearchParams } from "@/components/store/ShopGrid";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Shop All Womenswear",
  description:
    "Explore the full Rare Naari collection — kurta sets, dresses, co-ords and more in breathable premium fabrics.",
  path: "/shop",
});

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const sp = await searchParams;
  return (
    <ShopGrid
      title="Shop All"
      description="Every Rare Naari piece, in one place."
      baseFilters={{}}
      searchParams={sp}
      basePath="/shop"
    />
  );
}
