import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import OrderTimeline from "@/components/store/OrderTimeline";
import type { AddressInput } from "@/lib/orders";

export const metadata = { title: "Order Details", robots: { index: false } };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getSessionUser()]);
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      shipment: { include: { events: { orderBy: { createdAt: "desc" } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || !user || order.userId !== user.id) notFound();

  const address = order.addressSnapshot as unknown as AddressInput;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{order.orderNumber}</h2>
          <p className="text-xs text-ink-400">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/account/orders" className="text-xs font-semibold uppercase tracking-wider text-terra-600">
          ← All orders
        </Link>
      </div>

      <section className="border border-cream-300 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">Order status</h3>
        <OrderTimeline status={order.status} events={order.events} />
        {order.shipment?.awb && (
          <p className="mt-4 border-t border-cream-200 pt-3 text-[13px] text-ink-600">
            Tracking ID: <strong>{order.shipment.awb}</strong>
            {order.shipment.trackingUrl && order.shipment.trackingUrl.startsWith("http") && (
              <>
                {" · "}
                <a href={order.shipment.trackingUrl} className="text-terra-600 underline" target="_blank" rel="noreferrer">
                  Track with courier
                </a>
              </>
            )}
          </p>
        )}
      </section>

      <section className="border border-cream-300 bg-white">
        <ul className="divide-y divide-cream-200 px-5">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 py-4">
              <div className="relative h-20 w-16 shrink-0 bg-cream-200">
                {item.image && <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />}
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
            <dt>Total</dt>
            <dd>{formatINR(order.total)}</dd>
          </div>
          {order.payment && (
            <p className="pt-1 text-xs text-ink-400">
              Paid via {order.payment.provider === "MOCK" ? "test payment" : order.payment.method || "Razorpay"}
            </p>
          )}
        </dl>
      </section>

      <section className="border border-cream-300 bg-white px-5 py-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Delivery address</p>
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
      </section>
    </div>
  );
}
