import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { adjustStock } from "@/lib/inventory";
import { audit } from "@/lib/audit";
import { ok, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  variantId: z.string().min(1),
  delta: z.number().int().optional(),
  setTo: z.number().int().min(0).optional(),
  note: z.string().max(200).optional(),
}).refine((d) => d.delta !== undefined || d.setTo !== undefined, {
  message: "Provide delta or setTo",
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN", "INVENTORY_MANAGER", "EDITOR"]);
    const body = schema.parse(await req.json());
    const result = await adjustStock({
      variantId: body.variantId,
      delta: body.delta,
      setTo: body.setTo,
      reason: body.setTo !== undefined ? "MANUAL_ADJUST" : (body.delta ?? 0) > 0 ? "RESTOCK" : "MANUAL_ADJUST",
      actor: admin.email,
      note: body.note,
    });
    await audit({
      adminId: admin.id,
      actor: admin.email,
      action: "INVENTORY_CHANGED",
      entity: "ProductVariant",
      entityId: body.variantId,
      before: { stock: result.previous },
      after: { stock: result.next },
    });
    return ok(result);
  } catch (e) {
    return handleApiError(e);
  }
}
