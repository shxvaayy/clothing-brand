import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { pageMetadata, productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { formatINR } from "@/lib/money";
import ProductGallery from "@/components/store/ProductGallery";
import ProductPurchase from "@/components/store/ProductPurchase";
import PincodeChecker from "@/components/store/PincodeChecker";
import ProductCard from "@/components/store/ProductCard";
import ProductViewTracker from "@/components/store/ProductViewTracker";
import { StarIcon, ReturnIcon, ShieldIcon, TruckIcon } from "@/components/ui/Icons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return pageMetadata({
    title: product.seoTitle || product.name,
    description:
      product.seoDescription || product.shortDescription || product.description.slice(0, 160),
    path: `/product/${slug}`,
    image: product.images[0]?.url,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, user, settings] = await Promise.all([
    getProductBySlug(slug),
    getSessionUser(),
    getSettings(),
  ]);
  if (!product) notFound();

  const [related, wished] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId),
    user
      ? db.wishlistItem.findUnique({
          where: { userId_productId: { userId: user.id, productId: product.id } },
        })
      : null,
  ]);

  const anyInStock = product.variantViews.some((v) => v.state !== "OUT_OF_STOCK");
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(product.category
      ? [{ name: product.category.name, path: `/category/${product.category.slug}` }]
      : []),
    { name: product.name, path: `/product/${product.slug}` },
  ];

  const details: { label: string; value: string | null }[] = [
    { label: "Fabric", value: product.fabric },
    { label: "Fit", value: product.fit },
    { label: "Care", value: product.care },
    { label: "SKU", value: product.sku },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productJsonLd({
              name: product.name,
              slug: product.slug,
              description: product.shortDescription || product.description.slice(0, 200),
              sku: product.sku,
              image: product.images[0]?.url ?? null,
              price: product.variantViews[0]?.price ?? product.sellingPrice,
              inStock: anyInStock,
              rating: product.avgRating,
              reviewCount: product.reviewCount,
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <ProductViewTracker productId={product.id} />

      <nav aria-label="Breadcrumb" className="mb-3 hidden sm:block">
        <ol className="flex flex-wrap gap-1 text-xs text-ink-400">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <Link
                href={c.path}
                className={i === crumbs.length - 1 ? "text-ink-800" : "hover:text-terra-600"}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <div className="-mx-4 sm:mx-0">
          <ProductGallery
            images={product.images.map((i) => ({ url: i.url, alt: i.alt }))}
            name={product.name}
          />
        </div>

        <div>
          <h1 className="font-display text-2xl leading-snug text-ink-900 sm:text-3xl">
            {product.name}
          </h1>
          {product.shortDescription && (
            <p className="mt-1 text-sm text-ink-400">{product.shortDescription}</p>
          )}
          {product.reviewCount > 0 && product.avgRating && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <span className="flex items-center gap-0.5 text-terra-500">
                <StarIcon width={15} height={15} filled />
                <span className="font-semibold">{product.avgRating.toFixed(1)}</span>
              </span>
              <span className="text-ink-400">({product.reviewCount} reviews)</span>
            </a>
          )}

          <div className="mt-4">
            <ProductPurchase
              productId={product.id}
              productName={product.name}
              variants={product.variantViews}
              initialWished={Boolean(wished)}
            />
          </div>

          <div className="mt-6 space-y-4">
            <PincodeChecker />

            {/* trust row — honest claims only */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="border border-cream-300 bg-white p-3">
                <TruckIcon className="mx-auto text-terra-500" />
                <p className="mt-1.5 text-[11px] leading-tight text-ink-600">
                  Free shipping above {formatINR(settings.freeShippingAbove)}
                </p>
              </div>
              <div className="border border-cream-300 bg-white p-3">
                <ReturnIcon className="mx-auto text-terra-500" />
                <p className="mt-1.5 text-[11px] leading-tight text-ink-600">
                  {settings.returnWindowDays}-day easy returns
                </p>
              </div>
              <div className="border border-cream-300 bg-white p-3">
                <ShieldIcon className="mx-auto text-terra-500" />
                <p className="mt-1.5 text-[11px] leading-tight text-ink-600">Secure checkout</p>
              </div>
            </div>

            {/* details accordions */}
            <div className="divide-y divide-cream-300 border-y border-cream-300">
              <details className="group py-3" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  Description
                  <span className="text-ink-300 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                  {product.description}
                </p>
              </details>
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  Fabric, fit &amp; care
                  <span className="text-ink-300 transition-transform group-open:rotate-45">+</span>
                </summary>
                <dl className="mt-2 space-y-1.5">
                  {details
                    .filter((d) => d.value)
                    .map((d) => (
                      <div key={d.label} className="flex gap-2 text-sm">
                        <dt className="w-16 shrink-0 text-ink-400">{d.label}</dt>
                        <dd className="text-ink-600">{d.value}</dd>
                      </div>
                    ))}
                </dl>
              </details>
              <details className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  Shipping &amp; returns
                  <span className="text-ink-300 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Orders are dispatched within 24–48 hours.{" "}
                  {settings.returnWindowDays}-day return window from delivery — see our{" "}
                  <Link href="/returns" className="text-terra-600 underline">
                    returns policy
                  </Link>
                  .
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-14">
        <h2 className="font-display text-xl text-ink-900 sm:text-2xl">Reviews</h2>
        {product.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-400">
            No reviews yet. Reviews appear here after verified customers share their experience.
          </p>
        ) : (
          <ul className="mt-4 space-y-5">
            {product.reviews.map((r) => (
              <li key={r.id} className="border-b border-cream-200 pb-5">
                <div className="flex items-center gap-2">
                  <span className="flex text-terra-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} width={14} height={14} filled={i < r.rating} />
                    ))}
                  </span>
                  <span className="text-sm font-medium">{r.user.name}</span>
                  {r.verified && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      Verified purchase
                    </span>
                  )}
                </div>
                {r.title && <p className="mt-1.5 text-sm font-semibold">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm leading-relaxed text-ink-600">{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 font-display text-xl text-ink-900 sm:text-2xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-4">
            {related.slice(0, 4).map((c) => (
              <ProductCard key={c.id} product={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
