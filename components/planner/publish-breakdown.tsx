import { PUBLISH_EXCLUSION_LABEL, type PublishExclusionReason } from "@/lib/publish-eligibility";
import { CHANGE_KIND_NOUN, type ChangeSummary } from "@/lib/planner-changes";

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
//
// docs/DECISIONS.md #29: both `eligibleSummary` and `excluded` are already scoped to actual
// planner changes (origin !== "tms") by the caller — an untouched TMS booking is neither
// eligible nor excluded here, it's simply not this dialog's concern. So `total` below is a
// count of CHANGES, not of every live booking in range, which is the whole point: it used to
// report on TMS's entire underlying schedule and call most of it "needs attention."
export function PublishBreakdown({
  eligibleSummary,
  excluded,
}: {
  eligibleSummary: ChangeSummary;
  excluded: PublishExclusion[];
}) {
  const eligibleCount = eligibleSummary.total;
  const total = eligibleCount + excluded.length;
  const kindsLine = eligibleSummary.breakdown.map((b) => `${b.count} ${CHANGE_KIND_NOUN[b.kind]}`).join(" · ");

  return (
    <div className="px-6 pb-2.5">
      <div className="rounded-[10px] bg-[#f7f9fc] px-3.5 py-2.5 text-[13px] text-[#333333]">
        {total === 0
          ? "No unpublished changes here."
          : excluded.length === 0
            ? `This will publish ${eligibleCount} change${eligibleCount > 1 ? "s" : ""} to TMS${kindsLine ? ` — ${kindsLine}` : ""}.`
            : eligibleCount === 0
              ? `None of these ${total} change${total > 1 ? "s are" : " is"} ready to publish.`
              : `${eligibleCount} of ${total} change${total > 1 ? "s" : ""} will publish${kindsLine ? ` (${kindsLine})` : ""} — ${excluded.length} ${excluded.length > 1 ? "need" : "needs"} attention first.`}
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
