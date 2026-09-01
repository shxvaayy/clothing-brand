import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  action: z.enum(["create", "update", "delete", "move", "toggle"]),
  id: z.string().optional(),
  type: z
    .enum(["HERO", "PRODUCT_GRID", "CATEGORY_GRID", "COLLECTION_BANNER", "BRAND_STORY", "FAQ_PREVIEW"])
    .optional(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(200).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  direction: z.enum(["up", "down"]).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN", "EDITOR"]);
    const body = schema.parse(await req.json());

    if (body.action === "create") {
      if (!body.type) return badRequest("Section type required");
      const max = await db.homepageSection.aggregate({ _max: { sortOrder: true } });
      const section = await db.homepageSection.create({
        data: {
          type: body.type,
          title: body.title,
          subtitle: body.subtitle,
          config: (body.config ?? {}) as Prisma.InputJsonValue,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
          published: false,
        },
      });
      await audit({ adminId: admin.id, actor: admin.email, action: "HOMEPAGE_SECTION_CREATED", entity: "HomepageSection", entityId: section.id, after: { type: body.type } });
      return ok(section);
    }

    if (!body.id) return badRequest("id required");
    const section = await db.homepageSection.findUnique({ where: { id: body.id } });
    if (!section) return badRequest("Section not found");

    if (body.action === "delete") {
      await db.homepageSection.delete({ where: { id: body.id } });
      await audit({ adminId: admin.id, actor: admin.email, action: "HOMEPAGE_SECTION_DELETED", entity: "HomepageSection", entityId: body.id });
      return ok({ done: true });
    }

    if (body.action === "toggle") {
      const updated = await db.homepageSection.update({
        where: { id: body.id },
        data: { published: !section.published },
      });
      await audit({ adminId: admin.id, actor: admin.email, action: "HOMEPAGE_SECTION_TOGGLED", entity: "HomepageSection", entityId: body.id, after: { published: updated.published } });
      return ok(updated);
    }

    if (body.action === "move") {
      const all = await db.homepageSection.findMany({ orderBy: { sortOrder: "asc" } });
      const idx = all.findIndex((s) => s.id === body.id);
      const swapWith = body.direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= all.length) return ok({ done: true });
      await db.$transaction([
        db.homepageSection.update({ where: { id: all[idx].id }, data: { sortOrder: all[swapWith].sortOrder } }),
        db.homepageSection.update({ where: { id: all[swapWith].id }, data: { sortOrder: all[idx].sortOrder } }),
      ]);
      return ok({ done: true });
    }

    // update
    const updated = await db.homepageSection.update({
      where: { id: body.id },
      data: {
        title: body.title,
        subtitle: body.subtitle,
        ...(body.config ? { config: body.config as Prisma.InputJsonValue } : {}),
      },
    });
    await audit({ adminId: admin.id, actor: admin.email, action: "HOMEPAGE_SECTION_UPDATED", entity: "HomepageSection", entityId: body.id });
    return ok(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
