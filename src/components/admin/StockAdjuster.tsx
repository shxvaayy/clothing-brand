"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StockAdjuster({ variantId, current }: { variantId: string; current: number }) {
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const apply = async (payload: { delta?: number; setTo?: number }) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        setValue(String(data.next));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => apply({ delta: -1 })}
        disabled={busy}
        aria-label="Decrease stock"
        className="h-8 w-8 border border-cream-300 bg-white text-base leading-none disabled:opacity-40"
      >
        −
      </button>
      <input
        value={value}
        inputMode="numeric"
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        onBlur={() => {
          const n = parseInt(value);
          if (!Number.isNaN(n) && n !== current) apply({ setTo: n });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-8 w-14 border border-cream-300 bg-white text-center text-sm outline-none focus:border-terra-500"
        aria-label="Stock quantity"
      />
      <button
        onClick={() => apply({ delta: 1 })}
        disabled={busy}
        aria-label="Increase stock"
        className="h-8 w-8 border border-cream-300 bg-white text-base leading-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
