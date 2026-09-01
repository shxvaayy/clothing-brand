"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "NEWSLETTER" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return <p className="text-[13px] font-medium text-terra-600">Thank you — you’re on the list.</p>;
  }

  return (
    <form onSubmit={submit} className="flex max-w-xs">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        aria-label="Email address"
        className="min-w-0 flex-1 border border-cream-400 bg-white px-3 py-2 text-sm outline-none focus:border-terra-500"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="shrink-0 bg-terra-600 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-terra-700 disabled:opacity-60"
      >
        {state === "loading" ? "…" : "Join"}
      </button>
      {state === "error" && (
        <span className="sr-only" role="alert">Something went wrong, please try again</span>
      )}
    </form>
  );
}
