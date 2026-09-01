import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api-utils";
import { CART_COOKIE } from "@/lib/cart";

export async function GET() {
  try {
    const user = await getSessionUser();
    let cart = 0;
    let wishlist = 0;
    if (user) {
      const [c, w] = await Promise.all([
        db.cartItem.aggregate({ where: { cart: { userId: user.id } }, _sum: { quantity: true } }),
        db.wishlistItem.count({ where: { userId: user.id } }),
      ]);
      cart = c._sum.quantity ?? 0;
      wishlist = w;
    } else {
      const token = (await cookies()).get(CART_COOKIE)?.value;
      if (token) {
        const c = await db.cartItem.aggregate({
          where: { cart: { token } },
          _sum: { quantity: true },
        });
        cart = c._sum.quantity ?? 0;
      }
    }
    return ok({ cart, wishlist });
  } catch (e) {
    return handleApiError(e);
  }
}
