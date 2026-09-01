import { db } from "./db";
import { formatINR } from "./money";

export type CouponResult =
  | { ok: true; couponId: string; code: string; discount: number }
  | { ok: false; error: string };

/** Server-side coupon validation against a cart subtotal (paise). */
export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string | null
): Promise<CouponResult> {
  const coupon = await db.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!coupon || !coupon.active) return { ok: false, error: "Invalid coupon code" };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now)
    return { ok: false, error: "This coupon is not active yet" };
  if (coupon.endsAt && coupon.endsAt < now)
    return { ok: false, error: "This coupon has expired" };
  if (subtotal < coupon.minCartValue)
    return {
      ok: false,
      error: `Add items worth ${formatINR(coupon.minCartValue - subtotal)} more to use this coupon`,
    };

  if (coupon.usageLimit) {
    const used = await db.couponRedemption.count({ where: { couponId: coupon.id } });
    if (used >= coupon.usageLimit)
      return { ok: false, error: "This coupon has been fully redeemed" };
  }
  if (coupon.perUserLimit && userId) {
    const usedByUser = await db.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (usedByUser >= coupon.perUserLimit)
      return { ok: false, error: "You have already used this coupon" };
  }

  let discount =
    coupon.type === "PERCENT"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  if (coupon.type === "PERCENT" && coupon.maxDiscount)
    discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);

  return { ok: true, couponId: coupon.id, code: coupon.code, discount };
}
