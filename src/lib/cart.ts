import { cookies } from "next/headers";
import { db } from "./db";
import { variantPrice } from "./pricing";
import { availableOf } from "./inventory";
import { validateCoupon } from "./coupons";
import { getSettings } from "./settings";
import { getSessionUser } from "./auth";

const CART_COOKIE = "rn_cart";

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  size: string;
  color: string;
  quantity: number;
  mrp: number;
  price: number;
  lineTotal: number;
  available: number;
  inStock: boolean;
};

export type CartSummary = {
  id: string;
  token: string;
  lines: CartLine[];
  itemCount: number;
  mrpTotal: number;
  subtotal: number;
  savings: number;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  shippingFee: number;
  freeShippingAbove: number;
  total: number;
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }], take: 1 },
            },
          },
        },
      },
    },
  },
};

/** Find (or lazily create) the cart for the current request. */
export async function getOrCreateCart() {
  const user = await getSessionUser();
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;

  if (user) {
    let cart = await db.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
    // merge anonymous cart into the user cart on login
    if (token) {
      const anon = await db.cart.findFirst({
        where: { token, userId: null },
        include: { items: true },
      });
      if (anon) {
        if (!cart) {
          cart = await db.cart
            .update({ where: { id: anon.id }, data: { userId: user.id } })
            .then((c) => db.cart.findUnique({ where: { id: c.id }, include: cartInclude }));
        } else {
          for (const item of anon.items) {
            await db.cartItem.upsert({
              where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
              create: { cartId: cart.id, variantId: item.variantId, quantity: item.quantity },
              update: { quantity: { increment: item.quantity } },
            });
          }
          await db.cart.delete({ where: { id: anon.id } });
          cart = await db.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
        }
      }
    }
    if (!cart) {
      cart = await db.cart.create({ data: { userId: user.id }, include: cartInclude });
    }
    return cart;
  }

  if (token) {
    const cart = await db.cart.findUnique({ where: { token }, include: cartInclude });
    if (cart) return cart;
  }
  return db.cart.create({ data: {}, include: cartInclude });
}

type CartWithItems = NonNullable<Awaited<ReturnType<typeof getOrCreateCart>>>;

/** Compute display + checkout totals from live DB state. */
export async function summarizeCart(cart: CartWithItems): Promise<CartSummary> {
  const settings = await getSettings();
  const user = await getSessionUser();

  const lines: CartLine[] = cart.items
    .filter((i) => i.variant.product.status === "PUBLISHED" && i.variant.active)
    .map((i) => {
      const p = variantPrice(i.variant.product, i.variant);
      const available = availableOf(i.variant);
      return {
        id: i.id,
        variantId: i.variantId,
        productId: i.variant.productId,
        name: i.variant.product.name,
        slug: i.variant.product.slug,
        image: i.variant.product.images[0]?.url ?? null,
        size: i.variant.size,
        color: i.variant.color,
        quantity: Math.min(i.quantity, Math.max(available, 0)) || i.quantity,
        mrp: p.mrp,
        price: p.price,
        lineTotal: p.price * i.quantity,
        available,
        inStock: available >= i.quantity,
      };
    });

  const subtotal = lines.reduce((s, l) => (l.inStock ? s + l.lineTotal : s), 0);
  const mrpTotal = lines.reduce((s, l) => (l.inStock ? s + l.mrp * l.quantity : s), 0);

  let couponDiscount = 0;
  let couponError: string | null = null;
  if (cart.couponCode && subtotal > 0) {
    const res = await validateCoupon(cart.couponCode, subtotal, user?.id);
    if (res.ok) couponDiscount = res.discount;
    else couponError = res.error;
  }

  const afterDiscount = subtotal - couponDiscount;
  const shippingFee =
    subtotal === 0 || afterDiscount >= settings.freeShippingAbove ? 0 : settings.shippingFee;

  return {
    id: cart.id,
    token: cart.token,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    mrpTotal,
    subtotal,
    savings: mrpTotal - subtotal,
    couponCode: cart.couponCode,
    couponDiscount,
    couponError,
    shippingFee,
    freeShippingAbove: settings.freeShippingAbove,
    total: afterDiscount + shippingFee,
  };
}

export async function getCartSummary() {
  const cart = await getOrCreateCart();
  return summarizeCart(cart);
}

export { CART_COOKIE };
