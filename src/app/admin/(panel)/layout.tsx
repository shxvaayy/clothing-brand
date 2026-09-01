import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <AdminShell adminName={admin.name} adminRole={admin.role}>
      {children}
    </AdminShell>
  );
}
