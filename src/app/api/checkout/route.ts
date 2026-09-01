import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validation";
import { createOrderFromCart } from "@/lib/orders";
import { getRazorpay, razorpayConfigured, mockPaymentsEnabled } from "@/lib/razorpay";
import { releaseExpiredReservations } from "@/lib/inventory";
import { ok, badRequest, handleApiError, rateLimit, clientIp } from "@/lib/api-utils";

const bodySchema = checkoutSchema.extend({
  utm: z
    .object({
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`checkout:${clientIp(req)}`, 10, 60_000)) {
      return badRequest("Too many attempts. Please wait a minute.");
    }
    await releaseExpiredReservations();

    const body = bodySchema.parse(await req.json());
    const user = await getSessionUser();
    if (!user && !body.guestEmail) return badRequest("Email is required for guest checkout");

    const order = await createOrderFromCart({
      userId: user?.id,
      guestEmail: user ? null : body.guestEmail,
      guestPhone: body.address.phone,
      address: {
        fullName: body.address.fullName,
        phone: body.address.phone,
        line1: body.address.line1,
        line2: body.address.line2 || undefined,
        landmark: body.address.landmark || undefined,
        city: body.address.city,
        state: body.address.state,
        pincode: body.address.pincode,
        country: body.address.country,
      },
      utm: {
        source: body.utm?.utmSource,
        medium: body.utm?.utmMedium,
        campaign: body.utm?.utmCampaign,
      },
    });

    // optionally save the address to the account
    if (user && body.saveAddress) {
      const count = await db.address.count({ where: { userId: user.id } });
      await db.address.create({
        data: {
          userId: user.id,
          label: body.address.label || "Home",
          fullName: body.address.fullName,
          phone: body.address.phone,
          line1: body.address.line1,
          line2: body.address.line2 || null,
          landmark: body.address.landmark || null,
          city: body.address.city,
          state: body.address.state,
          pincode: body.address.pincode,
          country: body.address.country,
          isDefault: count === 0,
        },
      });
    }

    if (razorpayConfigured()) {
      const rzp = getRazorpay();
      const rzpOrder = await rzp.orders.create({
        amount: order.total,
        currency: "INR",
        receipt: order.orderNumber,
        notes: { orderId: order.id },
      });
      await db.payment.create({
        data: {
          orderId: order.id,
          provider: "RAZORPAY",
          razorpayOrderId: rzpOrder.id,
          status: "CREATED",
          amount: order.total,
        },
      });
      return ok({
        mode: "razorpay",
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: rzpOrder.id,
        key: process.env.RAZORPAY_KEY_ID,
        amount: order.total,
      });
    }

    if (mockPaymentsEnabled()) {
      await db.payment.create({
        data: { orderId: order.id, provider: "MOCK", status: "CREATED", amount: order.total },
      });
      return ok({ mode: "mock", orderId: order.id, orderNumber: order.orderNumber });
    }

    return badRequest("Payments are not configured");
  } catch (e) {
    return handleApiError(e);
  }
}
