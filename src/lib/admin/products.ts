import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { ProductInput } from "@/lib/validation";
import { audit } from "@/lib/audit";

/**
 * Apply a full ProductInput onto a product's live columns, variants,
 * images and collections. Runs inside a transaction.
 */
async function applyInput(
  tx: Prisma.TransactionClient,
  productId: string,
  input: ProductInput,
  actor: string
) {
  await tx.product.update({
    where: { id: productId },
    data: {
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      description: input.description,
      shortDescription: input.shortDescription || null,
      fabric: input.fabric || null,
      fit: input.fit || null,
      care: input.care || null,
      mrp: input.mrp,
      sellingPrice: input.sellingPrice,
      costPrice: input.costPrice ?? null,
      lowStockThreshold: input.lowStockThreshold,
      categoryId: input.categoryId || null,
      tags: input.tags,
      featured: input.featured,
      bestSeller: input.bestSeller,
      newArrival: input.newArrival,
      onSale: input.onSale,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      seoKeywords: input.seoKeywords || null,
    },
  });

  // ----- images: replace-all sync, order preserved, first = primary unless set
  await tx.productImage.deleteMany({ where: { productId } });
  if (input.images.length > 0) {
    await tx.productImage.createMany({
      data: input.images.map((img, i) => ({
        productId,
        url: img.url,
        alt: img.alt || null,
        sortOrder: i,
        isPrimary: i === 0,
      })),
    });
  }

  // ----- variants: diff sync (keep ids so order history stays linked)
  const existing = await tx.productVariant.findMany({
    where: { productId },
    include: { _count: { select: { orderItems: true, cartItems: true } } },
  });
  const keepIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id!));

  for (const v of existing) {
    if (!keepIds.has(v.id)) {
      if (v._count.orderItems > 0) {
        // has order history — deactivate instead of delete
        await tx.productVariant.update({ where: { id: v.id }, data: { active: false } });
      } else {
        await tx.productVariant.delete({ where: { id: v.id } });
      }
    }
  }

  for (const [i, v] of input.variants.entries()) {
    const variantSku = `${input.sku}-${v.color.toUpperCase().replace(/\s+/g, "")}-${v.size.toUpperCase().replace(/\s+/g, "")}`;
    if (v.id) {
      const prev = existing.find((e) => e.id === v.id);
      await tx.productVariant.update({
        where: { id: v.id },
        data: {
          size: v.size,
          color: v.color,
          colorHex: v.colorHex || null,
          priceOverride: v.priceOverride ?? null,
          sku: variantSku,
          active: v.active,
        },
      });
      // stock changes go through the audited path
      if (prev && prev.stock !== v.stock) {
        await tx.productVariant.update({ where: { id: v.id }, data: { stock: v.stock } });
        await tx.inventoryTransaction.create({
          data: {
            variantId: v.id,
            delta: v.stock - prev.stock,
            previous: prev.stock,
            next: v.stock,
            reason: "MANUAL_ADJUST",
            actor,
            note: "Updated from product form",
          },
        });
      }
    } else {
      const created = await tx.productVariant.create({
        data: {
          productId,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex || null,
          priceOverride: v.priceOverride ?? null,
          sku: `${variantSku}-${i}${Date.now().toString(36).slice(-3)}`,
          stock: v.stock,
          active: v.active,
        },
      });
      if (v.stock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            variantId: created.id,
            delta: v.stock,
            previous: 0,
            next: v.stock,
            reason: "RESTOCK",
            actor,
            note: "Initial stock",
          },
        });
      }
    }
  }

  // ----- collections
  await tx.productCollection.deleteMany({ where: { productId } });
  if (input.collectionIds.length > 0) {
    await tx.productCollection.createMany({
      data: input.collectionIds.map((collectionId, i) => ({
        productId,
        collectionId,
        sortOrder: i,
      })),
    });
  }
}

export async function createProduct(input: ProductInput, actor: string, adminId: string) {
  const product = await db.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description,
        mrp: input.mrp,
        sellingPrice: input.sellingPrice,
        status: "DRAFT",
      },
    });
    await applyInput(tx, created.id, input, actor);
    return created;
  });
  await audit({
    adminId,
    actor,
    action: "PRODUCT_CREATED",
    entity: "Product",
    entityId: product.id,
    after: { name: input.name, slug: input.slug },
  });
  return product;
}

/**
 * Save edits. DRAFT/UNPUBLISHED products update live columns directly.
 * PUBLISHED products store edits in draftData — the storefront keeps showing
 * the live version until Publish is clicked. Exception: stock and variant
 * availability always apply immediately (inventory is real-time by design).
 */
export async function saveProduct(productId: string, input: ProductInput, actor: string, adminId: string) {
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });

  if (product.status === "PUBLISHED") {
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { draftData: input as unknown as Prisma.InputJsonValue },
      });
      // inventory + variant stock changes are applied live even while other
      // edits stay in draft
      const existing = await tx.productVariant.findMany({ where: { productId } });
      for (const v of input.variants) {
        if (!v.id) continue;
        const prev = existing.find((e) => e.id === v.id);
        if (prev && prev.stock !== v.stock) {
          await tx.productVariant.update({ where: { id: v.id }, data: { stock: v.stock } });
          await tx.inventoryTransaction.create({
            data: {
              variantId: v.id,
              delta: v.stock - prev.stock,
              previous: prev.stock,
              next: v.stock,
              reason: "MANUAL_ADJUST",
              actor,
              note: "Updated from product form (live product)",
            },
          });
        }
      }
    });
    await audit({
      adminId, actor, action: "PRODUCT_DRAFT_SAVED", entity: "Product", entityId: productId,
    });
    return { savedTo: "draft" as const };
  }

  await db.$transaction((tx) => applyInput(tx, productId, input, actor));
  await audit({ adminId, actor, action: "PRODUCT_UPDATED", entity: "Product", entityId: productId });
  return { savedTo: "live" as const };
}

export async function publishProduct(productId: string, actor: string, adminId: string) {
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  await db.$transaction(async (tx) => {
    if (product.draftData) {
      await applyInput(tx, productId, product.draftData as unknown as ProductInput, actor);
    }
    await tx.product.update({
      where: { id: productId },
      data: {
        status: "PUBLISHED",
        draftData: Prisma.DbNull,
        publishedAt: product.publishedAt ?? new Date(),
      },
    });
  });
  await audit({
    adminId, actor, action: "PRODUCT_PUBLISHED", entity: "Product", entityId: productId,
    before: { status: product.status }, after: { status: "PUBLISHED" },
  });
}

export async function unpublishProduct(productId: string, actor: string, adminId: string) {
  const before = await db.product.findUniqueOrThrow({ where: { id: productId } });
  await db.product.update({ where: { id: productId }, data: { status: "UNPUBLISHED" } });
  await audit({
    adminId, actor, action: "PRODUCT_UNPUBLISHED", entity: "Product", entityId: productId,
    before: { status: before.status }, after: { status: "UNPUBLISHED" },
  });
}

/** Product as the edit form expects it (draftData wins if present). */
export async function productForEdit(productId: string) {
  const p = await db.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: [{ color: "asc" }, { createdAt: "asc" }] },
      collections: true,
    },
  });
  if (!p) return null;

  const live: ProductInput & { status: string; hasDraft: boolean } = {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    shortDescription: p.shortDescription ?? "",
    fabric: p.fabric ?? "",
    fit: p.fit ?? "",
    care: p.care ?? "",
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    lowStockThreshold: p.lowStockThreshold,
    categoryId: p.categoryId,
    collectionIds: p.collections.map((c) => c.collectionId),
    tags: p.tags,
    featured: p.featured,
    bestSeller: p.bestSeller,
    newArrival: p.newArrival,
    onSale: p.onSale,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    seoKeywords: p.seoKeywords ?? "",
    variants: p.variants
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        priceOverride: v.priceOverride,
        stock: v.stock,
        active: v.active,
      })),
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? "" })),
    status: p.status,
    hasDraft: Boolean(p.draftData),
  };

  if (p.draftData) {
    const draft = p.draftData as unknown as ProductInput;
    // live stock always wins over the stale draft snapshot
    const stockById = new Map(p.variants.map((v) => [v.id, v.stock]));
    return {
      ...live,
      ...draft,
      variants: draft.variants.map((v) => ({
        ...v,
        stock: v.id && stockById.has(v.id) ? stockById.get(v.id)! : v.stock,
      })),
      status: p.status,
      hasDraft: true,
    };
  }
  return live;
}
