import { CheckIcon } from "@/components/ui/Icons";

const STEPS = [
  { key: "PAID", label: "Order placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "PACKED", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

const TERMINAL: Record<string, string> = {
  CANCELLED: "This order was cancelled.",
  RETURN_REQUESTED: "Return requested.",
  RETURNED: "Order returned.",
  REFUNDED: "Refund processed.",
};

export default function OrderTimeline({
  status,
  events,
}: {
  status: string;
  events: { status: string; note: string | null; createdAt: Date }[];
}) {
  if (TERMINAL[status]) {
    return (
      <div className="border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-ink-600">
        {TERMINAL[status]}
      </div>
    );
  }

  const reached = new Set(events.map((e) => e.status));
  reached.add(status);
  let activeIndex = 0;
  STEPS.forEach((s, i) => {
    if (reached.has(s.key)) activeIndex = i;
  });

  return (
    <ol className="relative space-y-0">
      {STEPS.map((step, i) => {
        const done = i <= activeIndex;
        const event = events.find((e) => e.status === step.key);
        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                className={`absolute left-[11px] top-6 h-full w-0.5 ${
                  i < activeIndex ? "bg-terra-500" : "bg-cream-300"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-terra-500 text-white" : "border-2 border-cream-300 bg-white"
              }`}
            >
              {done && <CheckIcon width={13} height={13} />}
            </span>
            <div className="pt-0.5">
              <p className={`text-sm font-medium ${done ? "text-ink-900" : "text-ink-300"}`}>
                {step.label}
              </p>
              {event && (
                <p className="text-xs text-ink-400">
                  {new Date(event.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
