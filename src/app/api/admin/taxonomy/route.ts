import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/seo";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

// One endpoint managing both categories and collections (kind discriminator)
const schema = z.object({
  kind: z.enum(["category", "collection"]),
  action: z.enum(["create", "update", "delete"]),
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80).optional(),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  image: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
  published: z.boolean().optional(),
  active: z.boolean().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(170).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN", "EDITOR"]);
    const body = schema.parse(await req.json());
    const slug = body.slug?.trim() || (body.name ? slugify(body.name) : undefined);

    if (body.kind === "category") {
      if (body.action === "create") {
        if (!body.name || !slug) return badRequest("Name is required");
        const item = await db.category.create({
          data: {
            name: body.name, slug, description: body.description, image: body.image,
            parentId: body.parentId ?? null, seoTitle: body.seoTitle, seoDescription: body.seoDescription,
          },
        });
        await audit({ adminId: admin.id, actor: admin.email, action: "CATEGORY_CREATED", entity: "Category", entityId: item.id, after: { name: item.name } });
        return ok(item);
      }
      if (!body.id) return badRequest("id required");
      if (body.action === "delete") {
        const inUse = await db.product.count({ where: { categoryId: body.id } });
        if (inUse > 0) return badRequest(`${inUse} products use this category — move them first`);
        await db.category.delete({ where: { id: body.id } });
        await audit({ adminId: admin.id, actor: admin.email, action: "CATEGORY_DELETED", entity: "Category", entityId: body.id });
        return ok({ done: true });
      }
      const item = await db.category.update({
        where: { id: body.id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(slug ? { slug } : {}),
          description: body.description,
          image: body.image,
          ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
          seoTitle: body.seoTitle,
          seoDescription: body.seoDescription,
        },
      });
      await audit({ adminId: admin.id, actor: admin.email, action: "CATEGORY_UPDATED", entity: "Category", entityId: item.id });
      return ok(item);
    }

    // collection
    if (body.action === "create") {
      if (!body.name || !slug) return badRequest("Name is required");
      const item = await db.collection.create({
        data: {
          name: body.name, slug, description: body.description, image: body.image,
          published: body.published ?? true, seoTitle: body.seoTitle, seoDescription: body.seoDescription,
        },
      });
      await audit({ adminId: admin.id, actor: admin.email, action: "COLLECTION_CREATED", entity: "Collection", entityId: item.id, after: { name: item.name } });
      return ok(item);
    }
    if (!body.id) return badRequest("id required");
    if (body.action === "delete") {
      await db.collection.delete({ where: { id: body.id } });
      await audit({ adminId: admin.id, actor: admin.email, action: "COLLECTION_DELETED", entity: "Collection", entityId: body.id });
      return ok({ done: true });
    }
    const item = await db.collection.update({
      where: { id: body.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(slug ? { slug } : {}),
        description: body.description,
        image: body.image,
        ...(body.published !== undefined ? { published: body.published } : {}),
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
      },
    });
    await audit({ adminId: admin.id, actor: admin.email, action: "COLLECTION_UPDATED", entity: "Collection", entityId: item.id });
    return ok(item);
  } catch (e) {
    return handleApiError(e);
  }
}
