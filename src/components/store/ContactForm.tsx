"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "CONTACT_FORM" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="mt-8 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Thank you — we’ve received your message and will reply within 1–2 business days.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 border border-cream-300 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider">Write to us</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Your name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Email</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">Message</span>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-cream-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-terra-500"
        />
      </label>
      {state === "error" && (
        <p className="text-sm text-red-600">Could not send your message. Please try again.</p>
      )}
      <button
        disabled={state === "loading"}
        className="bg-terra-600 px-8 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white disabled:opacity-60"
      >
        {state === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
