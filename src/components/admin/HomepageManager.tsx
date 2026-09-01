"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type SectionRow = {
  id: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  config: Record<string, unknown>;
  published: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  HERO: "Hero banner",
  PRODUCT_GRID: "Product grid",
  CATEGORY_GRID: "Category tiles",
  COLLECTION_BANNER: "Collection banner",
  BRAND_STORY: "Brand story",
  FAQ_PREVIEW: "FAQ preview",
};

const SOURCES = [
  { value: "new-arrivals", label: "New arrivals" },
  { value: "best-sellers", label: "Best sellers" },
  { value: "sale", label: "On sale" },
  { value: "featured", label: "Featured / recommended" },
  { value: "collection", label: "A collection" },
];

export default function HomepageManager({
  sections,
  collections,
}: {
  sections: SectionRow[];
  collections: { slug: string; name: string }[];
}) {
  const [editing, setEditing] = useState<SectionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const call = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/homepage", {
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

  const addSection = async (type: string) => {
    await call({ action: "create", type });
  };

  const setCfg = (key: string, value: unknown) =>
    setEditing((s) => (s ? { ...s, config: { ...s.config, [key]: value } } : s));

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setCfg("image", data.url);
      else setError(data.error);
    } finally {
      setUploading(false);
    }
  };

  const cfgStr = (key: string) => String(editing?.config[key] ?? "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <button
            key={type}
            onClick={() => addSection(type)}
            disabled={busy}
            className="border border-cream-400 bg-white px-3.5 py-2 text-[12px] font-semibold uppercase tracking-wider hover:border-terra-500 disabled:opacity-50"
          >
            + {label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {sections.map((s, i) => (
          <li key={s.id} className="border border-cream-300 bg-white">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="flex flex-col">
                <button
                  onClick={() => call({ action: "move", id: s.id, direction: "up" })}
                  disabled={i === 0 || busy}
                  aria-label="Move up"
                  className="text-xs text-ink-400 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => call({ action: "move", id: s.id, direction: "down" })}
                  disabled={i === sections.length - 1 || busy}
                  aria-label="Move down"
                  className="text-xs text-ink-400 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{TYPE_LABELS[s.type] ?? s.type}</p>
                <p className="truncate text-xs text-ink-400">{s.title || "Untitled"}</p>
              </div>
              <button
                onClick={() => call({ action: "toggle", id: s.id })}
                disabled={busy}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                  s.published ? "bg-green-100 text-green-800" : "bg-cream-200 text-ink-600"
                }`}
              >
                {s.published ? "Published" : "Hidden"}
              </button>
              <button
                onClick={() => setEditing(editing?.id === s.id ? null : { ...s })}
                className="text-xs font-semibold uppercase tracking-wider text-terra-600"
              >
                {editing?.id === s.id ? "Close" : "Edit"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this section?")) call({ action: "delete", id: s.id });
                }}
                className="text-xs font-semibold uppercase tracking-wider text-red-600"
              >
                Delete
              </button>
            </div>

            {editing?.id === s.id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const done = await call({
                    action: "update",
                    id: s.id,
                    title: editing.title ?? "",
                    subtitle: editing.subtitle ?? "",
                    config: editing.config,
                  });
                  if (done) setEditing(null);
                }}
                className="grid gap-3 border-t border-cream-200 px-4 py-4 sm:grid-cols-2"
              >
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-600">Title / headline</span>
                  <input
                    value={editing.title ?? ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-600">Subtitle</span>
                  <input
                    value={editing.subtitle ?? ""}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
                  />
                </label>

                {(s.type === "HERO" || s.type === "COLLECTION_BANNER") && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-600">Headline (over image)</span>
                      <input
                        value={cfgStr("headline")}
                        onChange={(e) => setCfg("headline", e.target.value)}
                        className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-600">Subheading</span>
                      <input
                        value={cfgStr("subheading")}
                        onChange={(e) => setCfg("subheading", e.target.value)}
                        className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-600">CTA text</span>
                      <input
                        value={cfgStr("ctaText")}
                        onChange={(e) => setCfg("ctaText", e.target.value)}
                        placeholder="Shop now"
                        className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-600">CTA link</span>
                      <input
                        value={cfgStr("ctaLink")}
                        onChange={(e) => setCfg("ctaLink", e.target.value)}
                        placeholder="/shop"
                        className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-ink-600">Image</span>
                      <div className="flex items-center gap-3">
                        {cfgStr("image") && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cfgStr("image")} alt="" className="h-16 w-28 object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => fileInput.current?.click()}
                          disabled={uploading}
                          className="border border-cream-400 px-4 py-2 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
                        >
                          {uploading ? "Uploading…" : "Upload image"}
                        </button>
                        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => uploadImage(e.target.files?.[0])} />
                      </div>
                    </div>
                  </>
                )}

                {s.type === "PRODUCT_GRID" && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-600">Products from</span>
                      <select
                        value={cfgStr("source") || "new-arrivals"}
                        onChange={(e) => setCfg("source", e.target.value)}
                        className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm"
                      >
                        {SOURCES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {cfgStr("source") === "collection" && (
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-ink-600">Collection</span>
                        <select
                          value={cfgStr("collectionSlug")}
                          onChange={(e) => setCfg("collectionSlug", e.target.value)}
                          className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm"
                        >
                          <option value="">— Choose —</option>
                          {collections.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-600">How many products</span>
                      <input
                        inputMode="numeric"
                        value={cfgStr("count") || "8"}
                        onChange={(e) => setCfg("count", parseInt(e.target.value) || 8)}
                        className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                  </>
                )}

                {s.type === "COLLECTION_BANNER" && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-600">Links to collection</span>
                    <select
                      value={cfgStr("collectionSlug")}
                      onChange={(e) => setCfg("collectionSlug", e.target.value)}
                      className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">— Choose —</option>
                      {collections.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {s.type === "BRAND_STORY" && (
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-ink-600">Story text</span>
                    <textarea
                      rows={3}
                      value={cfgStr("text")}
                      onChange={(e) => setCfg("text", e.target.value)}
                      className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
                    />
                  </label>
                )}

                {s.type === "FAQ_PREVIEW" && (
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-ink-600">
                      FAQs (one per line, format: Question | Answer)
                    </span>
                    <textarea
                      rows={4}
                      value={
                        Array.isArray(editing.config.faqs)
                          ? (editing.config.faqs as { q: string; a: string }[])
                              .map((f) => `${f.q} | ${f.a}`)
                              .join("\n")
                          : ""
                      }
                      onChange={(e) =>
                        setCfg(
                          "faqs",
                          e.target.value
                            .split("\n")
                            .map((line) => {
                              const [q, ...rest] = line.split("|");
                              return { q: q?.trim() ?? "", a: rest.join("|").trim() };
                            })
                            .filter((f) => f.q && f.a)
                        )
                      }
                      className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none"
                    />
                  </label>
                )}

                <div className="col-span-full flex gap-3">
                  <button
                    disabled={busy}
                    className="bg-terra-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save section"}
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
          </li>
        ))}
        {sections.length === 0 && (
          <li className="border border-cream-300 bg-white px-4 py-10 text-center text-sm text-ink-400">
            No sections yet — add one above.
          </li>
        )}
      </ul>
    </div>
  );
}
