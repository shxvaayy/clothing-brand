"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartSummary } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { track } from "@/lib/track-client";

export type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
};

type AddressForm = {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

const emptyAddress: AddressForm = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutClient({
  cart,
  loggedIn,
  userEmail,
  addresses,
  paymentMode,
}: {
  cart: CartSummary;
  loggedIn: boolean;
  userEmail: string | null;
  addresses: SavedAddress[];
  paymentMode: "razorpay" | "mock" | "unconfigured";
}) {
  const router = useRouter();
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [selectedId, setSelectedId] = useState<string | "new">(defaultAddr?.id ?? "new");
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [guestEmail, setGuestEmail] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  const set = (k: keyof AddressForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const currentAddress = () => {
    if (selectedId !== "new") {
      const a = addresses.find((x) => x.id === selectedId)!;
      return {
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2 ?? "",
        landmark: a.landmark ?? "",
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        country: a.country,
      };
    }
    return form;
  };

  const validate = () => {
    const a = currentAddress();
    const e: Record<string, string> = {};
    if (!loggedIn && !/^\S+@\S+\.\S+$/.test(guestEmail)) e.guestEmail = "Enter a valid email";
    if (a.fullName.trim().length < 2) e.fullName = "Enter full name";
    if (!/^[6-9]\d{9}$/.test(a.phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (a.line1.trim().length < 3) e.line1 = "Enter house/flat and street";
    if (a.city.trim().length < 2) e.city = "Enter city";
    if (a.state.trim().length < 2) e.state = "Enter state";
    if (!/^[1-9][0-9]{5}$/.test(a.pincode)) e.pincode = "Enter a valid 6-digit pincode";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const pay = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPaying(true);
    setFatal(null);
    track("payment_started", { value: cart.total });
    try {
      let utm: Record<string, string> = {};
      try {
        utm = JSON.parse(sessionStorage.getItem("rn_utm") || "{}");
      } catch {}
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: currentAddress(),
          guestEmail: loggedIn ? undefined : guestEmail.trim(),
          saveAddress: loggedIn && selectedId === "new" ? saveAddress : false,
          utm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFatal(data.error ?? "Could not start payment. Please review your bag.");
        return;
      }

      if (data.mode === "mock") {
        // Local development only — simulates a successful payment
        const v = await fetch("/api/checkout/mock-pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId }),
        });
        const vd = await v.json();
        if (v.ok) {
          track("payment_success", { orderId: data.orderId });
          router.push(vd.redirect);
        } else {
          setFatal(vd.error ?? "Payment simulation failed");
        }
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        setFatal("Could not load the payment window. Check your connection and try again.");
        return;
      }
      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: "INR",
        name: "Rare Naari",
        description: `Order ${data.orderNumber}`,
        image: "/brand/logo.png",
        order_id: data.razorpayOrderId,
        prefill: {
          name: currentAddress().fullName,
          email: loggedIn ? (userEmail ?? undefined) : guestEmail.trim(),
          contact: currentAddress().phone,
        },
        theme: { color: "#a85b44" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const v = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const vd = await v.json();
          if (v.ok) {
            track("payment_success", { orderId: data.orderId });
            router.push(vd.redirect);
          } else {
            track("payment_failed", { orderId: data.orderId });
            setFatal(vd.error ?? "Payment verification failed. If money was deducted it will be refunded.");
          }
        },
        modal: {
          ondismiss: async () => {
            track("payment_failed", { orderId: data.orderId, reason: "dismissed" });
            await fetch("/api/checkout/abandon", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderId }),
            }).catch(() => {});
            setPaying(false);
            setFatal("Payment was cancelled. Your bag is untouched — you can try again.");
          },
        },
      });
      rzp.open();
      return; // keep `paying` true while the Razorpay modal is open
    } catch {
      setFatal("Something went wrong. Please try again.");
    } finally {
      if (paymentMode !== "razorpay") setPaying(false);
    }
  };

  const field = (
    key: keyof AddressForm,
    label: string,
    opts: { half?: boolean; inputMode?: "numeric" | "text"; maxLength?: number } = {}
  ) => (
    <label className={opts.half ? "block" : "col-span-2 block"}>
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      <input
        value={form[key]}
        inputMode={opts.inputMode}
        maxLength={opts.maxLength}
        onChange={(e) =>
          set(key, opts.inputMode === "numeric" ? e.target.value.replace(/\D/g, "") : e.target.value)
        }
        className={`w-full border bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500 ${
          errors[key] ? "border-red-400" : "border-cream-400"
        }`}
      />
      {errors[key] && <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Contact */}
        <section className="border border-cream-300 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">1 · Contact</h2>
          {loggedIn ? (
            <p className="mt-2 text-sm text-ink-600">
              Signed in as <strong>{userEmail}</strong>
            </p>
          ) : (
            <div className="mt-3">
              <p className="mb-3 text-[13px] text-ink-400">
                <Link href="/login?next=/checkout" className="font-medium text-terra-600 underline">
                  Log in
                </Link>{" "}
                for faster checkout, or continue as guest.
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-600">Email for order updates</span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value);
                    setErrors((er) => ({ ...er, guestEmail: "" }));
                  }}
                  className={`w-full border bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500 ${
                    errors.guestEmail ? "border-red-400" : "border-cream-400"
                  }`}
                />
                {errors.guestEmail && (
                  <span className="mt-1 block text-xs text-red-600">{errors.guestEmail}</span>
                )}
              </label>
            </div>
          )}
        </section>

        {/* Address */}
        <section className="border border-cream-300 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">2 · Delivery address</h2>

          {addresses.length > 0 && (
            <div className="mt-3 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer gap-3 border p-3 ${
                    selectedId === a.id ? "border-terra-500 bg-terra-50" : "border-cream-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={selectedId === a.id}
                    onChange={() => setSelectedId(a.id)}
                    className="mt-1 accent-terra-500"
                  />
                  <span className="text-[13px] leading-relaxed">
                    <strong>{a.fullName}</strong>{" "}
                    <span className="ml-1 rounded bg-cream-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {a.label}
                    </span>
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                    <br />
                    <span className="text-ink-400">{a.phone}</span>
                  </span>
                </label>
              ))}
              <label
                className={`flex cursor-pointer gap-3 border p-3 ${
                  selectedId === "new" ? "border-terra-500 bg-terra-50" : "border-cream-300"
                }`}
              >
                <input
                  type="radio"
                  name="addr"
                  checked={selectedId === "new"}
                  onChange={() => setSelectedId("new")}
                  className="accent-terra-500"
                />
                <span className="text-[13px] font-medium">Use a new address</span>
              </label>
            </div>
          )}

          {selectedId === "new" && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {field("fullName", "Full name")}
              {field("phone", "Mobile number", { half: true, inputMode: "numeric", maxLength: 10 })}
              {field("pincode", "Pincode", { half: true, inputMode: "numeric", maxLength: 6 })}
              {field("line1", "House / Flat, Building")}
              {field("line2", "Street / Area (optional)")}
              {field("landmark", "Landmark (optional)")}
              {field("city", "City", { half: true })}
              {field("state", "State", { half: true })}
              {loggedIn && (
                <label className="col-span-2 flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="h-4 w-4 accent-terra-500"
                  />
                  Save this address to my account
                </label>
              )}
            </div>
          )}
        </section>

        {/* Payment */}
        <section className="border border-cream-300 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">3 · Payment</h2>
          {paymentMode === "razorpay" && (
            <p className="mt-2 text-[13px] text-ink-600">
              Pay securely with UPI, cards, netbanking or wallets via Razorpay.
            </p>
          )}
          {paymentMode === "mock" && (
            <p className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
              Development mode: Razorpay keys are not set, so payment will be <strong>simulated</strong>.
              Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to enable real payments.
            </p>
          )}
          {paymentMode === "unconfigured" && (
            <p className="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              Payments are not configured yet. Please try again later.
            </p>
          )}
        </section>

        {fatal && (
          <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fatal}
          </p>
        )}
      </div>

      {/* Summary */}
      <aside className="h-fit border border-cream-300 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Order summary</h2>
        <ul className="mt-3 max-h-64 space-y-2.5 overflow-y-auto">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-2 text-[13px]">
              <span className="min-w-0 truncate text-ink-600">
                {l.name} <span className="text-ink-400">({l.size} × {l.quantity})</span>
              </span>
              <span className="shrink-0 font-medium">{formatINR(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-cream-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-400">Subtotal</dt>
            <dd>{formatINR(cart.subtotal)}</dd>
          </div>
          {cart.couponDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-400">Coupon ({cart.couponCode})</dt>
              <dd className="text-green-700">−{formatINR(cart.couponDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-400">Shipping</dt>
            <dd>{cart.shippingFee === 0 ? "Free" : formatINR(cart.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatINR(cart.total)}</dd>
          </div>
        </dl>
        <button
          onClick={pay}
          disabled={paying || cart.lines.length === 0 || paymentMode === "unconfigured"}
          className="mt-5 w-full bg-terra-600 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:bg-terra-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {paying ? "Processing…" : `Pay ${formatINR(cart.total)}`}
        </button>
        <p className="mt-3 text-center text-[11px] text-ink-400">
          256-bit encrypted · Verified server-side
        </p>
      </aside>
    </div>
  );
}
