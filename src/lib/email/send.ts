import { db } from "../db";
import { sendMail } from "./mailer";
import { orderConfirmationEmail, orderStatusEmail, welcomeEmail } from "./templates";
import type { AddressInput } from "../orders";

async function orderRecipient(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true } } },
  });
  if (!order) return null;
  const email = order.user?.email ?? order.guestEmail;
  if (!email) return null;
  return { order, email };
}

export async function sendOrderConfirmation(orderId: string) {
  const r = await orderRecipient(orderId);
  if (!r) return;
  const address = r.order.addressSnapshot as unknown as AddressInput;
  await sendMail({
    to: r.email,
    subject: `Order confirmed · ${r.order.orderNumber} · Rare Naari`,
    html: orderConfirmationEmail({
      orderNumber: r.order.orderNumber,
      total: r.order.total,
      shippingFee: r.order.shippingFee,
      discount: r.order.discount,
      subtotal: r.order.subtotal,
      items: r.order.items,
      address,
    }),
  });
}

export async function sendOrderStatusUpdate(orderId: string, status: string) {
  const r = await orderRecipient(orderId);
  if (!r) return;
  const mail = orderStatusEmail(r.order.orderNumber, status);
  if (!mail) return;
  await sendMail({ to: r.email, subject: mail.subject, html: mail.html });
}

export async function sendWelcome(email: string, name: string) {
  await sendMail({
    to: email,
    subject: "Welcome to Rare Naari",
    html: welcomeEmail(name),
  });
}
