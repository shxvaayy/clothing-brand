import crypto from "crypto";

/** Signed token so guests can view their own confirmation/tracking page. */
export function orderSig(orderNumber: string) {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET || "dev-secret")
    .update(`order:${orderNumber}`)
    .digest("hex")
    .slice(0, 24);
}

export function verifyOrderSig(orderNumber: string, sig: string) {
  try {
    return crypto.timingSafeEqual(Buffer.from(orderSig(orderNumber)), Buffer.from(sig));
  } catch {
    return false;
  }
}
