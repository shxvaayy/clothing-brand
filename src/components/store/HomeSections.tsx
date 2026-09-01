import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { queryProducts, getCardsByIds, type ProductCard as Card } from "@/lib/products";
import ProductCard from "./ProductCard";
import HeroCarousel, { type HeroSlide } from "./HeroCarousel";
import type { HomepageSection } from "@/generated/prisma/client";

type SectionConfig = {
  image?: string;
  mobileImage?: string;
  slides?: HeroSlide[];
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
    case "HERO": {
      // slides array (auto-rotating) with single-image fallback for older configs
      const slides: HeroSlide[] =
        cfg.slides && cfg.slides.length > 0
          ? cfg.slides
          : cfg.image
            ? [
                {
                  image: cfg.image,
                  mobileImage: cfg.mobileImage,
                  headline: cfg.headline,
                  subheading: cfg.subheading,
                  ctaText: cfg.ctaText,
                  ctaLink: cfg.ctaLink,
                },
              ]
            : [];
      if (slides.length === 0) return null;
      return <HeroCarousel slides={slides} />;
    }

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
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              {section.subtitle && (
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-terra-600">
                  {section.subtitle}
                </p>
              )}
              {section.title && (
                <h2 className="font-display text-3xl text-ink-900 sm:text-4xl">{section.title}</h2>
              )}
            </div>
            <Link
              href={seeAll}
              className="shrink-0 border-b border-ink-800 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-800 hover:border-terra-600 hover:text-terra-600"
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
            <div className="mb-6 text-center">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-terra-600">
                Explore
              </p>
              <h2 className="font-display text-3xl text-ink-900 sm:text-4xl">{section.title}</h2>
            </div>
          )}
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group relative block w-36 shrink-0 snap-start overflow-hidden bg-cream-200 sm:w-auto"
              >
                <div className="relative aspect-[3/4]">
                  {c.image && (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(max-width: 640px) 40vw, 16vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />
                  <p className="absolute inset-x-0 bottom-3 px-2 text-center font-display text-base tracking-wide text-white">
                    {c.name}
                  </p>
                </div>
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
