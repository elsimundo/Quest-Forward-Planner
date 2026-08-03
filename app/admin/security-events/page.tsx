import { redirect } from "next/navigation";
import { getSecurityEvents } from "@/lib/db/admin-queries";
import { SECURITY_EVENT_ACTIONS, SECURITY_EVENT_STATUSES, type SecurityEventAction, type SecurityEventStatus } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";

const SUPER_ADMIN_ROLES = ["super_admin"] as const;

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<SecurityEventAction, string> = {
  login: "Login",
  logout: "Logout",
  unauthorized_access: "Unauthorized access",
};

const STATUS_LABEL: Record<SecurityEventStatus, string> = {
  success: "Success",
  failure: "Failure",
};

function fmtAt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

export default async function SecurityEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  const actor = await requireRole([...SUPER_ADMIN_ROLES]);
  if (!actor) redirect("/login");

  const sp = await searchParams;
  const action = SECURITY_EVENT_ACTIONS.includes(sp.action as SecurityEventAction) ? (sp.action as SecurityEventAction) : undefined;
  const status = SECURITY_EVENT_STATUSES.includes(sp.status as SecurityEventStatus) ? (sp.status as SecurityEventStatus) : undefined;
  const page = Math.max(0, Number(sp.page) || 0);
  const { rows, hasMore } = await getSecurityEvents({ q: sp.q, action, status, from: sp.from, to: sp.to }, page);

  const qs = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: sp.q, action: sp.action, status: sp.status, from: sp.from, to: sp.to, page: undefined as string | undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `?${params.toString()}`;
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">Security events</h1>
      <p className="mt-1 text-[13px] text-[#757575]">
        Login attempts, access denials, and other security-relevant events (ISO 27001 §A.8.2).
      </p>

      <form className="mt-5 flex flex-wrap items-end gap-3" action="/admin/security-events">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#333333]">Search</label>
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Identifier, IP, reason, user…"
            className="w-[220px] rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#333333]">Action</label>
          <select
            name="action"
            defaultValue={sp.action ?? ""}
            className="rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
          >
            <option value="">All actions</option>
            {SECURITY_EVENT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#333333]">Status</label>
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
          >
            <option value="">All statuses</option>
            {SECURITY_EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#333333]">From</label>
          <input
            type="date"
            name="from"
            defaultValue={sp.from}
            className="rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#333333]">To</label>
          <input
            type="date"
            name="to"
            defaultValue={sp.to}
            className="rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-[#1a3d69] px-4 py-2 text-[13px] font-medium text-white"
        >
          Filter
        </button>
        {(sp.q || sp.action || sp.status || sp.from || sp.to) && (
          <a href="/admin/security-events" className="text-[13px] text-[#757575] underline">
            Clear
          </a>
        )}
      </form>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#e6e6e6]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#f7f9fc] text-[11px] font-medium tracking-wider text-[#757575] uppercase">
            <tr>
              <th className="px-3.5 py-2.5">When</th>
              <th className="px-3.5 py-2.5">Action</th>
              <th className="px-3.5 py-2.5">Status</th>
              <th className="px-3.5 py-2.5">User</th>
              <th className="px-3.5 py-2.5">Identifier</th>
              <th className="px-3.5 py-2.5">Reason</th>
              <th className="px-3.5 py-2.5">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#f7f9fc]">
                <td className="px-3.5 py-2.5 whitespace-nowrap text-[#757575]">{fmtAt(r.at)}</td>
                <td className="px-3.5 py-2.5 font-medium text-[#333333]">{ACTION_LABEL[r.action]}</td>
                <td className="px-3.5 py-2.5">
                  <span className={r.status === "failure" ? "font-medium text-[#c0392b]" : "font-medium text-[#27ae60]"}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-[#333333]" title={r.userEmail ?? undefined}>
                  {r.userName ?? "—"}
                </td>
                <td className="px-3.5 py-2.5 text-[#757575]">{r.identifier ?? "—"}</td>
                <td className="px-3.5 py-2.5 text-[#757575]" title={r.details ? JSON.stringify(r.details) : undefined}>
                  {r.reason ?? "—"}
                </td>
                <td className="px-3.5 py-2.5 text-[#757575]">{r.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3.5 py-8 text-center text-[#9a9a9a]">
                  No security events match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        {page > 0 && (
          <a href={qs({ page: String(page - 1) })} className="rounded-full border border-[#e6e6e6] px-3.5 py-1.5 text-[13px]">
            ← Newer
          </a>
        )}
        {hasMore && (
          <a href={qs({ page: String(page + 1) })} className="rounded-full border border-[#e6e6e6] px-3.5 py-1.5 text-[13px]">
            Older →
          </a>
        )}
      </div>
    </div>
  );
}
