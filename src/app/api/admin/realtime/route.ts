import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAdmin();
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000);

    const [events, active] = await Promise.all([
      db.analyticsEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          type: true,
          path: true,
          query: true,
          device: true,
          country: true,
          createdAt: true,
          productId: true,
        },
      }),
      db.analyticsEvent.findMany({
        where: { createdAt: { gte: fiveMinAgo } },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
    ]);

    const productIds = [...new Set(events.map((e) => e.productId).filter(Boolean))] as string[];
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(products.map((p) => [p.id, p.name]));

    return ok({
      activeVisitors: active.length,
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        path: e.path,
        query: e.query,
        device: e.device,
        country: e.country,
        createdAt: e.createdAt,
        productName: e.productId ? (nameMap.get(e.productId) ?? null) : null,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
