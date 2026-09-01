"use client";

import { useEffect } from "react";
import { track } from "@/lib/track-client";

export default function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    track("product_view", { productId });
    // recently viewed (client-side, no PII)
    try {
      const key = "rn_recently_viewed";
      const list: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [productId, ...list.filter((id) => id !== productId)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }, [productId]);
  return null;
}
