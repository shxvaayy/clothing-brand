"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="shrink-0 rounded-full border border-cream-300 bg-white px-4 py-2 text-[13px] font-medium text-red-600 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0"
    >
      Log out
    </button>
  );
}
