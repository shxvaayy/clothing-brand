import { formatINR } from "@/lib/money";

export function Price({
  mrp,
  price,
  size = "md",
  showPercent = true,
}: {
  mrp: number;
  price: number;
  size?: "sm" | "md" | "lg";
  showPercent?: boolean;
}) {
  const hasDiscount = mrp > price;
  const pct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const priceCls =
    size === "lg" ? "text-xl font-semibold" : size === "md" ? "text-[15px] font-semibold" : "text-sm font-semibold";
  const mrpCls = size === "lg" ? "text-base" : "text-xs";
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${priceCls} text-ink-900`}>{formatINR(price)}</span>
      {hasDiscount && (
        <>
          <span className={`${mrpCls} text-ink-400 line-through`}>{formatINR(mrp)}</span>
          {showPercent && (
            <span className={`${mrpCls} font-semibold text-terra-600`}>{pct}% OFF</span>
          )}
        </>
      )}
    </span>
  );
}
