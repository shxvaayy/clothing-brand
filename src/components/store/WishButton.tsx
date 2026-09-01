"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartIcon } from "@/components/ui/Icons";
import { track, notifyWishlistChanged } from "@/lib/track-client";

export default function WishButton({
  productId,
  initialWished = false,
  size = 18,
}: {
  productId: string;
  initialWished?: boolean;
  size?: number;
}) {
  const [wished, setWished] = useState(initialWished);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: wished ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        router.push("/login?next=" + encodeURIComponent(window.location.pathname));
        return;
      }
      if (res.ok) {
        setWished(!wished);
        track(wished ? "wishlist_remove" : "wishlist_add", { productId });
        notifyWishlistChanged();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wished}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors ${
        wished ? "text-terra-500" : "text-ink-600 hover:text-terra-500"
      }`}
    >
      <HeartIcon width={size} height={size} filled={wished} />
    </button>
  );
}
