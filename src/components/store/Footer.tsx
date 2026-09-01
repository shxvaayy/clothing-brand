import Link from "next/link";
import Image from "next/image";
import { getSettings } from "@/lib/settings";
import NewsletterForm from "./NewsletterForm";

const shopLinks = [
  { href: "/shop", label: "Shop All" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/best-sellers", label: "Best Sellers" },
  { href: "/collections", label: "Collections" },
  { href: "/sale", label: "Sale" },
];

const helpLinks = [
  { href: "/contact", label: "Contact Us" },
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns & Exchanges" },
  { href: "/size-guide", label: "Size Guide" },
  { href: "/faq", label: "FAQ" },
];

const legalLinks = [
  { href: "/about", label: "About Rare Naari" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export default async function Footer() {
  const settings = await getSettings();
  return (
    <footer className="mt-16 border-t border-cream-300 bg-cream-100">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-full" />
            <div>
              <p className="font-display text-lg tracking-[0.18em] text-terra-600 uppercase">Rare Naari</p>
              <p className="text-[11px] tracking-widest text-ink-400 uppercase">Clothing for the rare ones</p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-400">
            Thoughtfully designed womenswear in breathable fabrics — made for women who dress for themselves.
          </p>
        </div>

        <nav aria-label="Shop">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-800">Shop</p>
          <ul className="space-y-2">
            {shopLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13px] text-ink-600 hover:text-terra-600">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-800">Help</p>
          <ul className="space-y-2">
            {helpLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13px] text-ink-600 hover:text-terra-600">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-800">Stay in the loop</p>
          <p className="mb-3 text-[13px] text-ink-600">New drops, restocks and members-only offers.</p>
          <NewsletterForm />
          <ul className="mt-6 space-y-2">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13px] text-ink-600 hover:text-terra-600">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-cream-300 py-4 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
      </div>
    </footer>
  );
}
