"use client";

import { LockIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PublishBreakdown, type PublishEligibleItem, type PublishExclusion } from "./publish-breakdown";
import type { PublishTarget } from "@/lib/actions/publish";
import type { ChangeSummary } from "@/lib/planner-changes";

// Stage D1 companion to PublishRangeDialog, for the "Publish selected" path. Only ever
// opened when the current selection has at least one exclusion — if every selected booking
// is eligible there's nothing to explain, so planner-grid.tsx publishes immediately instead
// (preserving the low-friction case; this dialog exists for the surprising one).
export function PublishSelectedDialog({
  open,
  preflight,
  onConfirm,
  onClose,
  onJumpToCell,
}: {
  open: boolean;
  // Called live in render, same as PublishRangeDialog's preflight — the set of bookings this
  // sheet is about is fixed when it opens (planner-grid.tsx freezes the selected keys), but
  // each one's eligibility/reason is re-derived every render so a fix made while this sheet
  // stays open (e.g. via the grid's right-click menu) shows up without closing/reopening.
  preflight: () => { eligible: PublishTarget[]; eligibleSummary: ChangeSummary; eligibleItems: PublishEligibleItem[]; excluded: PublishExclusion[] };
  onConfirm: () => void;
  onClose: () => void;
  onJumpToCell: (target: { unitId: number; date: string }) => void;
}) {
  const { eligibleSummary, eligibleItems, excluded } = open
    ? preflight()
    : { eligibleSummary: { total: 0, breakdown: [] } as ChangeSummary, eligibleItems: [] as PublishEligibleItem[], excluded: [] as PublishExclusion[] };
  const eligibleCount = eligibleSummary.total;
  return (
    // Right-side, matching PublishRangeDialog's amended convention (docs/DECISIONS.md #49) —
    // a bottom sheet obscured the date-row a "needs attention" click jumped to; a right panel
    // only costs unit-column width, so goToCell's row centering stays accurate.
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} modal={false}>
      <SheetContent
        showCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]"
      >
        <div className="border-b px-6 pt-4.5 pb-3.5">
          <div className="text-[11px] font-medium tracking-wider text-[#1a3d69] uppercase">Publish to TMS</div>
          <div className="mt-1 text-lg font-bold text-[#333333]">Publish the selected bookings</div>
          <p className="mt-1 text-[13px] font-light text-[#757575]">
            Not every selected booking is ready. This can be undone (Ctrl/Cmd + Z).
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4.5">
          <PublishBreakdown
            eligibleSummary={eligibleSummary}
            eligibleItems={eligibleItems}
            excluded={excluded}
            onJump={onJumpToCell}
          />
        </div>

        <div className="flex justify-end gap-2.5 border-t px-6 pt-3.5 pb-5">
          <Button variant="outline" onClick={onClose}>
            Cancel and fix
          </Button>
          <Button disabled={eligibleCount === 0} onClick={onConfirm}>
            <LockIcon aria-hidden /> Publish {eligibleCount}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
