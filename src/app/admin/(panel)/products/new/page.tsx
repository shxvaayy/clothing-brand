import { db } from "@/lib/db";
import ProductForm, { type ProductFormValue } from "@/components/admin/ProductForm";

export const metadata = { title: "New Product · Admin" };

const empty: ProductFormValue = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  shortDescription: "",
  fabric: "",
  fit: "",
  care: "",
  mrp: "",
  sellingPrice: "",
  lowStockThreshold: "5",
  categoryId: "",
  collectionIds: [],
  tags: "",
  featured: false,
  bestSeller: false,
  newArrival: true,
  onSale: false,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  variants: [{ size: "M", color: "", colorHex: "", priceOverride: "", stock: "0", active: true }],
  images: [],
};

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.collection.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="mb-5 font-display text-2xl">New product</h1>
      <ProductForm
        initial={empty}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
