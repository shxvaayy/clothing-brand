import { z } from "zod";
import { db } from "@/lib/db";
import { mockPaymentsEnabled } from "@/lib/razorpay";
import { markOrderPaid } from "@/lib/orders";
import { orderSig } from "@/lib/order-token";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

/**
 * Development-only payment simulator. Active ONLY when Razorpay keys are
 * absent and NODE_ENV !== production. Lets the full order lifecycle be
 * tested locally before the client shares real keys.
 */
export async function POST(req: Request) {
  try {
    if (!mockPaymentsEnabled()) return badRequest("Not available");
    const { orderId } = z.object({ orderId: z.string().min(1) }).parse(await req.json());

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return badRequest("Order not found");

    await markOrderPaid({ orderId, method: "mock", provider: "MOCK" });
    return ok({
      redirect: `/order-confirmed/${order.orderNumber}?sig=${orderSig(order.orderNumber)}`,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
