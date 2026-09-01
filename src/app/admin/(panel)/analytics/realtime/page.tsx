import RealtimeFeed from "@/components/admin/RealtimeFeed";

export const metadata = { title: "Realtime · Admin" };

export default function RealtimePage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl">Realtime activity</h1>
      <p className="mb-5 text-sm text-ink-400">Live storefront events — refreshes every 10 seconds.</p>
      <RealtimeFeed />
    </div>
  );
}
