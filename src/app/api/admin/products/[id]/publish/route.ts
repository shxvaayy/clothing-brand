import { requireAdmin } from "@/lib/auth";
import { publishProduct, unpublishProduct } from "@/lib/admin/products";
import { ok, handleApiError, badRequest } from "@/lib/api-utils";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin(["ADMIN", "EDITOR"]);
    const { id } = await ctx.params;
    const { action } = z.object({ action: z.enum(["publish", "unpublish"]) }).parse(await req.json());
    if (action === "publish") await publishProduct(id, admin.email, admin.id);
    else await unpublishProduct(id, admin.email, admin.id);
    return ok({ done: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("No record")) return badRequest("Product not found");
    return handleApiError(e);
  }
}
