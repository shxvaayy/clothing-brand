import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { ok, handleApiError } from "@/lib/api-utils";

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return ok({ products: [] });

    const products = await db.product.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tags: { hasSome: q.toLowerCase().split(/\s+/) } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      },
      orderBy: [{ bestSeller: "desc" }, { publishedAt: "desc" }],
      take: 6,
    });

    return ok({
      products: products.map((p) => ({
        name: p.name,
        slug: p.slug,
        image: p.images[0]?.url ?? null,
        price: formatINR(p.sellingPrice),
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
