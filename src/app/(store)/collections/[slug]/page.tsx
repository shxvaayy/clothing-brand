import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ShopGrid, { type ShopSearchParams } from "@/components/store/ShopGrid";
import { pageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ShopSearchParams>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const collection = await db.collection.findUnique({ where: { slug } });
  if (!collection) return {};
  return pageMetadata({
    title: collection.seoTitle || `${collection.name} Collection`,
    description:
      collection.seoDescription ||
      collection.description ||
      `Shop the ${collection.name} collection by Rare Naari.`,
    path: `/collections/${slug}`,
    image: collection.image,
  });
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const collection = await db.collection.findUnique({ where: { slug } });
  if (!collection || !collection.published) notFound();

  return (
    <ShopGrid
      title={collection.name}
      description={collection.description}
      baseFilters={{ collection: slug }}
      searchParams={sp}
      basePath={`/collections/${slug}`}
    />
  );
}
