import { discountAmount, discountPercent } from "./money";

export type PriceInfo = {
  mrp: number;
  price: number;
  discount: number;
  discountPercent: number;
};

/** Effective unit price of a variant (variant override wins over product price). */
export function variantPrice(
  product: { mrp: number; sellingPrice: number },
  variant?: { priceOverride: number | null } | null
): PriceInfo {
  const price = variant?.priceOverride ?? product.sellingPrice;
  const mrp = Math.max(product.mrp, price);
  return {
    mrp,
    price,
    discount: discountAmount(mrp, price),
    discountPercent: discountPercent(mrp, price),
  };
}
