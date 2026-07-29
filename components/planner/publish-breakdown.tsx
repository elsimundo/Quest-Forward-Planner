import { PUBLISH_EXCLUSION_LABEL, type PublishExclusionReason } from "@/lib/publish-eligibility";

export type PublishExclusion = {
  key: string;
  label: string; // "CT23 · 3 Mar"
  siteName: string;
  reason: PublishExclusionReason;
};

// Stage D1 (docs/OVERLAY_BUILD_PLAN.md) — the pre-flight breakdown shared by the range and
// selection publish dialogs. Replaces the old single "N bookings will publish" line: the
// client asked for the exceptions to be named up front, not discovered after the fact
// (docs/DECISIONS.md #24's silent skip is exactly what this closes).
export function PublishBreakdown({ eligibleCount, excluded }: { eligibleCount: number; excluded: PublishExclusion[] }) {
  const total = eligibleCount + excluded.length;

  return (
    <div className="px-6 pb-2.5">
      <div className="rounded-[10px] bg-[#f7f9fc] px-3.5 py-2.5 text-[13px] text-[#333333]">
        {total === 0
          ? "No unpublished bookings here."
          : excluded.length === 0
            ? `This will publish ${eligibleCount} booking${eligibleCount > 1 ? "s" : ""} to TMS.`
            : eligibleCount === 0
              ? `None of these ${total} booking${total > 1 ? "s are" : " is"} ready to publish.`
              : `${eligibleCount} of ${total} will publish — ${excluded.length} ${excluded.length > 1 ? "need" : "needs"} attention first.`}
      </div>

      {excluded.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-[10px] border border-[#f6ddc8]">
          {excluded.map((e) => (
            <div
              key={e.key}
              className="flex items-center justify-between gap-2 border-b border-[#f6ddc8] bg-[#fdf1e7] px-3 py-1.5 text-xs last:border-b-0"
            >
              <span className="text-[#9a4d1e]">
                <span className="font-medium">{e.label}</span>
                <span className="text-[#c08a5e]"> · {e.siteName}</span>
              </span>
              <span className="shrink-0 text-right text-[#9a4d1e]">{PUBLISH_EXCLUSION_LABEL[e.reason]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
