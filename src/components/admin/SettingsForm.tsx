"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreSettings } from "@/lib/settings";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";

export default function SettingsForm({ initial }: { initial: StoreSettings }) {
  const [form, setForm] = useState({
    storeName: initial.storeName,
    supportEmail: initial.supportEmail,
    supportPhone: initial.supportPhone,
    freeShippingAbove: String(paiseToRupees(initial.freeShippingAbove)),
    shippingFee: String(paiseToRupees(initial.shippingFee)),
    announcementText: initial.announcementText,
    instagramUrl: initial.instagramUrl,
    returnWindowDays: String(initial.returnWindowDays),
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          supportEmail: form.supportEmail,
          supportPhone: form.supportPhone,
          freeShippingAbove: rupeesToPaise(parseFloat(form.freeShippingAbove) || 0),
          shippingFee: rupeesToPaise(parseFloat(form.shippingFee) || 0),
          announcementText: form.announcementText,
          instagramUrl: form.instagramUrl,
          returnWindowDays: parseInt(form.returnWindowDays) || 7,
        }),
      });
      const data = await res.json();
      setNotice(res.ok ? "Saved — the store reflects this immediately" : data.error);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-600">
        {label} {hint && <span className="text-ink-400">({hint})</span>}
      </span>
      <input
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
      />
    </label>
  );

  return (
    <form onSubmit={save} className="grid gap-4 border border-cream-300 bg-white p-5 sm:grid-cols-2">
      <h2 className="col-span-full text-sm font-semibold uppercase tracking-wider">Store settings</h2>
      {field("storeName", "Store name")}
      {field("supportEmail", "Support email")}
      {field("supportPhone", "Support phone", "optional")}
      {field("instagramUrl", "Instagram URL", "optional")}
      {field("shippingFee", "Shipping fee (₹)")}
      {field("freeShippingAbove", "Free shipping above (₹)")}
      {field("returnWindowDays", "Return window (days)")}
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-ink-600">Announcement bar text</span>
        <input
          value={form.announcementText}
          onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
          className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
        />
      </label>
      <div className="col-span-full flex items-center gap-4">
        <button
          disabled={busy}
          className="bg-terra-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {notice && <span className="text-sm text-green-700">{notice}</span>}
      </div>
    </form>
  );
}
