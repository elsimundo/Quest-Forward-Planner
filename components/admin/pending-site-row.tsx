"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approvePendingSite, rejectPendingSite, searchMergeTargets } from "@/lib/actions/admin/sites";

export function PendingSiteRow({ site }: { site: { id: number; name: string; kind: string | null; bookingCount: number } }) {
  const [mergeQuery, setMergeQuery] = useState("");
  const [matches, setMatches] = useState<{ id: number; name: string }[]>([]);
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onMergeQueryChange(v: string) {
    setMergeQuery(v);
    setSelected(null);
    if (v.trim().length < 2) {
      setMatches([]);
      return;
    }
    setMatches(await searchMergeTargets(v, site.id));
  }

  async function handleApprove() {
    setPending(true);
    const result = await approvePendingSite({ siteId: site.id, mergeIntoSiteId: selected?.id });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(selected ? `Merged "${site.name}" into "${selected.name}"` : `Approved "${site.name}"`);
    router.refresh();
  }

  async function handleReject() {
    setPending(true);
    const result = await rejectPendingSite({ siteId: site.id });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Rejected "${site.name}"`);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[#e6e6e6] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-bold text-[#333333]">{site.name}</div>
          <div className="mt-0.5 text-xs text-[#757575]">
            {site.kind ?? "No kind set"} · {site.bookingCount} booking{site.bookingCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <div className="relative flex-1">
          <input
            value={mergeQuery}
            onChange={(e) => void onMergeQueryChange(e.target.value)}
            placeholder="Merge into an existing site (optional)…"
            disabled={pending}
            className="w-full rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
          />
          {matches.length > 0 && !selected && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-md">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelected(m);
                    setMergeQuery(m.name);
                    setMatches([]);
                  }}
                  className="block w-full border-b px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-[#f7f9fc] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleApprove}
          disabled={pending}
          className="rounded-full bg-[#1a3d69] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          {selected ? "Merge & approve" : "Approve"}
        </button>
        <button
          onClick={handleReject}
          disabled={pending}
          className="rounded-full border border-[#b13a3a] px-4 py-2 text-[13px] font-medium text-[#b13a3a] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b13a3a]"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
