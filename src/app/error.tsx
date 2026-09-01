"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl text-ink-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-400">
        An unexpected error occurred. Please try again — if it keeps happening, contact us.
      </p>
      <button
        onClick={reset}
        className="mt-6 bg-terra-600 px-8 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white"
      >
        Try again
      </button>
    </div>
  );
}
