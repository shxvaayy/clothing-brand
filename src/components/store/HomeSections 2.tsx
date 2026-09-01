import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { queryProducts, getCardsByIds, type ProductCard as Card } from "@/lib/products";
import ProductCard from "./ProductCard";
import type { HomepageSection } from "@/generated/prisma/client";

type SectionConfig = {
  image?: string;
  mobileImage?: string;
  headline?: string;
  subheading?: string;
  ctaText?: string;
  ctaLink?: string;
  source?: "new-arrivals" | "best-sellers" | "sale" | "featured" | "collection" | "manual";
  collectionSlug?: string;
  productIds?: string[];
  count?: number;
  categorySlugs?: string[];
  text?: string;
  faqs?: { q: string; a: string }[];
};

async function productsForSection(cfg: SectionConfig): Promise<Card[]> {
  const count = Math.min(cfg.count ?? 8, 12);
  if (cfg.source === "manual" && cfg.productIds?.length) {
    return (await getCardsByIds(cfg.productIds)).slice(0, count);
  }
  if (cfg.source === "collection" && cfg.collectionSlug) {
    const r = await queryProducts({ collection: cfg.collectionSlug }, "recommended", 1);
    return r.cards.slice(0, count);
  }
  const filters =
    cfg.source === "best-sellers"
      ? { bestSeller: true }
      : cfg.source === "sale"
        ? { onSale: true }
        : cfg.source === "featured"
          ? {}
          : { newArrival: true };
  const sort = cfg.source === "best-sellers" ? ("best-selling" as const) : ("newest" as const);
  const r = await queryProducts(filters, sort, 1);
  return r.cards.slice(0, count);
}

export async function RenderSection({ section, index }: { section: HomepageSection; index: number }) {
  const cfg = (section.config ?? {}) as SectionConfig;

  switch (section.type) {
    case "HERO":
      return (
        <section className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream-200 sm:aspect-auto sm:h-[78vh] sm:min-h-[520px]">
            {cfg.image && (
              <Image
                src={cfg.image}
                alt={cfg.headline ?? "Rare Naari"}
                fill
                sizes="100vw"
                priority={index === 0}
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-ink-900/10 to-ink-900/10" />
            <div className="absolute inset-x-0 bottom-0 p-6 pb-12 text-center sm:px-16 sm:pb-16 sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cream-100/90">
                New Season
              </p>
              {cfg.headline && (
                <h1 className="mt-3 font-display text-4xl leading-[1.05] text-white sm:max-w-2xl sm:text-6xl md:text-7xl">
                  {cfg.headline}
                </h1>
              )}
              {cfg.subheading && (
                <p className="mx-auto mt-3 max-w-xl text-sm text-cream-100/90 sm:mx-0 sm:text-base">
                  {cfg.subheading}
                </p>
              )}
              {cfg.ctaText && (
                <Link
                  href={cfg.ctaLink ?? "/shop"}
                  className="mt-7 inline-block border border-cream-50/80 bg-cream-50 px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-ink-900 transition-colors hover:bg-transparent hover:text-cream-50"
                >
                  {cfg.ctaText}
                </Link>
              )}
            </div>
          </div>
        </section>
      );

    case "PRODUCT_GRID": {
      const cards = await productsForSection(cfg);
      if (cards.length === 0) return null;
      const seeAll =
        cfg.source === "collection" && cfg.collectionSlug
          ? `/collections/${cfg.collectionSlug}`
          : cfg.source === "best-sellers"
            ? "/best-sellers"
            : cfg.source === "sale"
              ? "/sale"
              : "/new-arrivals";
      return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              {section.title && (
                <h2 className="font-display text-2xl text-ink-900 sm:text-3xl">{section.title}</h2>
              )}
              {section.subtitle && <p className="mt-1 text-sm text-ink-400">{section.subtitle}</p>}
            </div>
            <Link
              href={seeAll}
              className="shrink-0 text-xs font-semibold uppercase tracking-wider text-terra-600 hover:text-terra-700"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-4">
            {cards.map((c, i) => (
              <ProductCard key={c.id} product={c} priority={index <= 1 && i < 4} />
            ))}
          </div>
        </section>
      );
    }

    case "CATEGORY_GRID": {
      const slugs = cfg.categorySlugs ?? [];
      const categories = await db.category.findMany({
        where: slugs.length ? { slug: { in: slugs }, active: true } : { active: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        take: 6,
      });
      if (categories.length === 0) return null;
      return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          {section.title && (
            <h2 className="mb-5 text-center font-display text-2xl text-ink-900 sm:text-3xl">
              {section.title}
            </h2>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-6">
            {categories.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="group text-center">
                <div className="relative aspect-square overflow-hidden rounded-full bg-cream-200">
                  {c.image && (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(max-width: 640px) 45vw, 16vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="mt-2 text-[13px] font-medium text-ink-800">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      );
    }

    case "COLLECTION_BANNER":
      return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <Link
            href={cfg.ctaLink ?? (cfg.collectionSlug ? `/collections/${cfg.collectionSlug}` : "/shop")}
            className="group relative block overflow-hidden bg-cream-200"
          >
            <div className="relative aspect-[4/3] sm:aspect-[3/1]">
              {cfg.image && (
                <Image
                  src={cfg.image}
                  alt={section.title ?? ""}
                  fill
                  sizes="100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              )}
              <div className="absolute inset-0 bg-ink-900/25" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                {section.title && (
                  <h2 className="font-display text-2xl text-white sm:text-4xl">{section.title}</h2>
                )}
                {section.subtitle && (
                  <p className="mt-1 max-w-md text-sm text-cream-100">{section.subtitle}</p>
                )}
                {cfg.ctaText && (
                  <span className="mt-4 border border-white px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors group-hover:bg-white group-hover:text-ink-800">
                    {cfg.ctaText}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </section>
      );

    case "BRAND_STORY":
      return (
        <section className="bg-terra-600">
          <div className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-20">
            <Image
              src="/brand/logo.png"
              alt=""
              width={64}
              height={64}
              className="mx-auto h-16 w-16 rounded-full ring-4 ring-cream-100/30"
            />
            {section.title && (
              <h2 className="mt-6 font-display text-2xl text-cream-50 sm:text-3xl">{section.title}</h2>
            )}
            {cfg.text && (
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream-100/90 sm:text-base">
                {cfg.text}
              </p>
            )}
            {cfg.ctaText && (
              <Link
                href={cfg.ctaLink ?? "/about"}
                className="mt-6 inline-block border border-cream-100/70 px-7 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-cream-50 hover:bg-cream-50 hover:text-terra-700"
              >
                {cfg.ctaText}
              </Link>
            )}
          </div>
        </section>
      );

    case "FAQ_PREVIEW": {
      const faqs = cfg.faqs ?? [];
      if (faqs.length === 0) return null;
      return (
        <section className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-5 text-center font-display text-2xl text-ink-900 sm:text-3xl">
            {section.title ?? "Questions, answered"}
          </h2>
          <div className="divide-y divide-cream-300 border-y border-cream-300">
            {faqs.slice(0, 4).map((f, i) => (
              <details key={i} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink-800">
                  {f.q}
                  <span className="text-ink-300 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 text-center">
            <Link href="/faq" className="text-xs font-semibold uppercase tracking-wider text-terra-600">
              View all FAQs
            </Link>
          </p>
        </section>
      );
    }

    default:
      return null;
  }
}
