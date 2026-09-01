import { redirect } from "next/navigation";
import { getCartSummary } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth";
import { releaseExpiredReservations } from "@/lib/inventory";
import { razorpayConfigured, mockPaymentsEnabled } from "@/lib/razorpay";
import { db } from "@/lib/db";
import CheckoutClient from "@/components/store/CheckoutClient";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Checkout", path: "/checkout", noindex: true });

export default async function CheckoutPage() {
  await releaseExpiredReservations();
  const [cart, user] = await Promise.all([getCartSummary(), getSessionUser()]);
  if (cart.lines.length === 0) redirect("/cart");

  const addresses = user
    ? await db.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const paymentMode = razorpayConfigured()
    ? ("razorpay" as const)
    : mockPaymentsEnabled()
      ? ("mock" as const)
      : ("unconfigured" as const);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-6 font-display text-2xl text-ink-900 sm:text-3xl">Checkout</h1>
      <CheckoutClient
        cart={cart}
        loggedIn={Boolean(user)}
        userEmail={user?.email ?? null}
        addresses={addresses}
        paymentMode={paymentMode}
      />
    </div>
  );
}
