"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedAddress } from "./CheckoutClient";

type FormState = {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const empty: FormState = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export default function AddressManager({ initial }: { initial: SavedAddress[] }) {
  const [editing, setEditing] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        editing.id ? `/api/addresses/${editing.id}` : "/api/addresses",
        {
          method: editing.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editing, country: "India" }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save address");
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const makeDefault = async (a: SavedAddress) => {
    await fetch(`/api/addresses/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2 ?? "",
        landmark: a.landmark ?? "",
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        country: a.country,
        isDefault: true,
      }),
    });
    router.refresh();
  };

  const input = (key: keyof FormState, label: string, opts: { numeric?: boolean; max?: number; half?: boolean } = {}) => (
    <label className={opts.half ? "block" : "col-span-2 block"}>
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      <input
        value={String(editing?.[key] ?? "")}
        maxLength={opts.max}
        inputMode={opts.numeric ? "numeric" : undefined}
        onChange={(e) =>
          setEditing((f) =>
            f ? { ...f, [key]: opts.numeric ? e.target.value.replace(/\D/g, "") : e.target.value } : f
          )
        }
        className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      {!editing && (
        <button
          onClick={() => setEditing(empty)}
          className="bg-terra-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
        >
          + Add new address
        </button>
      )}

      {editing && (
        <form onSubmit={save} className="grid grid-cols-2 gap-3 border border-cream-300 bg-white p-5">
          <h2 className="col-span-2 text-sm font-semibold uppercase tracking-wider">
            {editing.id ? "Edit address" : "New address"}
          </h2>
          {input("fullName", "Full name")}
          {input("phone", "Mobile number", { numeric: true, max: 10, half: true })}
          {input("pincode", "Pincode", { numeric: true, max: 6, half: true })}
          {input("line1", "House / Flat, Building")}
          {input("line2", "Street / Area (optional)")}
          {input("landmark", "Landmark (optional)")}
          {input("city", "City", { half: true })}
          {input("state", "State", { half: true })}
          <label className="col-span-2 block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Label</span>
            <select
              value={editing.label}
              onChange={(e) => setEditing((f) => (f ? { ...f, label: e.target.value } : f))}
              className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm"
            >
              <option>Home</option>
              <option>Office</option>
              <option>Other</option>
            </select>
          </label>
          <label className="col-span-2 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={editing.isDefault}
              onChange={(e) => setEditing((f) => (f ? { ...f, isDefault: e.target.checked } : f))}
              className="h-4 w-4 accent-terra-500"
            />
            Set as default address
          </label>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <div className="col-span-2 flex gap-3">
            <button
              disabled={busy}
              className="flex-1 bg-terra-600 py-3 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="flex-1 border border-cream-400 bg-white py-3 text-xs font-semibold uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {initial.length === 0 && !editing && (
        <p className="py-10 text-center text-sm text-ink-400">No saved addresses yet.</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {initial.map((a) => (
          <li key={a.id} className="border border-cream-300 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">
                {a.fullName}{" "}
                <span className="ml-1 rounded bg-cream-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  {a.label}
                </span>
              </p>
              {a.isDefault && (
                <span className="rounded bg-terra-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-terra-700">
                  Default
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              {a.phone}
            </p>
            <div className="mt-3 flex gap-4 text-xs font-semibold uppercase tracking-wider">
              <button
                onClick={() =>
                  setEditing({
                    id: a.id,
                    label: a.label,
                    fullName: a.fullName,
                    phone: a.phone,
                    line1: a.line1,
                    line2: a.line2 ?? "",
                    landmark: a.landmark ?? "",
                    city: a.city,
                    state: a.state,
                    pincode: a.pincode,
                    isDefault: a.isDefault,
                  })
                }
                className="text-terra-600"
              >
                Edit
              </button>
              {!a.isDefault && (
                <>
                  <button onClick={() => makeDefault(a)} className="text-ink-600">
                    Make default
                  </button>
                  <button onClick={() => remove(a.id)} className="text-red-600">
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
