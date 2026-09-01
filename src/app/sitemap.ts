import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, collections, pages] = await Promise.all([
    db.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({ where: { active: true }, select: { slug: true } }),
    db.collection.findMany({ where: { published: true }, select: { slug: true } }),
    db.contentPage.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const statics = ["/", "/shop", "/new-arrivals", "/best-sellers", "/sale", "/collections"].map(
    (path) => ({
      url: absoluteUrl(path),
      changeFrequency: "daily" as const,
      priority: path === "/" ? 1 : 0.8,
    })
  );

  return [
    ...statics,
    ...products.map((p) => ({
      url: absoluteUrl(`/product/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...collections.map((c) => ({
      url: absoluteUrl(`/collections/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pages.map((p) => ({
      url: absoluteUrl(`/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
