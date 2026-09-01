import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateCart, summarizeCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";
import { getSessionUser } from "@/lib/auth";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const { code } = z.object({ code: z.string().min(1).max(30) }).parse(await req.json());
    const [cart, user] = await Promise.all([getOrCreateCart(), getSessionUser()]);
    const summary = await summarizeCart(cart);
    if (summary.subtotal === 0) return badRequest("Your bag is empty");

    const result = await validateCoupon(code, summary.subtotal, user?.id);
    if (!result.ok) return badRequest(result.error);

    await db.cart.update({ where: { id: cart.id }, data: { couponCode: result.code } });
    return ok({ code: result.code, discount: result.discount });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE() {
  try {
    const cart = await getOrCreateCart();
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    return ok({ done: true });
  } catch (e) {
    return handleApiError(e);
  }
}
