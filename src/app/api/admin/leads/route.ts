import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  id: z.string().min(1),
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP", "CONVERTED", "LOST", "UNQUALIFIED"])
    .optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN", "EDITOR", "ORDER_MANAGER"]);
    const body = schema.parse(await req.json());
    const lead = await db.lead.findUnique({ where: { id: body.id } });
    if (!lead) return badRequest("Lead not found");
    const updated = await db.lead.update({
      where: { id: body.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    await audit({
      adminId: admin.id, actor: admin.email, action: "LEAD_UPDATED", entity: "Lead", entityId: body.id,
      before: { status: lead.status }, after: { status: updated.status },
    });
    return ok(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
