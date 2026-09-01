"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP", "CONVERTED", "LOST", "UNQUALIFIED"];

const SOURCE_LABELS: Record<string, string> = {
  NEWSLETTER: "Newsletter",
  CONTACT_FORM: "Contact form",
  PRODUCT_INQUIRY: "Product inquiry",
  BACK_IN_STOCK: "Back in stock",
  ABANDONED_CHECKOUT: "Abandoned checkout",
};

export default function LeadRow({
  lead,
}: {
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    source: string;
    message: string | null;
    productInterest: string | null;
    status: string;
    createdAt: string;
  };
}) {
  const [status, setStatus] = useState(lead.status);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const update = async (next: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status: next }),
      });
      if (res.ok) {
        setStatus(next);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-cream-200 last:border-0 align-top">
      <td className="px-4 py-2.5">
        <p className="font-medium">{lead.name ?? "—"}</p>
        <p className="text-xs text-ink-400">{lead.email ?? lead.phone ?? ""}</p>
      </td>
      <td className="px-4 py-2.5">
        <span className="rounded bg-cream-200 px-2 py-0.5 text-[11px] font-semibold uppercase">
          {SOURCE_LABELS[lead.source] ?? lead.source}
        </span>
      </td>
      <td className="max-w-xs px-4 py-2.5 text-xs text-ink-600">
        <p className="line-clamp-2">{lead.message ?? lead.productInterest ?? "—"}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-400">
        {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
      </td>
      <td className="px-4 py-2.5">
        <select
          value={status}
          disabled={busy}
          onChange={(e) => update(e.target.value)}
          className={`border px-2 py-1.5 text-[12px] font-medium ${
            status === "NEW"
              ? "border-terra-300 bg-terra-50 text-terra-800"
              : status === "CONVERTED"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-cream-300 bg-white"
          }`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}
