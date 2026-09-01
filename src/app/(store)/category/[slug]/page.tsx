import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ShopGrid, { type ShopSearchParams } from "@/components/store/ShopGrid";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ShopSearchParams>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return {};
  return pageMetadata({
    title: category.seoTitle || `${category.name} for Women`,
    description:
      category.seoDescription ||
      category.description ||
      `Shop ${category.name.toLowerCase()} by Rare Naari — premium fabrics, thoughtful fits.`,
    path: `/category/${slug}`,
    image: category.image,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await db.category.findUnique({
    where: { slug },
    include: { parent: true },
  });
  if (!category || !category.active) notFound();

  const crumbs = [
    { name: "Home", path: "/" },
    ...(category.parent ? [{ name: category.parent.name, path: `/category/${category.parent.slug}` }] : []),
    { name: category.name, path: `/category/${slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <ol className="flex flex-wrap gap-1 text-xs text-ink-400">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <a href={c.path} className={i === crumbs.length - 1 ? "text-ink-800" : "hover:text-terra-600"}>
                {c.name}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <ShopGrid
        title={category.name}
        description={category.description}
        baseFilters={{ category: slug }}
        searchParams={sp}
        basePath={`/category/${slug}`}
      />
    </>
  );
}
