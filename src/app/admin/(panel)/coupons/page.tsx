import { db } from "@/lib/db";
import CouponManager from "@/components/admin/CouponManager";

export const metadata = { title: "Coupons · Admin" };

export default async function CouponsPage() {
  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl">Coupons</h1>
      <CouponManager
        items={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          minCartValue: c.minCartValue,
          maxDiscount: c.maxDiscount,
          startsAt: c.startsAt?.toISOString() ?? null,
          endsAt: c.endsAt?.toISOString() ?? null,
          usageLimit: c.usageLimit,
          perUserLimit: c.perUserLimit,
          active: c.active,
          used: c._count.redemptions,
        }))}
      />
    </div>
  );
}
