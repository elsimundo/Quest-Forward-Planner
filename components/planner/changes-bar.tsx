import { CHANGE_KIND_NOUN, type ChangeSummary } from "@/lib/planner-changes";

// Shown while the changes view is on — the client's "see at a glance what we are planning to
// lock in as changes and how it affects the schedule" (docs/DECISIONS.md #29).
//
// It deliberately does NOT report publish eligibility ("9 of 12 will publish"). The pre-flight
// dialog already answers that properly, against the same logic the server gate uses, and a
// second count here would either duplicate it or — because a *cleared* booking has no live row
// for the publish sweep to find — quietly disagree with it. This bar answers "what have I
// changed"; the button next to it opens the dialog that answers "what will actually go".
export function ChangesBar({
  summary,
  myTotal,
  canPublish,
  canDiscardMine,
  canDiscardEveryone,
  onReviewPublish,
  onDiscardMine,
  onDiscardEveryone,
  onExit,
}: {
  summary: ChangeSummary;
  /** How many of `summary.total` are currently owned by the acting user — drives "Discard my changes". */
  myTotal: number;
  canPublish: boolean;
  canDiscardMine: boolean;
  canDiscardEveryone: boolean;
  onReviewPublish: () => void;
  onDiscardMine: () => void;
  onDiscardEveryone: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3.5 gap-y-1 border-b border-[#cdd9e8] bg-[#eef3f9] px-6 py-2.5 text-[13px] text-[#1a3d69]">
      {summary.total === 0 ? (
        <span className="font-bold">Nothing changed here yet — TMS has this date range exactly as shown.</span>
      ) : (
        <>
          <span className="font-bold">
            {summary.total} unpublished change{summary.total > 1 ? "s" : ""} in this date range
          </span>
          <span className="text-[#41608a]">
            {summary.breakdown.map((b) => `${b.count} ${CHANGE_KIND_NOUN[b.kind]}`).join(" · ")}
          </span>
        </>
      )}
      <span className="font-light text-[#5c7a9e]">
        Everything TMS already has is faded back, in place, so you can see how these changes
        sit against the rest of the schedule.
      </span>
      <span className="flex-1" />
      {canDiscardMine && myTotal > 0 && (
        <button
          onClick={onDiscardMine}
          className="rounded-full border border-[#b9c8dc] px-3.5 py-1.5 text-xs text-[#1a3d69] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          Discard my changes ({myTotal})
        </button>
      )}
      {canDiscardEveryone && summary.total > 0 && (
        <button
          onClick={onDiscardEveryone}
          className="rounded-full border border-[#b9c8dc] px-3.5 py-1.5 text-xs text-[#1a3d69] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          Discard everyone&apos;s changes ({summary.total})
        </button>
      )}
      {canPublish && summary.total > 0 && (
        <button
          onClick={onReviewPublish}
          className="rounded-full border border-[#1a3d69] bg-[#1a3d69] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          🔒 Review &amp; publish…
        </button>
      )}
      <button
        onClick={onExit}
        className="rounded-full border border-[#b9c8dc] px-3.5 py-1.5 text-xs text-[#1a3d69] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
      >
        Show everything
      </button>
    </div>
  );
}
