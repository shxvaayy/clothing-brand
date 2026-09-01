import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { getSessionAdmin } from "@/lib/auth";
import { productForEdit } from "@/lib/admin/products";
import { formatINR, discountPercent } from "@/lib/money";
import ProductGallery from "@/components/store/ProductGallery";

export const metadata = { robots: { index: false }, title: "Product Preview" };

/**
 * Bare preview frame (no admin chrome) — rendered inside the preview page's
 * iframe. Shows the DRAFT state exactly as the customer product page will
 * look after publish.
 */
export default async function PreviewFrame({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const data = await productForEdit(id);
  if (!data) notFound();

  const threshold = data.lowStockThreshold;
  const colors = [...new Set(data.variants.map((v) => v.color))];

  return (
    <div className="min-h-screen bg-cream-50 px-4 py-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2 lg:gap-12">
        <div>
          {data.images.length > 0 ? (
            <ProductGallery
              images={data.images.map((i) => ({ url: i.url, alt: i.alt || null }))}
              name={data.name}
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-cream-200 text-ink-300">
              No images yet
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl leading-snug text-ink-900 sm:text-3xl">
            {data.name || "Untitled product"}
          </h1>
          {data.shortDescription && <p className="mt-1 text-sm text-ink-400">{data.shortDescription}</p>}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-semibold">{formatINR(data.sellingPrice)}</span>
            {data.mrp > data.sellingPrice && (
              <>
                <span className="text-base text-ink-400 line-through">{formatINR(data.mrp)}</span>
                <span className="text-base font-semibold text-terra-600">
                  {discountPercent(data.mrp, data.sellingPrice)}% OFF
                </span>
              </>
            )}
          </div>

          {colors.map((color) => {
            const sizes = data.variants.filter((v) => v.color === color);
            return (
              <div key={color} className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600 capitalize">
                  {color || "Default"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((v, i) => {
                    const out = v.stock <= 0;
                    return (
                      <span
                        key={i}
                        className={`min-w-12 border px-3 py-2.5 text-center text-[13px] font-medium ${
                          out
                            ? "border-cream-300 bg-cream-100 text-ink-300 line-through"
                            : "border-cream-400 bg-white"
                        }`}
                      >
                        {v.size}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {sizes.map((v, i) => (
                    <p key={i} className="text-[12px]">
                      <span className="capitalize text-ink-400">{v.size}: </span>
                      {v.stock <= 0 ? (
                        <span className="font-medium text-ink-400">Out of Stock</span>
                      ) : v.stock <= threshold ? (
                        <span className="font-medium text-terra-600">
                          {v.stock === 1 ? "Only 1 left" : `Only ${v.stock} left`}
                        </span>
                      ) : (
                        <span className="font-medium text-green-700">In Stock</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="mt-6 flex gap-3">
            <span className="flex-1 cursor-not-allowed border border-ink-800 bg-white py-3.5 text-center text-xs font-semibold uppercase tracking-[0.15em] opacity-70">
              Add to bag
            </span>
            <span className="flex-1 cursor-not-allowed bg-terra-600 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.15em] text-white opacity-70">
              Buy now
            </span>
          </div>

          <div className="mt-6 border-y border-cream-300 py-3">
            <p className="text-sm font-semibold">Description</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {data.description || "No description yet."}
            </p>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
        Preview — this is how the product page will look after publish. Buttons are disabled here.
      </p>
    </div>
  );
}
