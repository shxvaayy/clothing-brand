"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  active?: boolean;
  published?: boolean;
  parentId?: string | null;
  productCount: number;
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
};

export default function TaxonomyManager({
  kind,
  items,
  parents,
}: {
  kind: "category" | "collection";
  items: TaxonomyItem[];
  parents?: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const call = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...payload }),
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

  const upload = async (file: File | undefined) => {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setEditing({ ...editing, image: data.url });
      else setError(data.error);
    } finally {
      setUploading(false);
    }
  };

  const label = kind === "category" ? "category" : "collection";

  return (
    <div className="space-y-4">
      {!editing && (
        <button
          onClick={() => setEditing({ name: "", slug: "", description: "", image: "", parentId: "" })}
          className="bg-terra-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
        >
          + New {label}
        </button>
      )}

      {editing && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const okDone = await call({
              action: editing.id ? "update" : "create",
              id: editing.id,
              name: editing.name,
              slug: editing.slug || undefined,
              description: editing.description || undefined,
              image: editing.image || undefined,
              ...(kind === "category" ? { parentId: editing.parentId || null } : {}),
            });
            if (okDone) setEditing(null);
          }}
          className="grid gap-3 border border-cream-300 bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="col-span-full text-sm font-semibold uppercase tracking-wider">
            {editing.id ? `Edit ${label}` : `New ${label}`}
          </h2>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Name</span>
            <input
              required
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-600">Slug (blank = auto)</span>
            <input
              value={editing.slug}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
            />
          </label>
          {kind === "category" && parents && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">Parent category</span>
              <select
                value={editing.parentId}
                onChange={(e) => setEditing({ ...editing, parentId: e.target.value })}
                className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">— Top level —</option>
                {parents
                  .filter((p) => p.id !== editing.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-ink-600">Description</span>
            <textarea
              rows={2}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full border border-cream-400 px-3 py-2.5 text-sm outline-none focus:border-terra-500"
            />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-ink-600">Image</span>
            <div className="flex items-center gap-3">
              {editing.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.image} alt="" className="h-16 w-16 object-cover" />
              )}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="border border-cream-400 px-4 py-2 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                {uploading ? "Uploading…" : editing.image ? "Replace image" : "Upload image"}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </div>
          </div>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
          <div className="col-span-full flex gap-3">
            <button
              disabled={busy}
              className="bg-terra-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
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
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-cream-200 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-9 w-9 rounded object-cover" />
                    ) : (
                      <span className="h-9 w-9 rounded bg-cream-200" />
                    )}
                    <span className="font-medium">
                      {item.parentId && <span className="text-ink-300">↳ </span>}
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-400">/{item.slug}</td>
                <td className="px-4 py-2.5">{item.productCount}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() =>
                      call({
                        action: "update",
                        id: item.id,
                        ...(kind === "category"
                          ? { active: !(item.active ?? true) }
                          : { published: !(item.published ?? true) }),
                      })
                    }
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      (kind === "category" ? item.active : item.published)
                        ? "bg-green-100 text-green-800"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {(kind === "category" ? item.active : item.published) ? "Live" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">
                  <button
                    onClick={() =>
                      setEditing({
                        id: item.id,
                        name: item.name,
                        slug: item.slug,
                        description: item.description ?? "",
                        image: item.image ?? "",
                        parentId: item.parentId ?? "",
                      })
                    }
                    className="mr-3 text-terra-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${item.name}"?`)) call({ action: "delete", id: item.id });
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
                <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                  Nothing yet — create your first {label}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
