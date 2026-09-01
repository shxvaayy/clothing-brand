import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { allowedNextStatuses } from "@/lib/orders";
import type { AddressInput } from "@/lib/orders";
import OrderActions from "@/components/admin/OrderActions";
import OrderTimeline from "@/components/store/OrderTimeline";

export const metadata = { title: "Order · Admin" };

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { name: true, email: true, phone: true } },
      payment: true,
      shipment: { include: { events: { orderBy: { createdAt: "desc" } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const address = order.addressSnapshot as unknown as AddressInput;
  const next = allowedNextStatuses(order.status);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{order.orderNumber}</h1>
          <p className="text-xs text-ink-400">
            {new Date(order.createdAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Link href="/admin/orders" className="text-xs font-semibold uppercase tracking-wider text-terra-600">
          ← All orders
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="border border-cream-300 bg-white">
            <h2 className="border-b border-cream-200 px-5 py-3 text-sm font-semibold uppercase tracking-wider">
              Items
            </h2>
            <ul className="divide-y divide-cream-200 px-5">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  <div className="relative h-16 w-12 shrink-0 bg-cream-200">
                    {item.image && <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />}
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
            <dl className="space-y-1 border-t border-cream-200 px-5 py-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-400">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between"><dt className="text-ink-400">Coupon {order.couponCode}</dt><dd className="text-green-700">−{formatINR(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-ink-400">Shipping</dt><dd>{order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
            </dl>
          </section>

          <section className="border border-cream-300 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Timeline</h2>
            <OrderTimeline status={order.status} events={order.events} />
          </section>
        </div>

        <div className="space-y-5">
          <OrderActions
            orderId={order.id}
            status={order.status}
            nextStatuses={next}
            hasShipment={Boolean(order.shipment)}
          />

          <section className="border border-cream-300 bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Customer</h2>
            <p className="mt-2 font-medium">{order.user?.name ?? "Guest checkout"}</p>
            <p className="text-ink-600">{order.user?.email ?? order.guestEmail}</p>
            <p className="text-ink-600">{address.phone}</p>
            {(order.utmSource || order.utmCampaign) && (
              <p className="mt-2 text-xs text-ink-400">
                Source: {order.utmSource ?? "—"} {order.utmCampaign ? `· ${order.utmCampaign}` : ""}
              </p>
            )}
          </section>

          <section className="border border-cream-300 bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Shipping address</h2>
            <p className="mt-2 leading-relaxed text-ink-600">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.pincode}
            </p>
          </section>

          <section className="border border-cream-300 bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Payment</h2>
            {order.payment ? (
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between"><dt className="text-ink-400">Provider</dt><dd>{order.payment.provider}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-400">Status</dt><dd className="font-medium">{order.payment.status}</dd></div>
                {order.payment.razorpayPaymentId && (
                  <div className="flex justify-between gap-2"><dt className="text-ink-400">Payment ID</dt><dd className="truncate text-xs">{order.payment.razorpayPaymentId}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ink-400">Amount</dt><dd>{formatINR(order.payment.amount)}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-ink-400">No payment record</p>
            )}
          </section>

          {order.shipment && (
            <section className="border border-cream-300 bg-white p-5 text-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider">Shipment</h2>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between"><dt className="text-ink-400">Provider</dt><dd>{order.shipment.provider}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-400">AWB</dt><dd className="font-medium">{order.shipment.awb}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-400">Status</dt><dd>{order.shipment.status}</dd></div>
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
