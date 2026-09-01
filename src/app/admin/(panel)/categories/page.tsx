import { db } from "@/lib/db";
import TaxonomyManager from "@/components/admin/TaxonomyManager";

export const metadata = { title: "Categories · Admin" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  // parents first, children under them
  const tops = categories.filter((c) => !c.parentId);
  const ordered = tops.flatMap((t) => [t, ...categories.filter((c) => c.parentId === t.id)]);

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl">Categories</h1>
      <TaxonomyManager
        kind="category"
        parents={tops.map((c) => ({ id: c.id, name: c.name }))}
        items={ordered.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          active: c.active,
          parentId: c.parentId,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
