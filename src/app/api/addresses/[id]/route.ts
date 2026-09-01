import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";
import { ok, badRequest, unauthorized, handleApiError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;
    const existing = await db.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) return badRequest("Address not found");

    const body = addressSchema.parse(await req.json());
    const address = await db.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      return tx.address.update({
        where: { id },
        data: {
          label: body.label,
          fullName: body.fullName,
          phone: body.phone,
          line1: body.line1,
          line2: body.line2 || null,
          landmark: body.landmark || null,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          country: body.country,
          isDefault: body.isDefault ?? existing.isDefault,
        },
      });
    });
    return ok(address);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;
    const existing = await db.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) return badRequest("Address not found");
    await db.address.delete({ where: { id } });
    return ok({ done: true });
  } catch (e) {
    return handleApiError(e);
  }
}
