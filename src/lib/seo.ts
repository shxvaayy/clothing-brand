import type { Metadata } from "next";

export const SITE = {
  name: "Rare Naari",
  tagline: "Clothing for the rare ones",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  description:
    "Rare Naari is a premium Indian womenswear label. Thoughtfully designed clothing in breathable fabrics, made for women who dress for themselves.",
};

export function absoluteUrl(path: string) {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata(params: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
}): Metadata {
  const description = params.description ?? SITE.description;
  const images = params.image ? [{ url: absoluteUrl(params.image) }] : undefined;
  return {
    title: params.title,
    description,
    alternates: { canonical: absoluteUrl(params.path) },
    robots: params.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: params.title,
      description,
      url: absoluteUrl(params.path),
      siteName: SITE.name,
      type: "website",
      images,
    },
    twitter: {
      card: params.image ? "summary_large_image" : "summary",
      title: params.title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/brand/logo.png"),
    slogan: SITE.tagline,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function productJsonLd(p: {
  name: string;
  slug: string;
  description: string;
  sku: string;
  image: string | null;
  price: number; // paise
  inStock: boolean;
  rating?: number | null;
  reviewCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.sku,
    brand: { "@type": "Brand", name: SITE.name },
    image: p.image ? [absoluteUrl(p.image)] : undefined,
    url: absoluteUrl(`/product/${p.slug}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.price / 100).toFixed(2),
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/product/${p.slug}`),
    },
    ...(p.rating && p.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating.toFixed(1),
            reviewCount: p.reviewCount,
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
