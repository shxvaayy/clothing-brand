import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { variantPrice } from "./pricing";
import { availableOf, stockState, type StockState } from "./inventory";

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  hoverImage: string | null;
  mrp: number;
  price: number;
  discountPercent: number;
  newArrival: boolean;
  bestSeller: boolean;
  onSale: boolean;
  soldOut: boolean;
  colors: string[];
};

const cardInclude = {
  images: { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }], take: 2 },
  variants: { where: { active: true }, select: { stock: true, reservedStock: true, colorHex: true, color: true } },
} satisfies Prisma.ProductInclude;

type ProductForCard = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toCard(p: ProductForCard): ProductCard {
  const price = variantPrice(p);
  const totalAvailable = p.variants.reduce((s, v) => s + availableOf(v), 0);
  const colors = [...new Set(p.variants.map((v) => v.colorHex ?? v.color))].slice(0, 5);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0]?.url ?? null,
    hoverImage: p.images[1]?.url ?? null,
    mrp: price.mrp,
    price: price.price,
    discountPercent: price.discountPercent,
    newArrival: p.newArrival,
    bestSeller: p.bestSeller,
    onSale: p.onSale,
    soldOut: totalAvailable <= 0,
    colors,
  };
}

export type ShopFilters = {
  category?: string; // slug
  collection?: string; // slug
  sizes?: string[];
  colors?: string[];
  minPrice?: number; // paise
  maxPrice?: number;
  minDiscount?: number;
  inStockOnly?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  onSale?: boolean;
  q?: string;
};

export type ShopSort =
  | "recommended"
  | "newest"
  | "best-selling"
  | "price-asc"
  | "price-desc"
  | "discount";

export function buildWhere(f: ShopFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "PUBLISHED" };
  if (f.category) where.category = { OR: [{ slug: f.category }, { parent: { slug: f.category } }] };
  if (f.collection) where.collections = { some: { collection: { slug: f.collection, published: true } } };
  if (f.newArrival) where.newArrival = true;
  if (f.bestSeller) where.bestSeller = true;
  if (f.onSale) where.onSale = true;
  if (f.minPrice !== undefined || f.maxPrice !== undefined)
    where.sellingPrice = { gte: f.minPrice, lte: f.maxPrice };
  if (f.sizes?.length || f.colors?.length || f.inStockOnly) {
    where.variants = {
      some: {
        active: true,
        ...(f.sizes?.length ? { size: { in: f.sizes } } : {}),
        ...(f.colors?.length ? { color: { in: f.colors, mode: "insensitive" } } : {}),
        ...(f.inStockOnly ? { stock: { gt: 0 } } : {}),
      },
    };
  }
  if (f.q) {
    const q = f.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { tags: { hasSome: q.toLowerCase().split(/\s+/) } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

export function buildOrderBy(sort: ShopSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    case "price-asc":
      return [{ sellingPrice: "asc" }];
    case "price-desc":
      return [{ sellingPrice: "desc" }];
    case "best-selling":
      return [{ orderItems: { _count: "desc" } }];
    case "discount":
      return [{ sellingPrice: "asc" }]; // refined below in query for real % — kept simple + indexed
    case "recommended":
    default:
      return [{ featured: "desc" }, { bestSeller: "desc" }, { publishedAt: "desc" }];
  }
}

const PAGE_SIZE = 24;

export async function queryProducts(f: ShopFilters, sort: ShopSort = "recommended", page = 1) {
  const where = buildWhere(f);
  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: buildOrderBy(sort),
      include: cardInclude,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  let cards = items.map(toCard);
  if (sort === "discount") cards = cards.sort((a, b) => b.discountPercent - a.discountPercent);
  if (f.minDiscount) cards = cards.filter((c) => c.discountPercent >= (f.minDiscount ?? 0));
  return { cards, total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) };
}

export type VariantView = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  price: number;
  mrp: number;
  discountPercent: number;
  available: number;
  state: StockState;
};

export async function getProductBySlug(slug: string, opts?: { includeDraft?: boolean }) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: { where: { active: true }, orderBy: [{ color: "asc" }, { createdAt: "asc" }] },
      category: { include: { parent: true } },
      collections: { include: { collection: true } },
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!product) return null;
  if (product.status !== "PUBLISHED" && !opts?.includeDraft) return null;

  const variants: VariantView[] = product.variants.map((v) => {
    const p = variantPrice(product, v);
    const available = availableOf(v);
    return {
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      price: p.price,
      mrp: p.mrp,
      discountPercent: p.discountPercent,
      available,
      state: stockState(available, product.lowStockThreshold),
    };
  });

  const ratings = await db.review.aggregate({
    where: { productId: product.id, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });

  return {
    ...product,
    variantViews: variants,
    avgRating: ratings._avg.rating,
    reviewCount: ratings._count,
  };
}

export async function getRelatedProducts(productId: string, categoryId: string | null, take = 8) {
  const items = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: productId },
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ bestSeller: "desc" }, { publishedAt: "desc" }],
    include: cardInclude,
    take,
  });
  return items.map(toCard);
}

export async function getCardsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const items = await db.product.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: cardInclude,
  });
  const map = new Map(items.map((i) => [i.id, toCard(i)]));
  return ids.map((id) => map.get(id)).filter((x): x is ProductCard => Boolean(x));
}

export { cardInclude };
