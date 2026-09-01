import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { markOrderPaid } from "@/lib/orders";
import { orderSig } from "@/lib/order-token";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    // NEVER trust the frontend callback alone — verify the HMAC signature.
    const valid = verifyPaymentSignature({
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!valid) return badRequest("Payment verification failed");

    const payment = await db.payment.findUnique({
      where: { razorpayOrderId: body.razorpay_order_id },
      include: { order: true },
    });
    if (!payment) return badRequest("Order not found");

    await markOrderPaid({
      orderId: payment.orderId,
      razorpayPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });

    return ok({
      redirect: `/order-confirmed/${payment.order.orderNumber}?sig=${orderSig(payment.order.orderNumber)}`,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
