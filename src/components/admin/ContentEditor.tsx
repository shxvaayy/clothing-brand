"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Page = {
  slug: string;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
};

export default function ContentEditor({ pages }: { pages: Page[] }) {
  const [selected, setSelected] = useState<Page | null>(pages[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      setNotice(res.ok ? "Saved" : data.error ?? "Could not save");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <nav className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
        {pages.map((p) => (
          <button
            key={p.slug}
            onClick={() => {
              setSelected({ ...p });
              setNotice(null);
            }}
            className={`shrink-0 border px-4 py-2.5 text-left text-[13px] font-medium ${
              selected?.slug === p.slug
                ? "border-terra-500 bg-terra-50 text-terra-800"
                : "border-cream-300 bg-white text-ink-600"
            }`}
          >
            /{p.slug}
          </button>
        ))}
      </nav>

      {selected && (
        <div className="space-y-3 border border-cream-300 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider">/{selected.slug}</h2>
            <a href={`/${selected.slug}`} target="_blank" className="text-xs text-terra-600 underline">
              View live page ↗
            </a>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Page title</span>
            <input
              value={selected.title}
              onChange={(e) => setSelected({ ...selected, title: e.target.value })}
              className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Content (markdown)</span>
            <textarea
              rows={16}
              value={selected.body}
              onChange={(e) => setSelected({ ...selected, body: e.target.value })}
              className="w-full border border-cream-400 px-3 py-2.5 font-mono text-[13px] outline-none focus:border-terra-500"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">SEO title</span>
              <input
                value={selected.seoTitle}
                onChange={(e) => setSelected({ ...selected, seoTitle: e.target.value })}
                className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">SEO description</span>
              <input
                value={selected.seoDescription}
                onChange={(e) => setSelected({ ...selected, seoDescription: e.target.value })}
                className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
              />
            </label>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={busy}
              className="bg-terra-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save page"}
            </button>
            {notice && (
              <span className={`text-sm ${notice === "Saved" ? "text-green-700" : "text-red-600"}`}>
                {notice}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
