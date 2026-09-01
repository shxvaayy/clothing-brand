import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, badRequest, unauthorized, handleApiError } from "@/lib/api-utils";

const schema = z.object({ productId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const { productId } = schema.parse(await req.json());
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return badRequest("Product not found");
    await db.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId },
      update: {},
    });
    return ok({ wished: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const { productId } = schema.parse(await req.json());
    await db.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
    return ok({ wished: false });
  } catch (e) {
    return handleApiError(e);
  }
}
