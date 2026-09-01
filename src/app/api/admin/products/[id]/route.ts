import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { productInputSchema } from "@/lib/validation";
import { saveProduct } from "@/lib/admin/products";
import { audit } from "@/lib/audit";
import { ok, badRequest, handleApiError } from "@/lib/api-utils";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin(["ADMIN", "EDITOR", "INVENTORY_MANAGER"]);
    const { id } = await ctx.params;
    const input = productInputSchema.parse(await req.json());

    const [slugTaken, skuTaken] = await Promise.all([
      db.product.findFirst({ where: { slug: input.slug, id: { not: id } } }),
      db.product.findFirst({ where: { sku: input.sku, id: { not: id } } }),
    ]);
    if (slugTaken) return badRequest("A product with this slug already exists");
    if (skuTaken) return badRequest("A product with this SKU already exists");

    const result = await saveProduct(id, input, admin.email, admin.id);
    return ok(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireAdmin(["ADMIN"]);
    const { id } = await ctx.params;
    const product = await db.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) return badRequest("Product not found");
    if (product._count.orderItems > 0) {
      return badRequest("This product has order history — unpublish it instead of deleting");
    }
    await db.product.delete({ where: { id } });
    await audit({
      adminId: admin.id, actor: admin.email, action: "PRODUCT_DELETED",
      entity: "Product", entityId: id, before: { name: product.name },
    });
    return ok({ done: true });
  } catch (e) {
    return handleApiError(e);
  }
}
