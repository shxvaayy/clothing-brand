import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Razorpay webhook — the authoritative payment signal.
 * Idempotent: each event id is recorded once; duplicates are acknowledged
 * without re-processing, so revenue and inventory never double-count.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  const eventId = req.headers.get("x-razorpay-event-id") ?? payload?.payload?.payment?.entity?.id;
  const eventType = payload?.event ?? "unknown";

  if (eventId) {
    try {
      await db.webhookEvent.create({
        data: {
          provider: "razorpay",
          eventId,
          eventType,
          payload: payload as Prisma.InputJsonValue,
        },
      });
    } catch {
      // unique constraint hit → duplicate delivery, already processed
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  try {
    const payment = payload?.payload?.payment?.entity;
    const razorpayOrderId: string | undefined = payment?.order_id;
    if (!razorpayOrderId) return NextResponse.json({ ok: true });

    const record = await db.payment.findUnique({ where: { razorpayOrderId } });
    if (!record) return NextResponse.json({ ok: true });

    if (eventType === "payment.captured") {
      await markOrderPaid({
        orderId: record.orderId,
        razorpayPaymentId: payment.id,
        method: payment.method,
      });
    } else if (eventType === "payment.failed") {
      await markOrderPaymentFailed(record.orderId, "Payment failed (webhook)");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("razorpay webhook error", e);
    // 500 so Razorpay retries
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
