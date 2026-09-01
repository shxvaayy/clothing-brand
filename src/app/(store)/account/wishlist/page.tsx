import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCard, cardInclude } from "@/lib/products";
import ProductCard from "@/components/store/ProductCard";

export const metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = (await getSessionUser())!;
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id, product: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: cardInclude } },
  });

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl text-ink-600">Your wishlist is empty</p>
        <p className="mt-2 text-sm text-ink-400">Tap the heart on any product to save it here.</p>
        <Link
          href="/shop"
          className="mt-5 inline-block bg-terra-600 px-8 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white"
        >
          Explore the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-3">
      {items.map((item) => (
        <ProductCard key={item.productId} product={toCard(item.product)} />
      ))}
    </div>
  );
}
