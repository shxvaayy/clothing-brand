import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AuthForm from "@/components/store/AuthForm";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Login", path: "/login", noindex: true });

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, sp] = await Promise.all([getSessionUser(), searchParams]);
  if (user) redirect(sp.next || "/account");
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-center font-display text-3xl text-ink-900">Welcome back</h1>
      <p className="mt-1 text-center text-sm text-ink-400">Log in to your Rare Naari account</p>
      <AuthForm mode="login" next={sp.next} />
    </div>
  );
}
