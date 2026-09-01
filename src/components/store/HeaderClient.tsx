"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BagIcon,
  HeartIcon,
  SearchIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
  ChevronRight,
} from "@/components/ui/Icons";
import { track } from "@/lib/track-client";

export type NavCategory = { name: string; slug: string; children: { name: string; slug: string }[] };

type Suggestion = { name: string; slug: string; image: string | null; price: string };

export default function HeaderClient({
  categories,
  loggedIn,
  initialCartCount,
  initialWishCount,
}: {
  categories: NavCategory[];
  loggedIn: boolean;
  initialCartCount: number;
  initialWishCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(initialCartCount);
  const [wishCount, setWishCount] = useState(initialWishCount);

  const refreshCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/cart/count", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setCartCount(d.cart);
        setWishCount(d.wishlist);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const h = () => refreshCounts();
    window.addEventListener("rn:cart-changed", h);
    window.addEventListener("rn:wishlist-changed", h);
    return () => {
      window.removeEventListener("rn:cart-changed", h);
      window.removeEventListener("rn:wishlist-changed", h);
    };
  }, [refreshCounts]);

  // lock body scroll when a drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cream-300 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:h-16 sm:px-6">
          {/* Mobile: hamburger */}
          <button
            className="-ml-1 p-2 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Rare Naari home">
            <Image
              src="/brand/logo.png"
              alt="Rare Naari"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full"
              priority
            />
            <span className="font-display text-lg tracking-[0.18em] text-terra-600 uppercase sm:text-xl">
              Rare Naari
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-8 hidden items-center gap-6 lg:flex" aria-label="Main">
            <Link
              href="/shop"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-800 hover:text-terra-600"
            >
              Shop
            </Link>
            {categories.map((c) => (
              <div key={c.slug} className="group relative">
                <Link
                  href={`/category/${c.slug}`}
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-800 hover:text-terra-600"
                >
                  {c.name}
                </Link>
                {c.children.length > 0 && (
                  <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="min-w-44 border border-cream-300 bg-white py-2 shadow-lg shadow-cream-300/50">
                      {c.children.map((sc) => (
                        <Link
                          key={sc.slug}
                          href={`/category/${sc.slug}`}
                          className="block px-4 py-2 text-[13px] text-ink-600 hover:bg-cream-100 hover:text-terra-600"
                        >
                          {sc.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/new-arrivals"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-800 hover:text-terra-600"
            >
              New In
            </Link>
            <Link href="/sale" className="text-[11px] font-bold uppercase tracking-[0.18em] text-terra-600">
              Sale
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <button className="p-2" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <SearchIcon />
            </button>
            <Link
              href={loggedIn ? "/account" : "/login"}
              className="hidden p-2 sm:block"
              aria-label="Account"
            >
              <UserIcon />
            </Link>
            <Link href="/account/wishlist" className="relative p-2" aria-label={`Wishlist, ${wishCount} items`}>
              <HeartIcon />
              {wishCount > 0 && <Badge n={wishCount} />}
            </Link>
            <Link href="/cart" className="relative p-2" aria-label={`Shopping bag, ${cartCount} items`}>
              <BagIcon />
              {cartCount > 0 && <Badge n={cartCount} />}
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <MobileMenu categories={categories} loggedIn={loggedIn} onClose={() => setMenuOpen(false)} />
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terra-500 px-1 text-[10px] font-bold leading-none text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function MobileMenu({
  categories,
  loggedIn,
  onClose,
}: {
  categories: NavCategory[];
  loggedIn: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-cream-50 shadow-xl animate-fade-up">
        <div className="flex items-center justify-between border-b border-cream-300 px-4 py-3">
          <span className="font-display text-lg tracking-[0.18em] text-terra-600 uppercase">Rare Naari</span>
          <button className="p-2" aria-label="Close menu" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Mobile">
          <MobileLink href="/shop" label="Shop All" onClose={onClose} />
          <MobileLink href="/new-arrivals" label="New Arrivals" onClose={onClose} />
          <MobileLink href="/best-sellers" label="Best Sellers" onClose={onClose} />
          {categories.map((c) => (
            <div key={c.slug}>
              <MobileLink href={`/category/${c.slug}`} label={c.name} onClose={onClose} />
              {c.children.map((sc) => (
                <Link
                  key={sc.slug}
                  href={`/category/${sc.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between px-6 py-2.5 text-sm text-ink-600"
                >
                  {sc.name}
                  <ChevronRight width={14} height={14} className="text-ink-300" />
                </Link>
              ))}
            </div>
          ))}
          <MobileLink href="/collections" label="Collections" onClose={onClose} />
          <MobileLink href="/sale" label="Sale" onClose={onClose} accent />
          <div className="my-3 border-t border-cream-300" />
          <MobileLink href={loggedIn ? "/account" : "/login"} label={loggedIn ? "My Account" : "Login / Sign up"} onClose={onClose} />
          <MobileLink href="/account/orders" label="My Orders" onClose={onClose} />
          <MobileLink href="/contact" label="Contact Us" onClose={onClose} />
        </nav>
      </div>
    </div>
  );
}

function MobileLink({
  href,
  label,
  onClose,
  accent,
}: {
  href: string;
  label: string;
  onClose: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center justify-between px-4 py-3 text-[15px] font-medium ${
        accent ? "text-terra-600" : "text-ink-800"
      }`}
    >
      {label}
      <ChevronRight width={16} height={16} className="text-ink-300" />
    </Link>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      setRecent(JSON.parse(localStorage.getItem("rn_recent_searches") || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setSuggestions((await res.json()).products);
      } catch {}
    }, 200);
  }, [q]);

  const submit = (query: string) => {
    const cleaned = query.trim();
    if (!cleaned) return;
    const next = [cleaned, ...recent.filter((r) => r !== cleaned)].slice(0, 6);
    localStorage.setItem("rn_recent_searches", JSON.stringify(next));
    track("search", { query: cleaned });
    onClose();
    router.push(`/search?q=${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 bg-cream-50 shadow-lg animate-fade-up">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <form
            className="flex items-center gap-3 border-b-2 border-terra-500 pb-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
          >
            <SearchIcon className="shrink-0 text-ink-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for kurtas, dresses, co-ords…"
              className="w-full bg-transparent text-base outline-none placeholder:text-ink-300"
              aria-label="Search products"
            />
            <button type="button" className="p-1" aria-label="Close search" onClick={onClose}>
              <CloseIcon />
            </button>
          </form>

          {suggestions.length > 0 && (
            <ul className="divide-y divide-cream-200 py-2">
              {suggestions.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/product/${s.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 py-2.5 hover:bg-cream-100"
                  >
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt="" className="h-12 w-10 rounded object-cover" />
                    ) : (
                      <span className="h-12 w-10 rounded bg-cream-200" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                    <span className="text-sm font-semibold">{s.price}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  className="w-full py-3 text-center text-sm font-medium text-terra-600"
                  onClick={() => submit(q)}
                >
                  See all results for “{q.trim()}”
                </button>
              </li>
            </ul>
          )}

          {q.trim().length < 2 && recent.length > 0 && (
            <div className="py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Recent searches
              </p>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => submit(r)}
                    className="rounded-full border border-cream-300 bg-white px-3 py-1.5 text-sm text-ink-600"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
