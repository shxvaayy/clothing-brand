"use client";

import { useState } from "react";
import { TruckIcon } from "@/components/ui/Icons";

type Result =
  | { serviceable: true; estimatedDays?: number; codAvailable?: boolean; pending?: boolean }
  | { serviceable: false; pending?: boolean };

export default function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setError("Enter a valid 6-digit pincode");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/delivery/serviceability?pincode=${pincode}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Could not check right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-cream-300 bg-cream-100 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-600">
        <TruckIcon width={16} height={16} /> Delivery
      </p>
      <form onSubmit={check} className="mt-2.5 flex">
        <input
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter pincode"
          aria-label="Delivery pincode"
          className="min-w-0 flex-1 border border-cream-400 bg-white px-3 py-2 text-sm outline-none focus:border-terra-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 bg-ink-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-60"
        >
          {busy ? "…" : "Check"}
        </button>
      </form>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      {result && result.serviceable && (
        <p className="mt-2 text-[13px] text-green-700">
          Delivery available
          {result.estimatedDays ? ` · usually in ${result.estimatedDays}–${result.estimatedDays + 2} days` : ""}
        </p>
      )}
      {result && !result.serviceable && (
        <p className="mt-2 text-[13px] text-red-600">Sorry, we don’t deliver to this pincode yet.</p>
      )}
    </div>
  );
}
