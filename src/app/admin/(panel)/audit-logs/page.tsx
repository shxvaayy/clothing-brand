import { db } from "@/lib/db";

export const metadata = { title: "Audit Logs · Admin" };

export default async function AuditLogsPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl">Audit logs</h1>
      <div className="overflow-x-auto border border-cream-300 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Change</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-cream-200 last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-600">
                  {log.createdAt.toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2.5 text-xs">{log.actor}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-cream-200 px-2 py-0.5 text-[11px] font-semibold uppercase">
                    {log.action.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-600">
                  {log.entity}
                  {log.entityId && <span className="text-ink-300"> · {log.entityId.slice(0, 10)}…</span>}
                </td>
                <td className="max-w-xs px-4 py-2.5 text-xs text-ink-400">
                  {log.before != null && <div className="truncate">from: {JSON.stringify(log.before)}</div>}
                  {log.after != null && <div className="truncate">to: {JSON.stringify(log.after)}</div>}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
