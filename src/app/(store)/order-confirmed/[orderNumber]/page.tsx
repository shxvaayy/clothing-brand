import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { verifyOrderSig } from "@/lib/order-token";
import { formatINR } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import type { AddressInput } from "@/lib/orders";
import { CheckIcon } from "@/components/ui/Icons";

export const metadata = pageMetadata({
  title: "Order Confirmed",
  path: "/order-confirmed",
  noindex: true,
});

export default async function OrderConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ sig?: string }>;
}) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams]);
  const user = await getSessionUser();
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, payment: true },
  });
  if (!order) notFound();

  const owns =
    (user && order.userId === user.id) || (sp.sig && verifyOrderSig(orderNumber, sp.sig));
  if (!owns) notFound();

  const address = order.addressSnapshot as unknown as AddressInput;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <CheckIcon width={30} height={30} />
        </span>
        <h1 className="mt-4 font-display text-3xl text-ink-900">Order confirmed</h1>
        <p className="mt-2 text-sm text-ink-400">
          Thank you, {address.fullName.split(" ")[0]}. Your order{" "}
          <strong className="text-ink-800">{order.orderNumber}</strong> has been placed.
        </p>
        {(order.guestEmail || order.userId) && (
          <p className="mt-1 text-xs text-ink-400">A confirmation email is on its way.</p>
        )}
      </div>

      <div className="mt-8 border border-cream-300 bg-white">
        <ul className="divide-y divide-cream-200 px-5">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 py-4">
              <div className="relative h-20 w-16 shrink-0 bg-cream-200">
                {item.image && (
                  <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs capitalize text-ink-400">
                  {item.color} / {item.size} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatINR(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-cream-200 px-5 py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-400">Subtotal</dt>
            <dd>{formatINR(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-400">Coupon {order.couponCode}</dt>
              <dd className="text-green-700">−{formatINR(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-400">Shipping</dt>
            <dd>{order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>Total paid</dt>
            <dd>{formatINR(order.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 border border-cream-300 bg-white px-5 py-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Delivering to</p>
        <p className="mt-1.5 leading-relaxed text-ink-600">
          {address.fullName}
          <br />
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}
          <br />
          {address.city}, {address.state} {address.pincode}
          <br />
          {address.phone}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {order.userId ? (
          <Link
            href={`/account/orders/${order.id}`}
            className="flex-1 bg-terra-600 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-white"
          >
            Track order
          </Link>
        ) : (
          <p className="flex-1 border border-cream-300 bg-cream-100 px-4 py-3 text-center text-xs text-ink-600">
            Order updates will be sent to {order.guestEmail}
          </p>
        )}
        <Link
          href="/shop"
          className="flex-1 border border-ink-800 py-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-ink-800"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
