"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { MenuIcon, CloseIcon } from "@/components/ui/Icons";

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    group: "Commerce",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/inventory", label: "Inventory" },
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/coupons", label: "Coupons" },
    ],
  },
  {
    group: "Catalog",
    items: [
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/collections", label: "Collections" },
    ],
  },
  {
    group: "Marketing",
    items: [{ href: "/admin/leads", label: "Leads" }],
  },
  {
    group: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Overview" },
      { href: "/admin/analytics/products", label: "Products" },
      { href: "/admin/analytics/funnel", label: "Funnel" },
      { href: "/admin/analytics/search", label: "Search" },
      { href: "/admin/analytics/realtime", label: "Realtime" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/homepage", label: "Homepage" },
      { href: "/admin/content", label: "Pages" },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/audit-logs", label: "Audit Logs" },
    ],
  },
];

export default function AdminShell({
  adminName,
  adminRole,
  children,
}: {
  adminName: string;
  adminRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" || href === "/admin/analytics"
      ? pathname === href
      : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 border-b border-ink-600/30 px-5 py-4">
        <Image src="/brand/logo.png" alt="" width={32} height={32} className="rounded-full" />
        <div>
          <p className="font-display text-sm tracking-[0.18em] text-cream-100 uppercase">Rare Naari</p>
          <p className="text-[10px] tracking-widest text-ink-300 uppercase">Admin</p>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((section) => (
          <div key={section.group} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
              {section.group}
            </p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded px-2 py-1.5 text-[13px] ${
                  isActive(item.href)
                    ? "bg-terra-500/20 font-medium text-terra-200"
                    : "text-cream-300/80 hover:bg-ink-600/30 hover:text-cream-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-ink-600/30 px-5 py-3">
        <p className="truncate text-[13px] font-medium text-cream-100">{adminName}</p>
        <p className="text-[10px] uppercase tracking-wider text-ink-300">{adminRole.replaceAll("_", " ")}</p>
        <div className="mt-2 flex gap-3 text-[11px]">
          <Link href="/" target="_blank" className="text-ink-300 underline hover:text-cream-100">
            View store
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/admin/auth/logout", { method: "POST" });
              router.push("/admin/login");
              router.refresh();
            }}
            className="text-red-400 underline"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-ink-900 lg:block">{sidebar}</aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-ink-900 px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open admin menu" className="text-cream-100">
          <MenuIcon />
        </button>
        <p className="font-display text-sm tracking-[0.18em] text-cream-100 uppercase">Rare Naari Admin</p>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-ink-900">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 text-cream-100"
            >
              <CloseIcon />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="px-4 py-6 lg:ml-60 lg:px-8">{children}</main>
    </div>
  );
}
