import { formatINR } from "../money";

const BRAND = {
  name: "Rare Naari",
  terracotta: "#A85B44",
  cream: "#FAF5EE",
  ink: "#2B2320",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

/** Shared shell for all transactional emails — table layout for client support. */
export function emailShell(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:Georgia,'Times New Roman',serif;color:${BRAND.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #EADFD2;">
  <tr><td style="padding:28px 32px;text-align:center;border-bottom:1px solid #EADFD2;">
    <div style="font-size:22px;letter-spacing:4px;text-transform:uppercase;color:${BRAND.terracotta};font-weight:bold;">Rare Naari</div>
    <div style="font-size:11px;letter-spacing:2px;color:#8a7a6e;margin-top:4px;">CLOTHING FOR THE RARE ONES</div>
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="font-size:20px;margin:0 0 16px;font-weight:normal;">${title}</h1>
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #EADFD2;font-size:12px;color:#8a7a6e;text-align:center;">
    Team Rare Naari · <a href="${BRAND.appUrl}" style="color:${BRAND.terracotta};">${BRAND.appUrl.replace(/^https?:\/\//, "")}</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

type OrderForEmail = {
  orderNumber: string;
  total: number;
  shippingFee: number;
  discount: number;
  subtotal: number;
  items: { name: string; size: string; color: string; quantity: number; price: number }[];
  address: { fullName: string; line1: string; line2?: string | null; city: string; state: string; pincode: string };
};

function itemsTable(order: OrderForEmail) {
  const rows = order.items
    .map(
      (i) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8dd;font-size:14px;">${i.name}<br>
        <span style="font-size:12px;color:#8a7a6e;">${i.color} / ${i.size} × ${i.quantity}</span></td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8dd;text-align:right;font-size:14px;">${formatINR(i.price * i.quantity)}</td>
    </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
    <tr><td style="padding:10px 0 2px;font-size:13px;color:#8a7a6e;">Subtotal</td><td style="padding:10px 0 2px;text-align:right;font-size:13px;">${formatINR(order.subtotal)}</td></tr>
    ${order.discount > 0 ? `<tr><td style="padding:2px 0;font-size:13px;color:#8a7a6e;">Discount</td><td style="padding:2px 0;text-align:right;font-size:13px;color:#2e7d32;">−${formatINR(order.discount)}</td></tr>` : ""}
    <tr><td style="padding:2px 0;font-size:13px;color:#8a7a6e;">Shipping</td><td style="padding:2px 0;text-align:right;font-size:13px;">${order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}</td></tr>
    <tr><td style="padding:8px 0;font-size:15px;font-weight:bold;">Total</td><td style="padding:8px 0;text-align:right;font-size:15px;font-weight:bold;">${formatINR(order.total)}</td></tr>
  </table>`;
}

export function orderConfirmationEmail(order: OrderForEmail) {
  const a = order.address;
  return emailShell(
    "Your order is confirmed",
    `<p style="font-size:14px;line-height:1.6;">Thank you for shopping with Rare Naari. Your order <strong>${order.orderNumber}</strong> has been confirmed and is being prepared with care.</p>
    ${itemsTable(order)}
    <p style="font-size:13px;line-height:1.6;color:#8a7a6e;margin-top:20px;"><strong style="color:#2B2320;">Delivering to</strong><br>
    ${a.fullName}<br>${a.line1}${a.line2 ? ", " + a.line2 : ""}<br>${a.city}, ${a.state} ${a.pincode}</p>
    <p style="text-align:center;margin:28px 0 8px;">
      <a href="${BRAND.appUrl}/account/orders" style="background:${BRAND.terracotta};color:#fff;text-decoration:none;padding:12px 32px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Track your order</a>
    </p>`
  );
}

const STATUS_COPY: Record<string, { subject: string; body: string }> = {
  CONFIRMED: { subject: "Your order is confirmed", body: "Your order has been confirmed and will be processed shortly." },
  PROCESSING: { subject: "Your order is being prepared", body: "Our team is preparing your order." },
  PACKED: { subject: "Your order is packed", body: "Your order has been packed and will be handed to our delivery partner soon." },
  SHIPPED: { subject: "Your order is on its way", body: "Your order has been shipped." },
  OUT_FOR_DELIVERY: { subject: "Your order is out for delivery", body: "Your order will reach you today." },
  DELIVERED: { subject: "Your order has been delivered", body: "Your order has been delivered. We hope you love it." },
  CANCELLED: { subject: "Your order has been cancelled", body: "Your order has been cancelled. If you paid online, your refund will be initiated shortly." },
  RETURNED: { subject: "Your return is complete", body: "We have received your return." },
  REFUNDED: { subject: "Your refund has been processed", body: "Your refund has been processed and should reflect in your account within 5–7 business days." },
};

export function orderStatusEmail(orderNumber: string, status: string) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  return {
    subject: `${copy.subject} · ${orderNumber}`,
    html: emailShell(
      copy.subject,
      `<p style="font-size:14px;line-height:1.6;">Order <strong>${orderNumber}</strong>: ${copy.body}</p>
      <p style="text-align:center;margin:28px 0 8px;">
        <a href="${BRAND.appUrl}/account/orders" style="background:${BRAND.terracotta};color:#fff;text-decoration:none;padding:12px 32px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">View order</a>
      </p>`
    ),
  };
}

export function welcomeEmail(name: string) {
  return emailShell(
    `Welcome, ${name}`,
    `<p style="font-size:14px;line-height:1.6;">Welcome to Rare Naari — clothing for the rare ones. Your account is ready.</p>
    <p style="text-align:center;margin:28px 0 8px;">
      <a href="${BRAND.appUrl}/shop" style="background:${BRAND.terracotta};color:#fff;text-decoration:none;padding:12px 32px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Start shopping</a>
    </p>`
  );
}
