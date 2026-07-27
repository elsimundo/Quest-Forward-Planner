"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TmsSyncRunRow } from "@/lib/db/admin-queries";
import { triggerTmsSync } from "@/lib/actions/admin/tms-sync";

function fmtWhen(d: Date | string) {
  return new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDuration(startedAt: Date | string, finishedAt: Date | string | null) {
  if (!finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

const STATUS_STYLE: Record<TmsSyncRunRow["status"], { bg: string; text: string; label: string }> = {
  running: { bg: "#eef2f7", text: "#4a5261", label: "Running…" },
  success: { bg: "#e9f4ec", text: "#28563a", label: "Success" },
  error: { bg: "#f9ebeb", text: "#7c2a2a", label: "Error" },
};

// "+3 / ~2 / -1"-style diff readout for one entity's counts.
function DiffCounts({ added, updated, removed = 0 }: { added: number; updated?: number; removed?: number }) {
  if (added === 0 && (updated ?? 0) === 0 && removed === 0) {
    return <span className="text-[#9a9a9a]">no change</span>;
  }
  return (
    <span className="tabular-nums">
      {added > 0 && <span className="text-[#3d7f53]">+{added}</span>}
      {added > 0 && (updated || removed) ? " " : ""}
      {updated !== undefined && updated > 0 && <span className="text-[#2b7bb9]">~{updated}</span>}
      {updated !== undefined && updated > 0 && removed > 0 ? " " : ""}
      {removed > 0 && <span className="text-[#b13a3a]">-{removed}</span>}
    </span>
  );
}

export function TmsSyncPanel({ runs }: { runs: TmsSyncRunRow[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleRunNow() {
    setRunning(true);
    const result = await triggerTmsSync();
    setRunning(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const s = result.summary;
    toast.success(
      `Sync complete — sites +${s.sites.added}/~${s.sites.updated}/-${s.sites.removed}, ` +
        `units +${s.units.added}/~${s.units.updated}/-${s.units.removed}`,
    );
    router.refresh();
  }

  return (
    <div className="mt-5 max-w-[820px]">
      <button
        onClick={() => void handleRunNow()}
        disabled={running}
        className="mb-5 rounded-full border border-[#1a3d69] bg-[#1a3d69] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
      >
        {running ? "Syncing…" : "Sync now"}
      </button>

      {runs.length === 0 ? (
        <p className="text-[13px] text-[#9a9a9a]">No sync runs yet.</p>
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
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#333333]">
                    <span>
                      Companies: <DiffCounts {...r.summary.companies} />
                    </span>
                    <span>
                      Sites: <DiffCounts {...r.summary.sites} />
                    </span>
                    <span>
                      Units: <DiffCounts {...r.summary.units} />
                    </span>
                    <span>
                      Unit↔modality tags: <DiffCounts added={r.summary.unitModalities.added} />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
