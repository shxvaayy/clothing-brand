import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { productForEdit } from "@/lib/admin/products";
import ProductForm, { type ProductFormValue } from "@/components/admin/ProductForm";
import { paiseToRupees } from "@/lib/money";

export const metadata = { title: "Edit Product · Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, categories, collections] = await Promise.all([
    productForEdit(id),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.collection.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!data) notFound();

  const initial: ProductFormValue = {
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    description: data.description,
    shortDescription: data.shortDescription ?? "",
    fabric: data.fabric ?? "",
    fit: data.fit ?? "",
    care: data.care ?? "",
    mrp: String(paiseToRupees(data.mrp)),
    sellingPrice: String(paiseToRupees(data.sellingPrice)),
    lowStockThreshold: String(data.lowStockThreshold),
    categoryId: data.categoryId ?? "",
    collectionIds: data.collectionIds,
    tags: data.tags.join(", "),
    featured: data.featured,
    bestSeller: data.bestSeller,
    newArrival: data.newArrival,
    onSale: data.onSale,
    seoTitle: data.seoTitle ?? "",
    seoDescription: data.seoDescription ?? "",
    seoKeywords: data.seoKeywords ?? "",
    variants: data.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex ?? "",
      priceOverride: v.priceOverride != null ? String(paiseToRupees(v.priceOverride)) : "",
      stock: String(v.stock),
      active: v.active,
    })),
    images: data.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? "" })),
  };

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl">Edit product</h1>
      <ProductForm
        productId={id}
        status={data.status}
        hasDraft={data.hasDraft}
        initial={initial}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
