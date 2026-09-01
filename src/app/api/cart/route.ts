import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getOrCreateCart, summarizeCart, CART_COOKIE } from "@/lib/cart";
import { availableOf } from "@/lib/inventory";
import { cartAddSchema, cartUpdateSchema } from "@/lib/validation";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

async function ensureCartCookie(token: string) {
  const store = await cookies();
  if (store.get(CART_COOKIE)?.value !== token) {
    store.set(CART_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
}

export async function GET() {
  try {
    const cart = await getOrCreateCart();
    await ensureCartCookie(cart.token);
    return ok(await summarizeCart(cart));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = cartAddSchema.parse(await req.json());
    const variant = await db.productVariant.findUnique({
      where: { id: body.variantId },
      include: { product: { select: { status: true, name: true } } },
    });
    if (!variant || !variant.active || variant.product.status !== "PUBLISHED") {
      return badRequest("This product is not available");
    }

    const cart = await getOrCreateCart();
    await ensureCartCookie(cart.token);

    const existing = cart.items.find((i) => i.variantId === body.variantId);
    const requested = (existing?.quantity ?? 0) + body.quantity;
    const available = availableOf(variant);
    if (requested > available) {
      return badRequest(
        available === 0
          ? "This item is out of stock"
          : `Only ${available} left in stock${existing ? " (including what's in your bag)" : ""}`
      );
    }
    if (requested > 10) return badRequest("Maximum 10 units per item");

    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: body.variantId } },
      create: { cartId: cart.id, variantId: body.variantId, quantity: body.quantity },
      update: { quantity: requested },
    });
    const fresh = await getOrCreateCart();
    return ok(await summarizeCart(fresh));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = cartUpdateSchema.parse(await req.json());
    const cart = await getOrCreateCart();
    const item = cart.items.find((i) => i.id === body.itemId);
    if (!item) return badRequest("Item not found in your bag");

    if (body.quantity === 0) {
      await db.cartItem.delete({ where: { id: item.id } });
    } else {
      const available = availableOf(item.variant);
      if (body.quantity > available) {
        return badRequest(`Only ${available} left in stock`);
      }
      await db.cartItem.update({ where: { id: item.id }, data: { quantity: body.quantity } });
    }
    const fresh = await getOrCreateCart();
    return ok(await summarizeCart(fresh));
  } catch (e) {
    return handleApiError(e);
  }
}
