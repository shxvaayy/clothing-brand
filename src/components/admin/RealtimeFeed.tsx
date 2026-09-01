"use client";

import { useEffect, useState } from "react";

type Event = {
  id: string;
  type: string;
  path: string | null;
  productName: string | null;
  query: string | null;
  device: string | null;
  country: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  page_view: { label: "Page view", cls: "bg-cream-200 text-ink-600" },
  product_view: { label: "Product viewed", cls: "bg-blue-50 text-blue-700" },
  search: { label: "Searched", cls: "bg-cream-200 text-ink-600" },
  add_to_cart: { label: "Added to cart", cls: "bg-amber-100 text-amber-800" },
  remove_from_cart: { label: "Removed from cart", cls: "bg-cream-200 text-ink-600" },
  wishlist_add: { label: "Wishlisted", cls: "bg-pink-50 text-pink-700" },
  checkout_started: { label: "Checkout started", cls: "bg-terra-100 text-terra-800" },
  payment_started: { label: "Payment started", cls: "bg-terra-100 text-terra-800" },
  payment_success: { label: "Payment success", cls: "bg-green-100 text-green-800" },
  payment_failed: { label: "Payment failed", cls: "bg-red-50 text-red-600" },
  purchase: { label: "Purchase 🎉", cls: "bg-green-100 text-green-800" },
  signup: { label: "New account", cls: "bg-green-100 text-green-800" },
  login: { label: "Login", cls: "bg-cream-200 text-ink-600" },
  lead_created: { label: "New lead", cls: "bg-purple-50 text-purple-700" },
};

export default function RealtimeFeed() {
  const [events, setEvents] = useState<Event[]>([]);
  const [online, setOnline] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/realtime", { cache: "no-store" });
        if (res.ok && alive) {
          const data = await res.json();
          setEvents(data.events);
          setOnline(data.activeVisitors);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 border border-cream-300 bg-white px-5 py-4">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        <p className="text-sm">
          <strong>{online ?? "—"}</strong> active visitor{online === 1 ? "" : "s"} in the last 5 minutes
        </p>
      </div>

      <div className="border border-cream-300 bg-white">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-ink-400">Loading…</p>
        ) : events.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-400">
            No activity yet. Open the store in another tab and browse around.
          </p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {events.map((e) => {
              const t = TYPE_LABELS[e.type] ?? { label: e.type, cls: "bg-cream-200 text-ink-600" };
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5 text-sm">
                  <span className="w-14 shrink-0 text-xs text-ink-400">
                    {new Date(e.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${t.cls}`}>
                    {t.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink-600">
                    {e.productName ?? (e.query ? `“${e.query}”` : e.path)}
                  </span>
                  <span className="shrink-0 text-xs capitalize text-ink-400">
                    {[e.device, e.country].filter(Boolean).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
