import { ArrowLeftRightIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStatusCatalog } from "./status-context";
import { fmtDate } from "@/lib/dates";

// unitLabel is a display string (the unit's registration, e.g. "CT17") — this type is
// purely informational for the dialog, never sent back to the server (the actual move
// uses MoveSpec, built separately with numeric unit ids).
export type Clash = { unitLabel: string; date: string; siteName: string; status: string };

export function ClashDialog({
  clashes,
  onResolve,
}: {
  clashes: Clash[] | null;
  onResolve: (choice: "swap" | "overwrite" | "cancel") => void;
}) {
  const catalog = useStatusCatalog();
  const open = !!clashes && clashes.length > 0;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onResolve("cancel")}>
      <DialogContent showCloseButton={false} className="max-w-[480px] gap-0 p-0">
        <div className="border-b px-6 pt-4.5 pb-3.5">
          <div className="text-[11px] font-medium tracking-wider text-[#b13a3a] uppercase">
            Booking clash
          </div>
          <div className="mt-1 text-lg font-bold text-[#333333]">
            {clashes?.length === 1
              ? "The target slot already has a booking"
              : `${clashes?.length} of the target slots already have bookings`}
          </div>
          <p className="mt-1 text-[13px] font-light text-[#757575]">
            Choose what happens to the existing booking{(clashes?.length ?? 0) > 1 ? "s" : ""}.
            Either choice can be undone (Ctrl/Cmd + Z).
          </p>
        </div>

        <div className="max-h-[180px] overflow-y-auto px-6 py-3">
          {clashes?.slice(0, 5).map((cl) => {
            const st = catalog.get(cl.status);
            return (
              <div
                key={`${cl.date}|${cl.unitLabel}`}
                className="flex items-center gap-2.5 border-b border-[#f7f9fc] py-1.5"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: st.bar }} />
                <span className="min-w-[52px] text-[13px] font-bold text-[#333333]">{cl.unitLabel}</span>
                <span className="min-w-[58px] text-[13px] text-[#757575]">{fmtDate(cl.date)}</span>
                <span className="flex-1 truncate text-[13px] text-[#333333]">{cl.siteName}</span>
              </div>
            );
          })}
          {(clashes?.length ?? 0) > 5 && (
            <div className="py-2 text-xs text-[#9a9a9a]">…and {clashes!.length - 5} more</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 px-6 pt-3.5 pb-5">
          <Button className="min-w-[140px] flex-1" onClick={() => onResolve("swap")}>
            <ArrowLeftRightIcon aria-hidden /> Swap bookings
          </Button>
          <Button
            variant="destructive"
            className="min-w-[120px] flex-1"
            title="Replaces the existing bookings — they will be removed"
            onClick={() => onResolve("overwrite")}
          >
            Overwrite
          </Button>
          <Button variant="outline" className="min-w-[90px]" onClick={() => onResolve("cancel")}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
