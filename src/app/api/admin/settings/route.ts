import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { ok, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  storeName: z.string().min(1).max(60),
  supportEmail: z.string().email(),
  supportPhone: z.string().max(15).optional().or(z.literal("")),
  freeShippingAbove: z.number().int().min(0),
  shippingFee: z.number().int().min(0),
  announcementText: z.string().max(140),
  instagramUrl: z.string().max(200).optional().or(z.literal("")),
  returnWindowDays: z.number().int().min(0).max(60),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN"]);
    const body = schema.parse(await req.json());
    const before = await getSettings();
    const next = await saveSettings(body);
    await audit({
      adminId: admin.id, actor: admin.email, action: "SETTINGS_UPDATED",
      entity: "Setting", entityId: "store", before, after: next,
    });
    return ok(next);
  } catch (e) {
    return handleApiError(e);
  }
}
