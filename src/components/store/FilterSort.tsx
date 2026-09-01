"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterIcon, CloseIcon, ChevronDown } from "@/components/ui/Icons";
import { track } from "@/lib/track-client";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "best-selling", label: "Best Selling" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "discount", label: "Highest Discount" },
];

const PRICE_BUCKETS = [
  { label: "Under ₹1,000", min: 0, max: 100000 },
  { label: "₹1,000 – ₹2,000", min: 100000, max: 200000 },
  { label: "₹2,000 – ₹3,500", min: 200000, max: 350000 },
  { label: "Above ₹3,500", min: 350000, max: 10000000 },
];

export default function FilterSort({
  sizes,
  colors,
  total,
}: {
  sizes: string[];
  colors: string[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const current = useMemo(
    () => ({
      sort: params.get("sort") ?? "recommended",
      sizes: params.get("sizes")?.split(",").filter(Boolean) ?? [],
      colors: params.get("colors")?.split(",").filter(Boolean) ?? [],
      price: params.get("price") ?? "",
      inStock: params.get("stock") === "1",
    }),
    [params]
  );

  const apply = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    track("filter_used", { filters: Object.keys(updates).join(",") });
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const toggleIn = (key: "sizes" | "colors", value: string) => {
    const list = current[key];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    apply({ [key]: next.join(",") || null });
  };

  const activeCount =
    current.sizes.length + current.colors.length + (current.price ? 1 : 0) + (current.inStock ? 1 : 0);

  return (
    <>
      <div className="sticky top-14 z-30 -mx-4 border-b border-cream-300 bg-cream-50/95 px-4 py-2 backdrop-blur sm:top-16 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:static">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 border border-cream-400 bg-white px-3 py-2 text-[13px] font-medium"
            aria-label="Open filters"
          >
            <FilterIcon width={16} height={16} />
            Filters
            {activeCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-terra-500 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          <p className="hidden text-xs text-ink-400 sm:block">{total} products</p>
          <label className="relative flex items-center gap-1 text-[13px]">
            <span className="sr-only">Sort by</span>
            <select
              value={current.sort}
              onChange={(e) => {
                apply({ sort: e.target.value === "recommended" ? null : e.target.value });
                track("sort_used", { sort: e.target.value });
              }}
              className="appearance-none border border-cream-400 bg-white py-2 pl-3 pr-8 text-[13px] font-medium outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown width={14} height={14} className="pointer-events-none absolute right-2.5 text-ink-400" />
          </label>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} />
          {/* bottom sheet on mobile, side drawer on desktop */}
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-cream-50 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-96 sm:max-h-none sm:rounded-none">
            <div className="sticky top-0 flex items-center justify-between border-b border-cream-300 bg-cream-50 px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-wider">Filters</p>
              <button onClick={() => setOpen(false)} aria-label="Close filters" className="p-1">
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-6 px-5 py-5 pb-28 sm:pb-5">
              {sizes.length > 0 && (
                <section>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-400">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleIn("sizes", s)}
                        aria-pressed={current.sizes.includes(s)}
                        className={`min-w-11 border px-3 py-2 text-[13px] font-medium ${
                          current.sizes.includes(s)
                            ? "border-terra-500 bg-terra-500 text-white"
                            : "border-cream-400 bg-white text-ink-800"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {colors.length > 0 && (
                <section>
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-400">Colour</p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleIn("colors", c)}
                        aria-pressed={current.colors.includes(c)}
                        className={`border px-3 py-2 text-[13px] font-medium capitalize ${
                          current.colors.includes(c)
                            ? "border-terra-500 bg-terra-500 text-white"
                            : "border-cream-400 bg-white text-ink-800"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-400">Price</p>
                <div className="space-y-1.5">
                  {PRICE_BUCKETS.map((b) => {
                    const val = `${b.min}-${b.max}`;
                    const selected = current.price === val;
                    return (
                      <label key={val} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                        <input
                          type="radio"
                          name="price"
                          checked={selected}
                          onChange={() => apply({ price: selected ? null : val })}
                          onClick={() => selected && apply({ price: null })}
                          className="h-4 w-4 accent-terra-500"
                        />
                        {b.label}
                      </label>
                    );
                  })}
                </div>
              </section>

              <section>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={current.inStock}
                    onChange={(e) => apply({ stock: e.target.checked ? "1" : null })}
                    className="h-4 w-4 accent-terra-500"
                  />
                  In stock only
                </label>
              </section>
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-cream-300 bg-cream-50 px-5 py-4">
              <button
                onClick={() => {
                  router.push(pathname, { scroll: false });
                  setOpen(false);
                }}
                className="flex-1 border border-cream-400 bg-white py-3 text-xs font-semibold uppercase tracking-wider"
              >
                Clear all
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-terra-600 py-3 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
