"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track, notifyCartChanged } from "@/lib/track-client";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email: form.email, password: form.password } : form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      track(mode === "login" ? "login" : "signup");
      notifyCartChanged();
      router.push(next || "/account");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {mode === "register" && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Full name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-cream-400 bg-white px-3 py-3 text-sm outline-none focus:border-terra-500"
          />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">Email</span>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-cream-400 bg-white px-3 py-3 text-sm outline-none focus:border-terra-500"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-600">
          Password {mode === "register" && <span className="text-ink-400">(min 8 characters)</span>}
        </span>
        <input
          type="password"
          required
          minLength={mode === "register" ? 8 : 1}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border border-cream-400 bg-white px-3 py-3 text-sm outline-none focus:border-terra-500"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        disabled={busy}
        className="w-full bg-terra-600 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:bg-terra-700 disabled:opacity-60"
      >
        {busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      <p className="text-center text-sm text-ink-400">
        {mode === "login" ? (
          <>
            New to Rare Naari?{" "}
            <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-terra-600 underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-terra-600 underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
