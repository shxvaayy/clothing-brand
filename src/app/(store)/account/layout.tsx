import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/store/LogoutButton";

const nav = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-2xl text-ink-900 sm:text-3xl">My Account</h1>
      <p className="mt-1 text-sm text-ink-400">Hello, {user.name.split(" ")[0]}</p>

      <div className="mt-6 grid gap-8 md:grid-cols-[210px_1fr]">
        <nav
          aria-label="Account"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto border-b border-cream-300 px-4 pb-2 md:mx-0 md:flex-col md:gap-0 md:border-0 md:px-0 md:pb-0"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-cream-300 bg-white px-4 py-2 text-[13px] font-medium text-ink-600 hover:text-terra-600 md:rounded-none md:border-0 md:border-b md:border-cream-200 md:bg-transparent md:px-0 md:py-3"
            >
              {item.label}
            </Link>
          ))}
          <div className="shrink-0 md:pt-3">
            <LogoutButton />
          </div>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
