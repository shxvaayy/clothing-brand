import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";
import { ok, unauthorized, handleApiError } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const body = addressSchema.parse(await req.json());
    const count = await db.address.count({ where: { userId: user.id } });
    const address = await db.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          userId: user.id,
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
          isDefault: body.isDefault || count === 0,
        },
      });
    });
    return ok(address);
  } catch (e) {
    return handleApiError(e);
  }
}
