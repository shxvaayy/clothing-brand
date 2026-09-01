import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productInputSchema } from "@/lib/validation";
import { createProduct } from "@/lib/admin/products";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(["ADMIN", "EDITOR", "INVENTORY_MANAGER"]);
    const input = productInputSchema.parse(await req.json());

    const [slugTaken, skuTaken] = await Promise.all([
      db.product.findUnique({ where: { slug: input.slug } }),
      db.product.findUnique({ where: { sku: input.sku } }),
    ]);
    if (slugTaken) return badRequest("A product with this slug already exists");
    if (skuTaken) return badRequest("A product with this SKU already exists");

    const product = await createProduct(input, admin.email, admin.id);
    return ok({ id: product.id });
  } catch (e) {
    return handleApiError(e);
  }
}
