import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  slug: z.string().min(1).max(60),
  title: z.string().min(1).max(120),
  body: z.string().max(50_000),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(170).optional(),
  published: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN", "EDITOR"]);
    const body = schema.parse(await req.json());
    const existing = await db.contentPage.findUnique({ where: { slug: body.slug } });
    if (!existing) return badRequest("Page not found");
    const page = await db.contentPage.update({
      where: { slug: body.slug },
      data: {
        title: body.title,
        body: body.body,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        published: body.published,
      },
    });
    await audit({
      adminId: admin.id, actor: admin.email, action: "CONTENT_PAGE_UPDATED",
      entity: "ContentPage", entityId: page.id, after: { slug: body.slug },
    });
    return ok(page);
  } catch (e) {
    return handleApiError(e);
  }
}
