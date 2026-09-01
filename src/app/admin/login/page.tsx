import { redirect } from "next/navigation";
import Image from "next/image";
import { getSessionAdmin } from "@/lib/auth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata = { title: "Admin Login · Rare Naari", robots: { index: false } };

export default async function AdminLoginPage() {
  const admin = await getSessionAdmin();
  if (admin) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm border border-ink-600/40 bg-ink-800 p-8">
        <div className="text-center">
          <Image src="/brand/logo.png" alt="Rare Naari" width={56} height={56} className="mx-auto rounded-full" />
          <h1 className="mt-4 font-display text-xl tracking-[0.2em] text-cream-100 uppercase">Rare Naari</h1>
          <p className="mt-1 text-xs tracking-widest text-ink-300 uppercase">Admin Console</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
