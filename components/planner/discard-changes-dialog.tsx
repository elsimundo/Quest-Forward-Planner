"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CHANGE_KIND_NOUN, type ChangeSummary } from "@/lib/planner-changes";

/**
 * Confirms a bulk "discard unpublished changes" before it fires — this is the safety net
 * for the feature (docs/DECISIONS.md): the resulting reverts aren't wired into the
 * one-click Ctrl/Cmd+Z stack, so getting the scope right up front is what stands in for
 * that.
 */
export function DiscardChangesDialog({
  open,
  mode,
  summary,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  mode: "mine" | "everyone";
  summary: ChangeSummary;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const kindsLine = summary.breakdown.map((b) => `${b.count} ${CHANGE_KIND_NOUN[b.kind]}`).join(" · ");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[440px] gap-0 p-0">
        <div className="border-b px-6 pt-4.5 pb-3.5">
          <div className="text-[11px] font-medium tracking-wider text-[#1a3d69] uppercase">Discard changes</div>
          <div className="mt-1 text-lg font-bold text-[#333333]">
            Discard {mode === "everyone" ? "everyone's" : "your"} unpublished changes?
          </div>
          <p className="mt-1 text-[13px] font-light text-[#757575]">
            {mode === "everyone"
              ? "Every unpublished change in this date range, by anyone, is reverted to what TMS currently shows."
              : "Every unpublished change you currently own in this date range is reverted to what TMS currently shows."}{" "}
            Already-published bookings are left as they are.
          </p>
        </div>

        <div className="px-6 pb-2.5">
          <div className="rounded-[10px] bg-[#f7f9fc] px-3.5 py-2.5 text-[13px] text-[#333333]">
            {summary.total === 0
              ? "Nothing to discard."
              : `This will discard ${summary.total} change${summary.total > 1 ? "s" : ""}${kindsLine ? ` — ${kindsLine}` : ""}.`}
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pt-3.5 pb-5">
          <Button
            className="flex-1"
            variant="destructive"
            disabled={summary.total === 0 || pending}
            onClick={onConfirm}
          >
            {pending ? "Discarding…" : `Discard ${summary.total} change${summary.total === 1 ? "" : "s"}`}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
