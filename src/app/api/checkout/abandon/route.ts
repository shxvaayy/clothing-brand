import { z } from "zod";
import { db } from "@/lib/db";
import { markOrderPaymentFailed } from "@/lib/orders";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

/** Customer closed the payment modal — release the stock reservation immediately. */
export async function POST(req: Request) {
  try {
    const { orderId } = z.object({ orderId: z.string().min(1) }).parse(await req.json());
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return badRequest("Order not found");
    if (order.status === "PAYMENT_PENDING") {
      await markOrderPaymentFailed(orderId, "Payment cancelled by customer");
    }
    return ok({ done: true });
  } catch (e) {
    return handleApiError(e);
  }
}
