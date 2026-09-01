"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatINR, rupeesToPaise } from "@/lib/money";

type VariantRow = {
  id?: string;
  size: string;
  color: string;
  colorHex: string;
  priceOverride: string; // rupees, empty = inherit
  stock: string;
  active: boolean;
};

type ImageRow = { id?: string; url: string; alt: string };

export type ProductFormValue = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  fabric: string;
  fit: string;
  care: string;
  mrp: string; // rupees in the form
  sellingPrice: string;
  lowStockThreshold: string;
  categoryId: string;
  collectionIds: string[];
  tags: string;
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  onSale: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  variants: VariantRow[];
  images: ImageRow[];
};

export type Option = { id: string; name: string };

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ProductForm({
  productId,
  status,
  hasDraft,
  initial,
  categories,
  collections,
}: {
  productId?: string;
  status?: string;
  hasDraft?: boolean;
  initial: ProductFormValue;
  categories: Option[];
  collections: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValue>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof ProductFormValue>(key: K, value: ProductFormValue[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setNotice(null);
  };

  // warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---- live price preview (exactly what the customer sees)
  const price = useMemo(() => {
    const mrp = parseFloat(form.mrp) || 0;
    const sp = parseFloat(form.sellingPrice) || 0;
    const discount = Math.max(0, mrp - sp);
    const pct = mrp > 0 && sp < mrp ? Math.round(((mrp - sp) / mrp) * 100) : 0;
    return { mrp, sp, discount, pct, valid: mrp > 0 && sp > 0 && sp <= mrp };
  }, [form.mrp, form.sellingPrice]);

  const toPayload = () => ({
    name: form.name.trim(),
    slug: form.slug.trim(),
    sku: form.sku.trim().toUpperCase(),
    description: form.description.trim(),
    shortDescription: form.shortDescription.trim(),
    fabric: form.fabric.trim(),
    fit: form.fit.trim(),
    care: form.care.trim(),
    mrp: rupeesToPaise(parseFloat(form.mrp) || 0),
    sellingPrice: rupeesToPaise(parseFloat(form.sellingPrice) || 0),
    lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
    categoryId: form.categoryId || null,
    collectionIds: form.collectionIds,
    tags: form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    featured: form.featured,
    bestSeller: form.bestSeller,
    newArrival: form.newArrival,
    onSale: form.onSale,
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    seoKeywords: form.seoKeywords.trim(),
    variants: form.variants.map((v) => ({
      id: v.id,
      size: v.size.trim(),
      color: v.color.trim(),
      colorHex: v.colorHex || null,
      priceOverride: v.priceOverride ? rupeesToPaise(parseFloat(v.priceOverride)) : null,
      stock: parseInt(v.stock) || 0,
      active: v.active,
    })),
    images: form.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt })),
  });

  const save = async (): Promise<string | null> => {
    setError(null);
    setBusy("save");
    try {
      const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return null;
      }
      setDirty(false);
      if (!productId) {
        router.push(`/admin/products/${data.id}`);
        return data.id;
      }
      setNotice(
        data.savedTo === "draft"
          ? "Saved as draft — the live product is unchanged until you publish"
          : "Saved"
      );
      router.refresh();
      return productId;
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    setConfirmPublish(false);
    let id = productId;
    if (dirty || !id) {
      id = (await save()) ?? undefined;
      if (!id) return;
    }
    setBusy("publish");
    try {
      const res = await fetch(`/api/admin/products/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not publish");
        return;
      }
      setNotice("Published — the product is now live everywhere");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    if (!productId) return;
    setBusy("unpublish");
    try {
      await fetch(`/api/admin/products/${productId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish" }),
      });
      setNotice("Unpublished — hidden from the store, data preserved");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  // ---- images (unlimited, reorder, alt text, first = cover)
  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `Could not upload ${file.name}`);
          continue;
        }
        setForm((f) => ({ ...f, images: [...f.images, { url: data.url, alt: "" }] }));
        setDirty(true);
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const moveImage = (i: number, dir: -1 | 1) => {
    const next = [...form.images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("images", next);
  };

  // ---- variants
  const addVariant = () =>
    set("variants", [
      ...form.variants,
      {
        size: "M",
        color: form.variants[form.variants.length - 1]?.color ?? "",
        colorHex: form.variants[form.variants.length - 1]?.colorHex ?? "",
        priceOverride: "",
        stock: "0",
        active: true,
      },
    ]);

  const setVariant = (i: number, patch: Partial<VariantRow>) => {
    const next = [...form.variants];
    next[i] = { ...next[i], ...patch };
    set("variants", next);
  };

  const stockPreview = (stockStr: string) => {
    const stock = parseInt(stockStr) || 0;
    const threshold = parseInt(form.lowStockThreshold) || 5;
    if (stock <= 0) return { text: "Out of Stock", cls: "text-red-600" };
    if (stock <= threshold) return { text: `Only ${stock} left`, cls: "text-terra-600" };
    return { text: "In Stock", cls: "text-green-700" };
  };

  const input = (
    key: keyof ProductFormValue,
    label: string,
    opts: { textarea?: boolean; placeholder?: string; hint?: string; type?: string } = {}
  ) => (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-ink-600">
        {label}
        {opts.hint && <span className="font-normal text-ink-400">{opts.hint}</span>}
      </span>
      {opts.textarea ? (
        <textarea
          rows={4}
          value={String(form[key] ?? "")}
          placeholder={opts.placeholder}
          onChange={(e) => set(key, e.target.value as never)}
          className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500"
        />
      ) : (
        <input
          type={opts.type ?? "text"}
          value={String(form[key] ?? "")}
          placeholder={opts.placeholder}
          onChange={(e) => set(key, e.target.value as never)}
          className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500"
        />
      )}
    </label>
  );

  const section = (title: string, children: React.ReactNode, subtitle?: string) => (
    <section className="border border-cream-300 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );

  return (
    <div className="pb-28">
      {/* status strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            status === "PUBLISHED"
              ? "bg-green-100 text-green-800"
              : status === "UNPUBLISHED"
                ? "bg-red-50 text-red-600"
                : "bg-cream-200 text-ink-600"
          }`}
        >
          {status ?? "New product"}
        </span>
        {hasDraft && (
          <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Unpublished draft changes
          </span>
        )}
        {notice && <span className="text-[13px] font-medium text-green-700">{notice}</span>}
        {error && (
          <span role="alert" className="text-[13px] font-medium text-red-600">
            {error}
          </span>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {section(
            "Basic info",
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">Product name</span>
                <input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: !productId && (!f.slug || f.slug === slugify(f.name)) ? slugify(name) : f.slug,
                    }));
                    setDirty(true);
                  }}
                  className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {input("slug", "Slug (URL)", { hint: "lowercase-with-hyphens" })}
                {input("sku", "SKU", { placeholder: "RN-KUR-001" })}
              </div>
              {input("shortDescription", "Short description", {
                hint: "one line under the title",
              })}
              {input("description", "Description", { textarea: true })}
              <div className="grid gap-4 sm:grid-cols-3">
                {input("fabric", "Fabric", { placeholder: "100% Cotton" })}
                {input("fit", "Fit", { placeholder: "Relaxed fit" })}
                {input("care", "Care", { placeholder: "Machine wash cold" })}
              </div>
            </>
          )}

          {section(
            "Media",
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  uploadFiles(e.dataTransfer.files);
                }}
                className="flex flex-col items-center justify-center border-2 border-dashed border-cream-400 bg-cream-100 px-4 py-8 text-center"
              >
                <p className="text-sm text-ink-600">Drag & drop images here</p>
                <p className="mt-1 text-xs text-ink-400">JPG / PNG / WEBP, up to 8 MB each. Add as many as you like — first image is the cover.</p>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="mt-3 bg-ink-800 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Choose files"}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  hidden
                  onChange={(e) => uploadFiles(e.target.files)}
                />
              </div>
              {form.images.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {form.images.map((img, i) => (
                    <li key={img.url + i} className="border border-cream-300">
                      <div className="relative aspect-[3/4] bg-cream-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="h-full w-full object-cover" />
                        {i === 0 && (
                          <span className="absolute left-1 top-1 bg-terra-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                            Cover
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 p-1.5">
                        <input
                          value={img.alt}
                          placeholder="Alt text"
                          onChange={(e) => {
                            const next = [...form.images];
                            next[i] = { ...next[i], alt: e.target.value };
                            set("images", next);
                          }}
                          className="w-full border border-cream-300 px-1.5 py-1 text-[11px] outline-none"
                        />
                        <div className="flex justify-between text-[11px]">
                          <span>
                            <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="px-1 disabled:opacity-30">←</button>
                            <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="px-1 disabled:opacity-30">→</button>
                          </span>
                          <button
                            type="button"
                            onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                            className="text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>,
            `${form.images.length} image${form.images.length === 1 ? "" : "s"} — unlimited allowed`
          )}

          {section(
            "Variants & inventory",
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
                      <th className="pb-2 pr-2">Colour</th>
                      <th className="pb-2 pr-2">Hex</th>
                      <th className="pb-2 pr-2">Size</th>
                      <th className="pb-2 pr-2">Price override (₹)</th>
                      <th className="pb-2 pr-2">Stock</th>
                      <th className="pb-2 pr-2">Customer sees</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.variants.map((v, i) => {
                      const preview = stockPreview(v.stock);
                      return (
                        <tr key={i} className="border-b border-cream-200">
                          <td className="py-2 pr-2">
                            <input
                              value={v.color}
                              onChange={(e) => setVariant(i, { color: e.target.value })}
                              placeholder="Black"
                              className="w-24 border border-cream-300 px-2 py-1.5 outline-none"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="color"
                              value={v.colorHex || "#cccccc"}
                              onChange={(e) => setVariant(i, { colorHex: e.target.value })}
                              className="h-8 w-10 cursor-pointer border border-cream-300"
                              aria-label="Colour swatch"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <select
                              value={v.size}
                              onChange={(e) => setVariant(i, { size: e.target.value })}
                              className="border border-cream-300 px-2 py-1.5"
                            >
                              {SIZES.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              value={v.priceOverride}
                              onChange={(e) => setVariant(i, { priceOverride: e.target.value.replace(/[^\d.]/g, "") })}
                              placeholder="—"
                              className="w-20 border border-cream-300 px-2 py-1.5 outline-none"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              inputMode="numeric"
                              value={v.stock}
                              onChange={(e) => setVariant(i, { stock: e.target.value.replace(/\D/g, "") })}
                              className="w-16 border border-cream-300 px-2 py-1.5 outline-none"
                            />
                          </td>
                          <td className={`py-2 pr-2 text-[12px] font-medium ${preview.cls}`}>{preview.text}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}
                              className="text-xs text-red-600"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={addVariant}
                  className="border border-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                >
                  + Add variant
                </button>
                <label className="flex items-center gap-2 text-xs text-ink-600">
                  Low-stock alert when ≤
                  <input
                    inputMode="numeric"
                    value={form.lowStockThreshold}
                    onChange={(e) => set("lowStockThreshold", e.target.value.replace(/\D/g, ""))}
                    className="w-14 border border-cream-300 px-2 py-1.5"
                  />
                  units
                </label>
              </div>
            </>,
            "Stock changes apply to the live store immediately, even for published products"
          )}

          {section(
            "SEO",
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      seoTitle: f.seoTitle || `${f.name} | Rare Naari`.slice(0, 70),
                      seoDescription:
                        f.seoDescription ||
                        (f.shortDescription || f.description).slice(0, 160),
                      seoKeywords: f.seoKeywords || f.tags,
                    }))
                  }
                  className="text-xs font-semibold uppercase tracking-wider text-terra-600"
                >
                  Auto-fill from product
                </button>
              </div>
              {input("seoTitle", "SEO title", { hint: `${form.seoTitle.length}/70` })}
              {input("seoDescription", "SEO description", { hint: `${form.seoDescription.length}/160` })}
              {input("seoKeywords", "Keywords", { hint: "comma separated" })}
            </>
          )}
        </div>

        {/* right rail */}
        <div className="space-y-5">
          {section(
            "Pricing",
            <>
              <div className="grid grid-cols-2 gap-4">
                {input("mrp", "MRP (₹)", { type: "text", placeholder: "2999" })}
                {input("sellingPrice", "Selling price (₹)", { type: "text", placeholder: "2099" })}
              </div>
              <div className="border border-cream-300 bg-cream-100 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                  Customer sees
                </p>
                {price.valid ? (
                  <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-lg font-semibold">{formatINR(rupeesToPaise(price.sp))}</span>
                    {price.pct > 0 && (
                      <>
                        <span className="text-sm text-ink-400 line-through">
                          {formatINR(rupeesToPaise(price.mrp))}
                        </span>
                        <span className="text-sm font-semibold text-terra-600">{price.pct}% OFF</span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[13px] text-red-600">
                    {parseFloat(form.sellingPrice) > parseFloat(form.mrp)
                      ? "Selling price cannot exceed MRP"
                      : "Enter MRP and selling price"}
                  </p>
                )}
                {price.valid && price.discount > 0 && (
                  <p className="mt-1 text-[11px] text-ink-400">
                    Discount auto-calculated: ₹{price.discount.toLocaleString("en-IN")} ({price.pct}%)
                  </p>
                )}
              </div>
            </>
          )}

          {section(
            "Organise",
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">Category</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="mb-1 text-xs font-medium text-ink-600">Collections</legend>
                <div className="max-h-36 space-y-1 overflow-y-auto border border-cream-300 p-2">
                  {collections.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={form.collectionIds.includes(c.id)}
                        onChange={(e) =>
                          set(
                            "collectionIds",
                            e.target.checked
                              ? [...form.collectionIds, c.id]
                              : form.collectionIds.filter((id) => id !== c.id)
                          )
                        }
                        className="h-4 w-4 accent-terra-500"
                      />
                      {c.name}
                    </label>
                  ))}
                  {collections.length === 0 && (
                    <p className="text-xs text-ink-400">No collections yet</p>
                  )}
                </div>
              </fieldset>
              {input("tags", "Tags", { hint: "comma separated" })}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["newArrival", "New arrival"],
                    ["bestSeller", "Best seller"],
                    ["onSale", "On sale"],
                    ["featured", "Featured"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => set(key, e.target.checked)}
                      className="h-4 w-4 accent-terra-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-300 bg-white/95 px-4 py-3 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
          {dirty && <span className="mr-auto text-xs font-medium text-amber-700">Unsaved changes</span>}
          {productId && (
            <Link
              href={`/admin/products/${productId}/preview`}
              className="border border-cream-400 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              Preview
            </Link>
          )}
          {status === "PUBLISHED" && (
            <button
              onClick={unpublish}
              disabled={busy !== null}
              className="border border-red-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-600 disabled:opacity-50"
            >
              {busy === "unpublish" ? "…" : "Unpublish"}
            </button>
          )}
          <button
            onClick={save}
            disabled={busy !== null}
            className="border border-ink-800 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : status === "PUBLISHED" ? "Save draft" : "Save"}
          </button>
          <button
            onClick={() => setConfirmPublish(true)}
            disabled={busy !== null || !price.valid || form.variants.length === 0}
            className="bg-terra-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-terra-700 disabled:opacity-50"
          >
            {busy === "publish" ? "Publishing…" : hasDraft || status === "PUBLISHED" ? "Publish changes" : "Publish"}
          </button>
        </div>
      </div>

      {/* publish confirmation with summary */}
      {confirmPublish && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setConfirmPublish(false)} />
          <div className="relative w-full max-w-md bg-white p-6 sm:rounded">
            <h3 className="font-display text-xl">Publish this product?</h3>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-400">Name</dt><dd className="font-medium">{form.name || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Images</dt><dd>{form.images.length}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Price</dt><dd>₹{price.sp.toLocaleString("en-IN")} {price.pct > 0 && `(${price.pct}% off)`}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Variants</dt><dd>{form.variants.length}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Total stock</dt><dd>{form.variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)} units</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-400">
              It will immediately appear in Shop, Search, its category, its collections and any homepage sections that include it.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmPublish(false)} className="flex-1 border border-cream-400 py-2.5 text-xs font-semibold uppercase tracking-wider">
                Cancel
              </button>
              <button onClick={publish} className="flex-1 bg-terra-600 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
