import { rangeForPreset } from "@/lib/admin/metrics";
import { coreKpis } from "@/lib/admin/metrics";
import RangePicker from "@/components/admin/RangePicker";

export const metadata = { title: "Funnel · Admin" };

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const preset = sp.range ?? "30d";
  const { current, label } = rangeForPreset(preset);
  const k = await coreKpis(current);

  const steps = [
    { label: "Visitors", value: k.visitors },
    { label: "Product views", value: k.productViews },
    { label: "Added to cart", value: k.addToCarts },
    { label: "Checkout started", value: k.checkouts },
    { label: "Purchases", value: k.orders },
  ];

  // find the biggest drop-off between consecutive steps
  let worstIdx = -1;
  let worstRate = 1;
  for (let i = 1; i < steps.length; i++) {
    if (steps[i - 1].value === 0) continue;
    const rate = steps[i].value / steps[i - 1].value;
    if (rate < worstRate) {
      worstRate = rate;
      worstIdx = i;
    }
  }

  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Conversion funnel</h1>
          <p className="text-xs text-ink-400">{label}</p>
        </div>
        <RangePicker basePath="/admin/analytics/funnel" active={preset} />
      </div>

      <div className="border border-cream-300 bg-white p-5 sm:p-8">
        <ol className="space-y-4">
          {steps.map((step, i) => {
            const fromPrev = i > 0 && steps[i - 1].value > 0 ? (step.value / steps[i - 1].value) * 100 : null;
            const isWorst = i === worstIdx;
            return (
              <li key={step.label}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {step.label}
                    {isWorst && (
                      <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600">
                        Biggest drop-off
                      </span>
                    )}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{step.value.toLocaleString("en-IN")}</span>
                    {fromPrev != null && (
                      <span className={`ml-2 text-xs ${isWorst ? "text-red-600" : "text-ink-400"}`}>
                        {fromPrev.toFixed(1)}% of previous
                      </span>
                    )}
                  </p>
                </div>
                <div className="h-7 w-full bg-cream-100">
                  <div
                    className={`h-full ${isWorst ? "bg-terra-400" : "bg-terra-500"}`}
                    style={{ width: `${Math.max((step.value / max) * 100, step.value > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 text-sm text-ink-600">
          Overall conversion:{" "}
          <strong>{k.visitors > 0 ? ((k.orders / k.visitors) * 100).toFixed(2) : "0.00"}%</strong>{" "}
          of visitors purchased in this period.
        </p>
      </div>
    </div>
  );
}
