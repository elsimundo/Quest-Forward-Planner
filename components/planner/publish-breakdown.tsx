import { ArrowRightIcon } from "lucide-react";
import { PUBLISH_EXCLUSION_LABEL, type PublishExclusionReason } from "@/lib/publish-eligibility";
import { CHANGE_KIND_NOUN, type ChangeSummary } from "@/lib/planner-changes";

export type PublishExclusion = {
  key: string;
  unitId: number;
  date: string;
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
  onJump,
}: {
  eligibleSummary: ChangeSummary;
  excluded: PublishExclusion[];
  // Scrolls the grid to and highlights the flagged cell (planner-grid.tsx's goToCell), leaving
  // this sheet open — resolution happens via the existing right-click context menu, not here.
  onJump: (target: { unitId: number; date: string }) => void;
}) {
  const eligibleCount = eligibleSummary.total;
  const total = eligibleCount + excluded.length;
  const kindsLine = eligibleSummary.breakdown.map((b) => `${b.count} ${CHANGE_KIND_NOUN[b.kind]}`).join(" · ");

  return (
    <div>
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
        // No max-height/scroll of its own — the panel body around this (PublishRangeDialog /
        // PublishSelectedDialog) is already the single scroll region (flex-1 overflow-y-auto).
        // A second, nested scrollbox here meant a short list got capped into a cramped little
        // scroll area even when the panel had plenty of unused height to just show it all.
        <div className="mt-2 rounded-[10px] border border-[#f6ddc8]">
          {excluded.map((e) => (
            // The row itself is clickable too — not just the ↷ button. It's a plain `<div>`
            // with an `onClick`, not a `<button>`, so nesting the ↷ button inside stays valid
            // HTML (a click on the ↷ bubbles up and fires the same handler again, which is
            // harmless since onJump only navigates). The ↷ button is what stays keyboard-
            // reachable and screen-reader-announced; the row's own onClick is a bigger, more
            // forgiving mouse target on top of that, and matches GhostChip's "whole thing is
            // clickable" hover feel (cell-chip.tsx) — the row still isn't a `<button>`, so a
            // future inline action added alongside the ↷ can call `e.stopPropagation()` rather
            // than needing this restructured again.
            <div
              key={e.key}
              onClick={() => onJump({ unitId: e.unitId, date: e.date })}
              className="flex cursor-pointer items-center gap-2 border-b border-[#f6ddc8] bg-[#fdf1e7] px-3 py-1.5 text-xs transition-colors last:border-b-0 hover:bg-[#f9e6d2]"
            >
              {/* Always stacked, not just below `sm` — this now only ever renders inside a
                  ~420px-wide side panel (PublishRangeDialog/PublishSelectedDialog), and `sm:`
                  is a viewport-width media query, not a panel-width one. A row wide enough to
                  sit label-and-reason side by side on a normal desktop viewport would still be
                  cramped inside a 420px panel regardless of how wide the browser window is. */}
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[#9a4d1e]">
                  <span className="font-medium">{e.label}</span>
                  <span className="text-[#c08a5e]"> · {e.siteName}</span>
                </span>
                <span className="text-[#9a4d1e]">{PUBLISH_EXCLUSION_LABEL[e.reason]}</span>
              </div>
              <button
                type="button"
                onClick={() => onJump({ unitId: e.unitId, date: e.date })}
                title={`Jump to ${e.label}`}
                aria-label={`Jump to ${e.label}`}
                className="shrink-0 cursor-pointer px-1 text-[#9a4d1e] opacity-55 transition-opacity duration-150 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c08a5e]"
              >
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
