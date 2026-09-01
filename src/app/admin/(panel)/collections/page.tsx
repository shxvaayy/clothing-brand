import { db } from "@/lib/db";
import TaxonomyManager from "@/components/admin/TaxonomyManager";

export const metadata = { title: "Collections · Admin" };

export default async function CollectionsAdminPage() {
  const collections = await db.collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl">Collections</h1>
      <p className="mb-5 text-sm text-ink-400">
        Add products to a collection from the product edit page.
      </p>
      <TaxonomyManager
        kind="collection"
        items={collections.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          published: c.published,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
