"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR, rupeesToPaise, paiseToRupees } from "@/lib/money";

export type CouponRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minCartValue: number;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  active: boolean;
  used: number;
};

type FormState = {
  id?: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minCartValue: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perUserLimit: string;
};

const empty: FormState = {
  code: "",
  type: "PERCENT",
  value: "",
  minCartValue: "",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perUserLimit: "",
};

export default function CouponManager({ items }: { items: CouponRow[] }) {
  const [editing, setEditing] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const call = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const isPercent = editing.type === "PERCENT";
    const coupon = {
      code: editing.code.toUpperCase(),
      type: editing.type,
      value: isPercent ? parseInt(editing.value) || 0 : rupeesToPaise(parseFloat(editing.value) || 0),
      minCartValue: rupeesToPaise(parseFloat(editing.minCartValue) || 0),
      maxDiscount: editing.maxDiscount ? rupeesToPaise(parseFloat(editing.maxDiscount)) : null,
      startsAt: editing.startsAt || null,
      endsAt: editing.endsAt || null,
      usageLimit: editing.usageLimit ? parseInt(editing.usageLimit) : null,
      perUserLimit: editing.perUserLimit ? parseInt(editing.perUserLimit) : null,
      active: true,
    };
    const done = await call({ action: editing.id ? "update" : "create", id: editing.id, coupon });
    if (done) setEditing(null);
  };

  const num = (key: keyof FormState, label: string, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label} {hint && <span className="text-ink-400">({hint})</span>}
      </span>
      <input
        value={editing?.[key] ?? ""}
        onChange={(e) => setEditing((f) => (f ? { ...f, [key]: e.target.value.replace(/[^\d.]/g, "") } : f))}
        className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      {!editing && (
        <button
          onClick={() => setEditing(empty)}
          className="bg-terra-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
        >
          + New coupon
        </button>
      )}

      {editing && (
        <form onSubmit={submit} className="grid gap-3 border border-cream-300 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="col-span-full text-sm font-semibold uppercase tracking-wider">
            {editing.id ? "Edit coupon" : "New coupon"}
          </h2>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Code</span>
            <input
              required
              disabled={Boolean(editing.id)}
              value={editing.code}
              onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
              placeholder="WELCOME10"
              className="w-full border border-cream-400 px-3 py-2.5 text-sm uppercase outline-none focus:border-terra-500 disabled:bg-cream-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Type</span>
            <select
              value={editing.type}
              onChange={(e) => setEditing({ ...editing, type: e.target.value as "PERCENT" | "FIXED" })}
              className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm"
            >
              <option value="PERCENT">Percentage off</option>
              <option value="FIXED">Fixed amount off</option>
            </select>
          </label>
          {num("value", editing.type === "PERCENT" ? "Percent off" : "Amount off (₹)")}
          {num("minCartValue", "Min cart value (₹)")}
          {editing.type === "PERCENT" && num("maxDiscount", "Max discount (₹)", "optional cap")}
          {num("usageLimit", "Total usage limit", "blank = unlimited")}
          {num("perUserLimit", "Per-customer limit", "blank = unlimited")}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Starts</span>
            <input
              type="date"
              value={editing.startsAt.slice(0, 10)}
              onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })}
              className="w-full border border-cream-400 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Ends</span>
            <input
              type="date"
              value={editing.endsAt.slice(0, 10)}
              onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })}
              className="w-full border border-cream-400 px-3 py-2.5 text-sm"
            />
          </label>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
          <div className="col-span-full flex gap-3">
            <button
              disabled={busy}
              className="bg-terra-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save coupon"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-cream-400 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Min cart</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Validity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-cream-200 last:border-0">
                <td className="px-4 py-2.5 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-2.5">
                  {c.type === "PERCENT" ? `${c.value}%` : formatINR(c.value)}
                  {c.maxDiscount && <span className="text-xs text-ink-400"> (max {formatINR(c.maxDiscount)})</span>}
                </td>
                <td className="px-4 py-2.5">{c.minCartValue > 0 ? formatINR(c.minCartValue) : "—"}</td>
                <td className="px-4 py-2.5">
                  {c.used}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-600">
                  {c.startsAt ? new Date(c.startsAt).toLocaleDateString("en-IN") : "Now"} →{" "}
                  {c.endsAt ? new Date(c.endsAt).toLocaleDateString("en-IN") : "No end"}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => call({ action: "toggle", id: c.id })}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      c.active ? "bg-green-100 text-green-800" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {c.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">
                  <button
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        code: c.code,
                        type: c.type,
                        value: c.type === "PERCENT" ? String(c.value) : String(paiseToRupees(c.value)),
                        minCartValue: c.minCartValue ? String(paiseToRupees(c.minCartValue)) : "",
                        maxDiscount: c.maxDiscount ? String(paiseToRupees(c.maxDiscount)) : "",
                        startsAt: c.startsAt ?? "",
                        endsAt: c.endsAt ?? "",
                        usageLimit: c.usageLimit ? String(c.usageLimit) : "",
                        perUserLimit: c.perUserLimit ? String(c.perUserLimit) : "",
                      })
                    }
                    className="mr-3 text-terra-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete coupon ${c.code}?`)) call({ action: "delete", id: c.id });
                    }}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-400">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
