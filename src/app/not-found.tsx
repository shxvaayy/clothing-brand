import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <Image src="/brand/logo.png" alt="" width={72} height={72} className="rounded-full opacity-80" />
      <h1 className="mt-6 font-display text-4xl text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-400">
        The page you’re looking for doesn’t exist or has moved. Rare things wander sometimes.
      </p>
      <Link
        href="/"
        className="mt-6 bg-terra-600 px-8 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white"
      >
        Back to home
      </Link>
    </div>
  );
}
