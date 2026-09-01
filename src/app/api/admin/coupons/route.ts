import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { couponInputSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  action: z.enum(["create", "update", "delete", "toggle"]),
  id: z.string().optional(),
  coupon: couponInputSchema.optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN"]);
    const body = schema.parse(await req.json());

    if (body.action === "create") {
      if (!body.coupon) return badRequest("Coupon data required");
      const existing = await db.coupon.findUnique({ where: { code: body.coupon.code } });
      if (existing) return badRequest("A coupon with this code already exists");
      const coupon = await db.coupon.create({
        data: {
          code: body.coupon.code,
          type: body.coupon.type,
          value: body.coupon.value,
          minCartValue: body.coupon.minCartValue,
          maxDiscount: body.coupon.maxDiscount ?? null,
          startsAt: body.coupon.startsAt ? new Date(body.coupon.startsAt) : null,
          endsAt: body.coupon.endsAt ? new Date(body.coupon.endsAt) : null,
          usageLimit: body.coupon.usageLimit ?? null,
          perUserLimit: body.coupon.perUserLimit ?? null,
          active: body.coupon.active,
        },
      });
      await audit({ adminId: admin.id, actor: admin.email, action: "COUPON_CREATED", entity: "Coupon", entityId: coupon.id, after: { code: coupon.code } });
      return ok(coupon);
    }

    if (!body.id) return badRequest("id required");
    if (body.action === "delete") {
      await db.coupon.delete({ where: { id: body.id } });
      await audit({ adminId: admin.id, actor: admin.email, action: "COUPON_DELETED", entity: "Coupon", entityId: body.id });
      return ok({ done: true });
    }
    if (body.action === "toggle") {
      const c = await db.coupon.findUniqueOrThrow({ where: { id: body.id } });
      const updated = await db.coupon.update({ where: { id: body.id }, data: { active: !c.active } });
      await audit({ adminId: admin.id, actor: admin.email, action: "COUPON_TOGGLED", entity: "Coupon", entityId: body.id, after: { active: updated.active } });
      return ok(updated);
    }
    // update
    if (!body.coupon) return badRequest("Coupon data required");
    const updated = await db.coupon.update({
      where: { id: body.id },
      data: {
        type: body.coupon.type,
        value: body.coupon.value,
        minCartValue: body.coupon.minCartValue,
        maxDiscount: body.coupon.maxDiscount ?? null,
        startsAt: body.coupon.startsAt ? new Date(body.coupon.startsAt) : null,
        endsAt: body.coupon.endsAt ? new Date(body.coupon.endsAt) : null,
        usageLimit: body.coupon.usageLimit ?? null,
        perUserLimit: body.coupon.perUserLimit ?? null,
        active: body.coupon.active,
      },
    });
    await audit({ adminId: admin.id, actor: admin.email, action: "COUPON_UPDATED", entity: "Coupon", entityId: body.id });
    return ok(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
