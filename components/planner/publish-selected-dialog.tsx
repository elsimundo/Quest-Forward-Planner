"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PublishBreakdown, type PublishExclusion } from "./publish-breakdown";
import type { ChangeSummary } from "@/lib/planner-changes";

// Stage D1 companion to PublishRangeDialog, for the "Publish selected" path. Only ever
// opened when the current selection has at least one exclusion — if every selected booking
// is eligible there's nothing to explain, so planner-grid.tsx publishes immediately instead
// (preserving the low-friction case; this dialog exists for the surprising one).
export function PublishSelectedDialog({
  open,
  eligibleSummary,
  excluded,
  onConfirm,
  onClose,
}: {
  open: boolean;
  eligibleSummary: ChangeSummary;
  excluded: PublishExclusion[];
  onConfirm: () => void;
  onClose: () => void;
}) {
  const eligibleCount = eligibleSummary.total;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[440px] gap-0 p-0">
        <div className="border-b px-6 pt-4.5 pb-3.5">
          <div className="text-[11px] font-medium tracking-wider text-[#1a3d69] uppercase">Publish to TMS</div>
          <div className="mt-1 text-lg font-bold text-[#333333]">Publish the selected bookings</div>
          <p className="mt-1 text-[13px] font-light text-[#757575]">
            Not every selected booking is ready. This can be undone (Ctrl/Cmd + Z).
          </p>
        </div>

        <div className="pt-4.5">
          <PublishBreakdown eligibleSummary={eligibleSummary} excluded={excluded} />
        </div>

        <div className="flex gap-2.5 px-6 pt-3.5 pb-5">
          <Button className="flex-1" disabled={eligibleCount === 0} onClick={onConfirm}>
            🔒 Publish {eligibleCount}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel and fix
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
