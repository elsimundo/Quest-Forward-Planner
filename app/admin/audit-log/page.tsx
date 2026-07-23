import { getAuditLog } from "@/lib/db/admin-queries";
import { BOOKING_ACTIONS, type BookingAction } from "@/lib/db/schema";
import { fmtDateLong } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<BookingAction, string> = {
  create: "Created",
  update: "Updated",
  delete: "Cleared",
  move: "Moved",
  swap: "Swapped",
  overwrite: "Overwritten",
  publish: "Published",
  unpublish: "Unlocked",
};

function fmtAt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const action = BOOKING_ACTIONS.includes(sp.action as BookingAction) ? (sp.action as BookingAction) : undefined;
  const page = Math.max(0, Number(sp.page) || 0);
  const { rows, hasMore } = await getAuditLog({ q: sp.q, action, from: sp.from, to: sp.to }, page);

  const qs = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: sp.q, action: sp.action, from: sp.from, to: sp.to, page: undefined as string | undefined, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `?${params.toString()}`;
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">Audit log</h1>
      <p className="mt-1 text-[13px] text-[#757575]">
        Every booking change — who did what, when. Search by unit, site, or person.
      </p>

      <form className="mt-5 flex flex-wrap items-end gap-3" action="/admin/audit-log">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#333333]">Search</label>
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Unit, site, or person…"
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
            {BOOKING_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
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
        {(sp.q || sp.action || sp.from || sp.to) && (
          <a href="/admin/audit-log" className="text-[13px] text-[#757575] underline">
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
              <th className="px-3.5 py-2.5">Unit</th>
              <th className="px-3.5 py-2.5">Date</th>
              <th className="px-3.5 py-2.5">Site</th>
              <th className="px-3.5 py-2.5">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#f7f9fc]">
                <td className="px-3.5 py-2.5 whitespace-nowrap text-[#757575]">{fmtAt(r.at)}</td>
                <td className="px-3.5 py-2.5 font-medium text-[#333333]">{ACTION_LABEL[r.action]}</td>
                <td className="px-3.5 py-2.5 font-medium text-[#333333]">{r.unitId ?? "—"}</td>
                <td className="px-3.5 py-2.5 text-[#757575]">{r.date ? fmtDateLong(r.date) : "—"}</td>
                <td className="px-3.5 py-2.5 text-[#333333]">{r.siteName ?? "—"}</td>
                <td className="px-3.5 py-2.5 text-[#757575]" title={r.actorEmail}>
                  {r.actorName}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3.5 py-8 text-center text-[#9a9a9a]">
                  No events match these filters.
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
