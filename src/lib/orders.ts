import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { reserveStock, commitReservation, releaseReservation, restoreStock } from "./inventory";
import { summarizeCart, getOrCreateCart } from "./cart";
import { validateCoupon } from "./coupons";
import { sendOrderConfirmation, sendOrderStatusUpdate } from "./email/send";
import { trackServerEvent } from "./analytics";

const RESERVATION_MINUTES = 25;

export function generateOrderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RN-${t}${r}`;
}

export type AddressInput = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

/**
 * Create an order from the current cart, reserving stock atomically.
 * Returns the order (PAYMENT_PENDING) ready for Razorpay order creation.
 */
export async function createOrderFromCart(params: {
  userId?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  address: AddressInput;
  utm?: { source?: string; medium?: string; campaign?: string };
}) {
  const cart = await getOrCreateCart();
  const summary = await summarizeCart(cart);

  const lines = summary.lines.filter((l) => l.inStock && l.quantity > 0);
  if (lines.length === 0) throw new OrderError("Your bag is empty or items are out of stock");
  if (summary.lines.some((l) => !l.inStock))
    throw new OrderError("Some items in your bag are no longer available. Please review your bag.");

  // Re-validate coupon at order time
  let discount = 0;
  let couponId: string | null = null;
  if (summary.couponCode) {
    const res = await validateCoupon(summary.couponCode, summary.subtotal, params.userId);
    if (!res.ok) throw new OrderError(res.error);
    discount = res.discount;
    couponId = res.couponId;
  }

  const total = summary.subtotal - discount + summary.shippingFee;

  const order = await db.$transaction(async (tx) => {
    // Reserve stock for every line — fails the whole order if anything is short
    for (const line of lines) {
      const r = await reserveStock(tx, line.variantId, line.quantity);
      if (!r.ok)
        throw new OrderError(
          `"${line.name}" (${line.size}) has only ${r.available} left. Please update your bag.`
        );
    }

    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: params.userId ?? null,
        guestEmail: params.guestEmail ?? null,
        guestPhone: params.guestPhone ?? null,
        status: "PAYMENT_PENDING",
        subtotal: summary.subtotal,
        mrpTotal: summary.mrpTotal,
        discount,
        couponCode: summary.couponCode,
        shippingFee: summary.shippingFee,
        total,
        addressSnapshot: params.address as unknown as Prisma.InputJsonValue,
        reservationExpiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60_000),
        utmSource: params.utm?.source,
        utmMedium: params.utm?.medium,
        utmCampaign: params.utm?.campaign,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            image: l.image,
            size: l.size,
            color: l.color,
            sku: l.variantId,
            mrp: l.mrp,
            price: l.price,
            quantity: l.quantity,
          })),
        },
        events: { create: { status: "PAYMENT_PENDING", note: "Order created, awaiting payment" } },
      },
      include: { items: true },
    });

    if (couponId) {
      await tx.couponRedemption.create({
        data: {
          couponId,
          orderId: created.id,
          userId: params.userId ?? null,
          amount: discount,
        },
      });
    }
    return created;
  });

  return order;
}

/**
 * Mark an order paid. Idempotent — safe to call from both the browser
 * verification flow and the Razorpay webhook.
 */
export async function markOrderPaid(params: {
  orderId: string;
  razorpayPaymentId?: string;
  signature?: string;
  method?: string;
  provider?: string;
}) {
  const result = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM "Order" WHERE id = ${params.orderId} FOR UPDATE`;
    if (rows.length === 0) throw new OrderError("Order not found");
    if (rows[0].status !== "PAYMENT_PENDING") return { alreadyPaid: true as const };

    const order = await tx.order.findUniqueOrThrow({
      where: { id: params.orderId },
      include: { items: true },
    });

    for (const item of order.items) {
      if (item.variantId) await commitReservation(tx, item.variantId, item.quantity, order.id);
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", reservationExpiresAt: null },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, status: "PAID", note: "Payment confirmed" },
    });
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: params.razorpayPaymentId,
        signature: params.signature,
        method: params.method,
      },
    });

    // Clear purchased items from the cart
    if (order.userId) {
      const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      }
    }

    return { alreadyPaid: false as const, order };
  });

  if (!result.alreadyPaid && result.order) {
    void sendOrderConfirmation(result.order.id).catch((e) =>
      console.error("order confirmation email failed", e)
    );
    void trackServerEvent({
      type: "purchase",
      visitorId: "server",
      sessionId: "server",
      userId: result.order.userId,
      meta: { orderId: result.order.id, total: result.order.total },
    });
  }
  return result;
}

/** Payment failed — release reservations, keep the order for analytics. */
export async function markOrderPaymentFailed(orderId: string, note?: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "PAYMENT_PENDING") return;
    for (const item of order.items) {
      if (item.variantId) await releaseReservation(tx, item.variantId, item.quantity);
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", reservationExpiresAt: null },
    });
    await tx.orderEvent.create({
      data: { orderId, status: "CANCELLED", note: note ?? "Payment failed" },
    });
    await tx.payment.updateMany({
      where: { orderId, status: { in: ["CREATED", "PENDING"] } },
      data: { status: "FAILED" },
    });
  });
}

const STATUS_FLOW: Record<string, string[]> = {
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  RETURNED: ["REFUNDED"],
};

export function allowedNextStatuses(current: string): string[] {
  return STATUS_FLOW[current] ?? [];
}

/** Admin/status transition with stock restoration on cancel/return. */
export async function transitionOrder(params: {
  orderId: string;
  toStatus: string;
  actor: string;
  note?: string;
  restock?: boolean;
}) {
  const { orderId, toStatus, actor, note } = params;
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    const allowed = allowedNextStatuses(order.status);
    if (!allowed.includes(toStatus))
      throw new OrderError(`Cannot move order from ${order.status} to ${toStatus}`);

    if ((toStatus === "CANCELLED" || toStatus === "RETURNED") && params.restock !== false) {
      const reason = toStatus === "CANCELLED" ? "CANCELLATION" : "RETURN";
      for (const item of order.items) {
        if (item.variantId)
          await restoreStock(tx, item.variantId, item.quantity, reason, order.id, actor);
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: toStatus as never },
    });
    await tx.orderEvent.create({ data: { orderId, status: toStatus, note } });
  });

  void sendOrderStatusUpdate(orderId, toStatus).catch((e) =>
    console.error("status email failed", e)
  );
}

export class OrderError extends Error {}
