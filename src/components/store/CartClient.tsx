"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CartSummary } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { TrashIcon, HeartIcon } from "@/components/ui/Icons";
import { track, notifyCartChanged } from "@/lib/track-client";

export default function CartClient({ initial }: { initial: CartSummary }) {
  const [cart, setCart] = useState(initial);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(
    initial.couponError ? { ok: false, text: initial.couponError } : null
  );
  const router = useRouter();

  const refresh = async () => {
    const res = await fetch("/api/cart", { cache: "no-store" });
    if (res.ok) setCart(await res.json());
    notifyCartChanged();
  };

  const updateQty = async (itemId: string, quantity: number) => {
    setBusyItem(itemId);
    try {
      await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      if (quantity === 0) track("remove_from_cart", { itemId });
      await refresh();
    } finally {
      setBusyItem(null);
    }
  };

  const moveToWishlist = async (itemId: string, productId: string) => {
    setBusyItem(itemId);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        router.push("/login?next=/cart");
        return;
      }
      await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity: 0 }),
      });
      await refresh();
    } finally {
      setBusyItem(null);
    }
  };

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupon.trim()) return;
    const res = await fetch("/api/cart/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setCouponMsg({ ok: true, text: `Coupon ${data.code} applied` });
      track("coupon_applied", { code: data.code });
    } else {
      setCouponMsg({ ok: false, text: data.error ?? "Invalid coupon" });
      track("coupon_failed", { code: coupon.trim() });
    }
    await refresh();
  };

  const removeCoupon = async () => {
    await fetch("/api/cart/coupon", { method: "DELETE" });
    setCouponMsg(null);
    setCoupon("");
    await refresh();
  };

  if (cart.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-2xl text-ink-600">Your bag is empty</p>
        <p className="mt-2 text-sm text-ink-400">The rare ones don’t stay in stock forever.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block bg-terra-600 px-8 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const freeShipRemaining = cart.freeShippingAbove - (cart.subtotal - cart.couponDiscount);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        {/* free shipping nudge */}
        {freeShipRemaining > 0 && cart.freeShippingAbove > 0 && (
          <div className="mb-4 border border-cream-300 bg-cream-100 px-4 py-3 text-[13px]">
            Add <strong>{formatINR(freeShipRemaining)}</strong> more for free shipping
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-300">
              <div
                className="h-full bg-terra-500 transition-all"
                style={{
                  width: `${Math.min(100, ((cart.subtotal - cart.couponDiscount) / cart.freeShippingAbove) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <ul className="divide-y divide-cream-200 border-y border-cream-200">
          {cart.lines.map((line) => (
            <li key={line.id} className={`flex gap-3 py-4 ${busyItem === line.id ? "opacity-50" : ""}`}>
              <Link href={`/product/${line.slug}`} className="relative block h-32 w-24 shrink-0 bg-cream-200">
                {line.image && (
                  <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/product/${line.slug}`}>
                      <p className="truncate text-sm font-medium">{line.name}</p>
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-400 capitalize">
                      {line.color} / {line.size}
                    </p>
                  </div>
                  <button
                    aria-label={`Remove ${line.name}`}
                    onClick={() => updateQty(line.id, 0)}
                    className="p-1 text-ink-400 hover:text-red-600"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </div>

                {!line.inStock && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {line.available === 0
                      ? "Out of stock — remove to continue"
                      : `Only ${line.available} left — reduce quantity`}
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-cream-400 bg-white">
                      <button
                        className="px-2.5 py-1 text-base leading-none disabled:opacity-40"
                        disabled={line.quantity <= 1 || busyItem === line.id}
                        onClick={() => updateQty(line.id, line.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center text-[13px] font-medium">{line.quantity}</span>
                      <button
                        className="px-2.5 py-1 text-base leading-none disabled:opacity-40"
                        disabled={line.quantity >= Math.min(10, line.available) || busyItem === line.id}
                        onClick={() => updateQty(line.id, line.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => moveToWishlist(line.id, line.productId)}
                      className="hidden items-center gap-1 text-xs text-ink-400 hover:text-terra-600 sm:flex"
                    >
                      <HeartIcon width={13} height={13} /> Move to wishlist
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatINR(line.price * line.quantity)}</p>
                    {line.mrp > line.price && (
                      <p className="text-xs text-ink-400 line-through">
                        {formatINR(line.mrp * line.quantity)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* summary */}
      <aside className="h-fit border border-cream-300 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Order summary</h2>

        <form onSubmit={applyCoupon} className="mt-4">
          {cart.couponCode && !cart.couponError ? (
            <div className="flex items-center justify-between border border-green-200 bg-green-50 px-3 py-2.5">
              <p className="text-[13px] font-medium text-green-800">
                {cart.couponCode} applied · −{formatINR(cart.couponDiscount)}
              </p>
              <button type="button" onClick={removeCoupon} className="text-xs text-ink-400 underline">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                aria-label="Coupon code"
                className="min-w-0 flex-1 border border-cream-400 px-3 py-2.5 text-sm uppercase outline-none focus:border-terra-500"
              />
              <button className="shrink-0 bg-ink-800 px-4 text-xs font-semibold uppercase tracking-wider text-white">
                Apply
              </button>
            </div>
          )}
          {couponMsg && !cart.couponCode && (
            <p className={`mt-1.5 text-xs ${couponMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {couponMsg.text}
            </p>
          )}
          {cart.couponError && (
            <p className="mt-1.5 text-xs text-red-600">{cart.couponError}</p>
          )}
        </form>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-400">MRP total</dt>
            <dd>{formatINR(cart.mrpTotal)}</dd>
          </div>
          {cart.savings > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-400">Discount on MRP</dt>
              <dd className="text-green-700">−{formatINR(cart.savings)}</dd>
            </div>
          )}
          {cart.couponDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-400">Coupon</dt>
              <dd className="text-green-700">−{formatINR(cart.couponDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-400">Shipping</dt>
            <dd>{cart.shippingFee === 0 ? "Free" : formatINR(cart.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatINR(cart.total)}</dd>
          </div>
        </dl>

        <button
          onClick={() => {
            track("checkout_started", { value: cart.total });
            router.push("/checkout");
          }}
          disabled={cart.lines.some((l) => !l.inStock)}
          className="mt-5 w-full bg-terra-600 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:bg-terra-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Proceed to checkout
        </button>
        {cart.lines.some((l) => !l.inStock) && (
          <p className="mt-2 text-center text-xs text-red-600">
            Fix out-of-stock items to continue
          </p>
        )}
        <p className="mt-3 text-center text-[11px] text-ink-400">
          Secure payments powered by Razorpay
        </p>
      </aside>
    </div>
  );
}
