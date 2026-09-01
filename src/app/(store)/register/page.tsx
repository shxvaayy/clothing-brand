import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AuthForm from "@/components/store/AuthForm";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Create Account", path: "/register", noindex: true });

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, sp] = await Promise.all([getSessionUser(), searchParams]);
  if (user) redirect(sp.next || "/account");
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-center font-display text-3xl text-ink-900">Join Rare Naari</h1>
      <p className="mt-1 text-center text-sm text-ink-400">Create an account to track orders and save favourites</p>
      <AuthForm mode="register" next={sp.next} />
    </div>
  );
}
