import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import HeaderClient, { type NavCategory } from "./HeaderClient";
import Link from "next/link";

export default async function Header() {
  const [categories, user, settings] = await Promise.all([
    db.category.findMany({
      where: { active: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      include: { children: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
      take: 6,
    }),
    getSessionUser(),
    getSettings(),
  ]);

  let cartCount = 0;
  let wishCount = 0;
  if (user) {
    const [cart, wish] = await Promise.all([
      db.cartItem.aggregate({
        where: { cart: { userId: user.id } },
        _sum: { quantity: true },
      }),
      db.wishlistItem.count({ where: { userId: user.id } }),
    ]);
    cartCount = cart._sum.quantity ?? 0;
    wishCount = wish;
  } else {
    const token = (await cookies()).get("rn_cart")?.value;
    if (token) {
      const cart = await db.cartItem.aggregate({
        where: { cart: { token } },
        _sum: { quantity: true },
      });
      cartCount = cart._sum.quantity ?? 0;
    }
  }

  const nav: NavCategory[] = categories.map((c) => ({
    name: c.name,
    slug: c.slug,
    children: c.children.map((sc) => ({ name: sc.name, slug: sc.slug })),
  }));

  return (
    <>
      {settings.announcementText && (
        <div className="bg-terra-600 px-3 py-1.5 text-center text-[11px] font-medium tracking-wider text-cream-100 sm:text-xs">
          <Link href="/shop">{settings.announcementText}</Link>
        </div>
      )}
      <HeaderClient
        categories={nav}
        loggedIn={Boolean(user)}
        initialCartCount={cartCount}
        initialWishCount={wishCount}
      />
    </>
  );
}
