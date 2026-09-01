import { db } from "@/lib/db";

export const PAID_STATUSES = [
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type Range = { from: Date; to: Date };

export function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function rangeForPreset(preset: string): { current: Range; previous: Range; label: string } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today": {
      const prevStart = daysAgo(1);
      return {
        current: { from: todayStart, to: now },
        previous: { from: prevStart, to: todayStart },
        label: "Today",
      };
    }
    case "7d": {
      return {
        current: { from: daysAgo(7), to: now },
        previous: { from: daysAgo(14), to: daysAgo(7) },
        label: "Last 7 days",
      };
    }
    case "90d": {
      return {
        current: { from: daysAgo(90), to: now },
        previous: { from: daysAgo(180), to: daysAgo(90) },
        label: "Last 90 days",
      };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        current: { from: start, to: now },
        previous: { from: prevStart, to: start },
        label: "This month",
      };
    }
    case "30d":
    default:
      return {
        current: { from: daysAgo(30), to: now },
        previous: { from: daysAgo(60), to: daysAgo(30) },
        label: "Last 30 days",
      };
  }
}

export type CoreKpis = {
  revenue: number;
  orders: number;
  units: number;
  aov: number;
  visitors: number;
  sessions: number;
  pageViews: number;
  productViews: number;
  addToCarts: number;
  checkouts: number;
  conversion: number; // purchases / visitors
  newCustomers: number;
  cancelled: number;
};

export async function coreKpis(range: Range): Promise<CoreKpis> {
  const paidWhere = {
    status: { in: [...PAID_STATUSES] as never[] },
    createdAt: { gte: range.from, lt: range.to },
  };

  const [revenueAgg, orders, unitsAgg, visitorsRows, sessionsRows, counts, newCustomers, cancelled] =
    await Promise.all([
      db.order.aggregate({ where: paidWhere, _sum: { total: true } }),
      db.order.count({ where: paidWhere }),
      db.orderItem.aggregate({
        where: { order: paidWhere },
        _sum: { quantity: true },
      }),
      db.analyticsEvent.findMany({
        where: { createdAt: { gte: range.from, lt: range.to } },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      db.analyticsEvent.findMany({
        where: { createdAt: { gte: range.from, lt: range.to } },
        distinct: ["sessionId"],
        select: { sessionId: true },
      }),
      db.analyticsEvent.groupBy({
        by: ["type"],
        where: {
          createdAt: { gte: range.from, lt: range.to },
          type: { in: ["page_view", "product_view", "add_to_cart", "checkout_started"] },
        },
        _count: true,
      }),
      db.user.count({ where: { createdAt: { gte: range.from, lt: range.to } } }),
      db.order.count({
        where: { status: "CANCELLED", createdAt: { gte: range.from, lt: range.to } },
      }),
    ]);

  const byType = Object.fromEntries(counts.map((c) => [c.type, c._count]));
  const revenue = revenueAgg._sum.total ?? 0;
  const visitors = visitorsRows.length;

  return {
    revenue,
    orders,
    units: unitsAgg._sum.quantity ?? 0,
    aov: orders > 0 ? Math.round(revenue / orders) : 0,
    visitors,
    sessions: sessionsRows.length,
    pageViews: byType.page_view ?? 0,
    productViews: byType.product_view ?? 0,
    addToCarts: byType.add_to_cart ?? 0,
    checkouts: byType.checkout_started ?? 0,
    conversion: visitors > 0 ? (orders / visitors) * 100 : 0,
    newCustomers,
    cancelled,
  };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

/** Daily revenue + orders series for charts. */
export async function dailySeries(range: Range) {
  const orders = await db.order.findMany({
    where: {
      status: { in: [...PAID_STATUSES] as never[] },
      createdAt: { gte: range.from, lt: range.to },
    },
    select: { createdAt: true, total: true },
  });
  const days = new Map<string, { revenue: number; orders: number }>();
  const cursor = new Date(range.from);
  while (cursor < range.to) {
    days.set(cursor.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const day = days.get(key);
    if (day) {
      day.revenue += o.total;
      day.orders += 1;
    }
  }
  return [...days.entries()].map(([date, v]) => ({
    date,
    revenue: Math.round(v.revenue / 100),
    orders: v.orders,
  }));
}
