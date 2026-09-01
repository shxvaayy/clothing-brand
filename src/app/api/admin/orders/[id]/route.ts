import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { transitionOrder, allowedNextStatuses } from "@/lib/orders";
import { getDeliveryProvider } from "@/lib/delivery/factory";
import { audit } from "@/lib/audit";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";
import type { AddressInput } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["transition", "create-shipment"]),
  toStatus: z.string().optional(),
  note: z.string().max(300).optional(),
  restock: z.boolean().optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin(["ADMIN", "ORDER_MANAGER"]);
    const { id } = await ctx.params;
    const body = schema.parse(await req.json());
    const order = await db.order.findUnique({ where: { id }, include: { items: true, shipment: true } });
    if (!order) return badRequest("Order not found");

    if (body.action === "transition") {
      if (!body.toStatus || !allowedNextStatuses(order.status).includes(body.toStatus)) {
        return badRequest(`Cannot move order from ${order.status} to ${body.toStatus}`);
      }
      await transitionOrder({
        orderId: id,
        toStatus: body.toStatus,
        actor: admin.email,
        note: body.note,
        restock: body.restock,
      });
      await audit({
        adminId: admin.id, actor: admin.email, action: "ORDER_STATUS_CHANGED",
        entity: "Order", entityId: id,
        before: { status: order.status }, after: { status: body.toStatus },
      });
      return ok({ done: true });
    }

    // create-shipment
    if (order.shipment) return badRequest("Shipment already exists for this order");
    const provider = getDeliveryProvider();
    const address = order.addressSnapshot as unknown as AddressInput;
    const result = await provider.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      address: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
      },
      items: order.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        price: i.price,
      })),
    });
    await db.shipment.create({
      data: {
        orderId: order.id,
        provider: provider.name.toUpperCase(),
        awb: result.awb,
        labelUrl: result.labelUrl,
        trackingUrl: result.trackingUrl,
        estimatedDelivery: result.estimatedDelivery,
        status: "CREATED",
        events: { create: { status: "CREATED", note: `Shipment created via ${provider.name}` } },
      },
    });
    await audit({
      adminId: admin.id, actor: admin.email, action: "SHIPMENT_CREATED",
      entity: "Order", entityId: id, after: { awb: result.awb, provider: provider.name },
    });
    return ok({ awb: result.awb });
  } catch (e) {
    return handleApiError(e);
  }
}
