"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TmsBookingImportRunRow } from "@/lib/db/admin-queries";
import { triggerTmsBookingImport } from "@/lib/actions/admin/tms-booking-import";

function fmtWhen(d: Date | string) {
  return new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDuration(startedAt: Date | string, finishedAt: Date | string | null) {
  if (!finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

const STATUS_STYLE: Record<TmsBookingImportRunRow["status"], { bg: string; text: string; label: string }> = {
  running: { bg: "#eef2f7", text: "#4a5261", label: "Running…" },
  success: { bg: "#e9f4ec", text: "#28563a", label: "Success" },
  error: { bg: "#f9ebeb", text: "#7c2a2a", label: "Error" },
};

export function TmsBookingImportPanel({ runs }: { runs: TmsBookingImportRunRow[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleRunNow() {
    setRunning(true);
    const result = await triggerTmsBookingImport();
    setRunning(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const s = result.summary;
    const conflictNote = s.conflicts.length ? `, ${s.conflicts.length} conflict${s.conflicts.length > 1 ? "s" : ""} need review` : "";
    toast.success(`Import complete — ${s.created} created, ${s.refreshed} refreshed, ${s.removed} removed${conflictNote}`);
    router.refresh();
  }

  return (
    <div className="mt-5 max-w-[820px]">
      <button
        onClick={() => void handleRunNow()}
        disabled={running}
        className="mb-5 rounded-full border border-[#1a3d69] bg-[#1a3d69] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
      >
        {running ? "Importing…" : "Import now"}
      </button>

      {runs.length === 0 ? (
        <p className="text-[13px] text-[#9a9a9a]">No import runs yet.</p>
      ) : (
        <div className="divide-y divide-[#f0f2f5] overflow-hidden rounded-xl border border-[#e6e6e6]">
          {runs.map((r) => {
            const st = STATUS_STYLE[r.status];
            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{ background: st.bg, color: st.text }}
                  >
                    {st.label}
                  </span>
                  <span className="text-[13px] font-medium text-[#333333]">{fmtWhen(r.startedAt)}</span>
                  {fmtDuration(r.startedAt, r.finishedAt) && (
                    <span className="text-[11px] text-[#9a9a9a]">{fmtDuration(r.startedAt, r.finishedAt)}</span>
                  )}
                  <span className="text-[11px] text-[#9a9a9a]">
                    {r.triggeredByName ? `by ${r.triggeredByName}` : "automated"}
                  </span>
                </div>

                {r.status === "error" && r.error && (
                  <div className="mt-2 rounded-lg border border-[#efd3d3] bg-[#f9ebeb] p-2.5 text-xs text-[#7c2a2a]">
                    {r.error}
                  </div>
                )}

                {r.summary && (
                  <>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#333333] tabular-nums">
                      <span>
                        Created: <span className="text-[#3d7f53]">{r.summary.created}</span>
                      </span>
                      <span>
                        Refreshed: <span className="text-[#2b7bb9]">{r.summary.refreshed}</span>
                      </span>
                      <span>Unchanged: {r.summary.unchanged}</span>
                      <span>
                        Removed: <span className="text-[#b13a3a]">{r.summary.removed}</span>
                      </span>
                      {r.summary.conflicts.length > 0 && (
                        <span className="font-medium text-[#7c2a2a]">Conflicts: {r.summary.conflicts.length}</span>
                      )}
                    </div>

                    {r.summary.conflicts.length > 0 && (
                      <div className="mt-2 rounded-lg border border-[#efd3d3] bg-[#f9ebeb] p-2.5 text-xs text-[#7c2a2a]">
                        <div className="font-medium">These need a scheduler to look at the cell and re-save it:</div>
                        <ul className="mt-1 space-y-0.5">
                          {r.summary.conflicts.slice(0, 20).map((c, i) => (
                            <li key={i}>
                              {c.unitRegistration} · {c.date} · {c.siteName} — {c.reason}
                            </li>
                          ))}
                          {r.summary.conflicts.length > 20 && <li>…and {r.summary.conflicts.length - 20} more</li>}
                        </ul>
                      </div>
                    )}

                    {Object.keys(r.summary.skipped).length > 0 && (
                      <div className="mt-2 text-xs text-[#9a9a9a]">
                        Skipped:{" "}
                        {Object.entries(r.summary.skipped)
                          .map(([reason, count]) => `${count} (${reason})`)
                          .join(", ")}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
