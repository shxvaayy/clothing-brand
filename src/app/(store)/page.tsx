import { Fragment } from "react";
import { db } from "@/lib/db";
import { RenderSection } from "@/components/store/HomeSections";
import { pageMetadata, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/money";
import { TruckIcon, ReturnIcon, ShieldIcon } from "@/components/ui/Icons";

export const metadata = pageMetadata({
  title: `${SITE.name} — ${SITE.tagline} | Premium Womenswear`,
  description: SITE.description,
  path: "/",
});

export const revalidate = 60;

export default async function HomePage() {
  const [sections, settings] = await Promise.all([
    db.homepageSection.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
    getSettings(),
  ]);

  const trust = [
    { icon: TruckIcon, text: `Free shipping above ${formatINR(settings.freeShippingAbove)}` },
    { icon: ReturnIcon, text: `${settings.returnWindowDays}-day easy returns` },
    { icon: ShieldIcon, text: "Secure Razorpay checkout" },
  ];

  return (
    <div className="space-y-12 pb-4 sm:space-y-20">
      {sections.map((s, i) => (
        <Fragment key={s.id}>
          <RenderSection section={s} index={i} />
          {/* trust strip right after the hero — earn trust before selling */}
          {i === 0 && s.type === "HERO" && (
            <div className="!mt-0 border-b border-cream-300 bg-cream-100">
              <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 overflow-x-auto px-4 py-3 sm:gap-14">
                {trust.map((t) => (
                  <p
                    key={t.text}
                    className="flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-600"
                  >
                    <t.icon width={15} height={15} className="text-terra-500" />
                    {t.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Fragment>
      ))}
      {sections.length === 0 && (
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-3xl">Rare Naari</h1>
          <p className="mt-3 text-sm text-ink-400">
            The homepage has no published sections yet. Add sections from Admin → Homepage.
          </p>
        </div>
      )}
    </div>
  );
}
