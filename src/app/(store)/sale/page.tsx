import ShopGrid, { type ShopSearchParams } from "@/components/store/ShopGrid";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sale",
  description: "Rare Naari sale — premium womenswear at honest markdowns, while stock lasts.",
  path: "/sale",
});

export default async function SalePage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const sp = await searchParams;
  return (
    <ShopGrid
      title="Sale"
      description="Honest markdowns. While stock lasts."
      baseFilters={{ onSale: true }}
      searchParams={sp}
      basePath="/sale"
    />
  );
}
