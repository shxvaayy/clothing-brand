"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/money";
import { track, notifyCartChanged } from "@/lib/track-client";
import WishButton from "./WishButton";
import Link from "next/link";

export type PurchaseVariant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  price: number;
  mrp: number;
  discountPercent: number;
  available: number;
  state: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

export default function ProductPurchase({
  productId,
  productName,
  variants,
  initialWished,
}: {
  productId: string;
  productName: string;
  variants: PurchaseVariant[];
  initialWished: boolean;
}) {
  const router = useRouter();
  const colors = useMemo(() => {
    const seen = new Map<string, string | null>();
    for (const v of variants) if (!seen.has(v.color)) seen.set(v.color, v.colorHex);
    return [...seen.entries()].map(([color, hex]) => ({ color, hex }));
  }, [variants]);

  const [color, setColor] = useState(colors[0]?.color ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const sizesForColor = variants.filter((v) => v.color === color);
  const selected = size ? sizesForColor.find((v) => v.size === size) ?? null : null;
  const display = selected ?? sizesForColor[0] ?? variants[0];
  const allOut = variants.every((v) => v.state === "OUT_OF_STOCK");

  const pickColor = (c: string) => {
    setColor(c);
    setSize(null);
    setQty(1);
    setMessage(null);
    track("variant_selected", { productId, color: c });
  };

  const pickSize = (s: string) => {
    setSize(s);
    setQty(1);
    setMessage(null);
    track("variant_selected", { productId, color, size: s });
  };

  const addToCart = async (mode: "cart" | "buy") => {
    if (!selected) {
      setMessage({ kind: "err", text: "Please select a size" });
      return;
    }
    if (selected.state === "OUT_OF_STOCK") return;
    setBusy(mode);
    setMessage(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selected.id, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "Could not add to bag" });
        return;
      }
      track("add_to_cart", { productId, variantId: selected.id, quantity: qty });
      notifyCartChanged();
      if (mode === "buy") {
        router.push("/checkout");
      } else {
        setMessage({ kind: "ok", text: "Added to your bag" });
      }
    } catch {
      setMessage({ kind: "err", text: "Something went wrong. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* Price */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold text-ink-900">{formatINR(display.price)}</span>
        {display.mrp > display.price && (
          <>
            <span className="text-base text-ink-400 line-through">{formatINR(display.mrp)}</span>
            <span className="text-base font-semibold text-terra-600">{display.discountPercent}% OFF</span>
          </>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-400">MRP inclusive of all taxes</p>

      {/* Colour */}
      {colors.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600">
            Colour: <span className="font-normal normal-case text-ink-400">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.color}
                onClick={() => pickColor(c.color)}
                aria-pressed={color === c.color}
                aria-label={`Colour ${c.color}`}
                className={`flex items-center gap-2 border px-3 py-2 text-[13px] capitalize ${
                  color === c.color ? "border-ink-800 bg-white font-medium" : "border-cream-400 bg-white"
                }`}
              >
                {c.hex && (
                  <span className="h-4 w-4 rounded-full border border-cream-400" style={{ background: c.hex }} />
                )}
                {c.color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">Select size</p>
          <Link href="/size-guide" className="text-xs text-terra-600 underline">
            Size guide
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizesForColor.map((v) => {
            const out = v.state === "OUT_OF_STOCK";
            const active = size === v.size;
            return (
              <button
                key={v.id}
                onClick={() => !out && pickSize(v.size)}
                disabled={out}
                aria-pressed={active}
                className={`relative min-w-12 border px-3 py-2.5 text-[13px] font-medium ${
                  active
                    ? "border-terra-500 bg-terra-500 text-white"
                    : out
                      ? "cursor-not-allowed border-cream-300 bg-cream-100 text-ink-300 line-through"
                      : "border-cream-400 bg-white text-ink-800 hover:border-ink-800"
                }`}
              >
                {v.size}
              </button>
            );
          })}
        </div>
        {/* stock message for the selected size — always truthful, from the DB */}
        {selected && selected.state === "LOW_STOCK" && (
          <p className="mt-2 text-[13px] font-medium text-terra-600">
            {selected.available === 1 ? "Only 1 left" : `Only ${selected.available} left`}
          </p>
        )}
        {selected && selected.state === "OUT_OF_STOCK" && (
          <p className="mt-2 text-[13px] font-medium text-ink-400">Out of stock</p>
        )}
      </div>

      {/* Quantity */}
      {selected && selected.state !== "OUT_OF_STOCK" && (
        <div className="mt-5 flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">Qty</p>
          <div className="flex items-center border border-cream-400 bg-white">
            <button
              className="px-3 py-2 text-lg leading-none disabled:opacity-40"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm font-medium">{qty}</span>
            <button
              className="px-3 py-2 text-lg leading-none disabled:opacity-40"
              onClick={() => setQty((q) => Math.min(Math.min(10, selected.available), q + 1))}
              disabled={qty >= Math.min(10, selected.available)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`mt-4 text-[13px] font-medium ${message.kind === "ok" ? "text-green-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}

      {/* Desktop buttons */}
      <div className="mt-6 hidden gap-3 lg:flex">
        <button
          onClick={() => addToCart("cart")}
          disabled={allOut || busy !== null || (selected?.state === "OUT_OF_STOCK")}
          className="flex-1 border border-ink-800 bg-white py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-800 transition-colors hover:bg-ink-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "cart" ? "Adding…" : allOut ? "Out of stock" : "Add to bag"}
        </button>
        <button
          onClick={() => addToCart("buy")}
          disabled={allOut || busy !== null || (selected?.state === "OUT_OF_STOCK")}
          className="flex-1 bg-terra-600 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-terra-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "buy" ? "One moment…" : "Buy now"}
        </button>
        <WishButton productId={productId} initialWished={initialWished} size={20} />
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-cream-300 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <button
          onClick={() => addToCart("cart")}
          disabled={allOut || busy !== null || (selected?.state === "OUT_OF_STOCK")}
          className="flex-1 border border-ink-800 bg-white py-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-800 disabled:opacity-40"
        >
          {busy === "cart" ? "Adding…" : allOut ? "Out of stock" : "Add to bag"}
        </button>
        <button
          onClick={() => addToCart("buy")}
          disabled={allOut || busy !== null || (selected?.state === "OUT_OF_STOCK")}
          className="flex-1 bg-terra-600 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-40"
        >
          {busy === "buy" ? "One moment…" : "Buy now"}
        </button>
      </div>
      {/* spacer so sticky bar never covers content */}
      <div className="h-16 lg:hidden" aria-hidden />
      <span className="sr-only" aria-live="polite">
        {productName} {selected ? `size ${selected.size} selected` : ""}
      </span>
    </div>
  );
}
