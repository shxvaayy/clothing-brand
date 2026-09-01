import { getCartSummary } from "@/lib/cart";
import { releaseExpiredReservations } from "@/lib/inventory";
import CartClient from "@/components/store/CartClient";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Shopping Bag", path: "/cart", noindex: true });

export default async function CartPage() {
  await releaseExpiredReservations();
  const summary = await getCartSummary();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-6 font-display text-2xl text-ink-900 sm:text-3xl">
        Shopping Bag{summary.itemCount > 0 ? ` (${summary.itemCount})` : ""}
      </h1>
      <CartClient initial={summary} />
    </div>
  );
}
