"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderActions({
  orderId,
  status,
  nextStatuses,
  hasShipment,
}: {
  orderId: string;
  status: string;
  nextStatuses: string[];
  hasShipment: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const act = async (payload: Record<string, unknown>, key: string) => {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="border border-cream-300 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider">Actions</h2>
      <p className="mt-1 text-xs text-ink-400">
        Current status: <strong>{status.replaceAll("_", " ")}</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextStatuses.map((s) => {
          const danger = s === "CANCELLED" || s === "RETURNED" || s === "REFUNDED";
          return (
            <button
              key={s}
              disabled={busy !== null}
              onClick={() => {
                if (danger && !confirm(`Move order to ${s}? ${s === "CANCELLED" ? "Stock will be restored." : ""}`))
                  return;
                act({ action: "transition", toStatus: s }, s);
              }}
              className={`px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50 ${
                danger
                  ? "border border-red-300 bg-white text-red-600"
                  : "bg-ink-800 text-white hover:bg-ink-600"
              }`}
            >
              {busy === s ? "…" : `→ ${s.replaceAll("_", " ")}`}
            </button>
          );
        })}
        {nextStatuses.length === 0 && (
          <p className="text-xs text-ink-400">No further transitions available.</p>
        )}
      </div>

      {!hasShipment && ["PAID", "CONFIRMED", "PROCESSING", "PACKED"].includes(status) && (
        <button
          disabled={busy !== null}
          onClick={() => act({ action: "create-shipment" }, "ship")}
          className="mt-3 w-full border border-terra-500 bg-terra-50 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-terra-700 disabled:opacity-50"
        >
          {busy === "ship" ? "Creating…" : "Create shipment (delivery partner)"}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
