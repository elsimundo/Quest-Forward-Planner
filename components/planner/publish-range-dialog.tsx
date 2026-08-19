"use client";

import { useState } from "react";
import { LockIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { fmtDate, type DayInfo } from "@/lib/dates";
import { PublishBreakdown, type PublishEligibleItem, type PublishExclusion } from "./publish-breakdown";
import type { PublishTarget } from "@/lib/actions/publish";
import type { ChangeSummary } from "@/lib/planner-changes";

const EMPTY_SUMMARY: ChangeSummary = { total: 0, breakdown: [] };

export function PublishRangeDialog({
  open,
  days,
  defaultFrom,
  defaultTo,
  preflight,
  onConfirm,
  onClose,
  onJumpToCell,
}: {
  open: boolean;
  days: DayInfo[];
  defaultFrom: string;
  defaultTo: string;
  // Classifies every unpublished PLANNER CHANGE in [from, to] — computed by the grid, which
  // holds the booking data (Stage D1: docs/OVERLAY_BUILD_PLAN.md). An untouched TMS booking
  // is neither eligible nor excluded; it's already scoped out before this is called
  // (docs/DECISIONS.md #29). Kept as a callback so the preview updates as the range changes,
  // and — since it's called live in render, not snapshotted — as the underlying bookings
  // change too, without threading all bookings into this component.
  preflight: (from: string, to: string) => { eligible: PublishTarget[]; eligibleSummary: ChangeSummary; eligibleItems: PublishEligibleItem[]; excluded: PublishExclusion[] };
  onConfirm: (from: string, to: string) => void;
  onClose: () => void;
  onJumpToCell: (target: { unitId: number; date: string }) => void;
}) {
  return (
    // Right-side, not bottom (docs/DECISIONS.md #49 amended) — same width/side convention as
    // booking-drawer.tsx. A bottom sheet eats vertical (date-ROW) space, which is exactly the
    // wrong axis for a feature about reviewing a date RANGE: goToCell's row centering
    // (planner-grid.tsx) has no idea the sheet is covering the bottom of the viewport, so a
    // centered row landed behind it almost every time. A right panel only costs unit-COLUMN
    // width, so vertical centering stays accurate.
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} modal={false}>
      <SheetContent
        showCloseButton
        onInteractOutside={(e) => e.preventDefault()}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]"
      >
        {open && (
          <PublishRangeBody
            key={`${defaultFrom}|${defaultTo}`}
            days={days}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
            preflight={preflight}
            onConfirm={onConfirm}
            onClose={onClose}
            onJumpToCell={onJumpToCell}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PublishRangeBody({
  days,
  defaultFrom,
  defaultTo,
  preflight,
  onConfirm,
  onClose,
  onJumpToCell,
}: {
  days: DayInfo[];
  defaultFrom: string;
  defaultTo: string;
  preflight: (from: string, to: string) => { eligible: PublishTarget[]; eligibleSummary: ChangeSummary; eligibleItems: PublishEligibleItem[]; excluded: PublishExclusion[] };
  onConfirm: (from: string, to: string) => void;
  onClose: () => void;
  onJumpToCell: (target: { unitId: number; date: string }) => void;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const invalidRange = from > to;
  const { eligible, eligibleSummary, eligibleItems, excluded } = invalidRange
    ? { eligible: [], eligibleSummary: EMPTY_SUMMARY, eligibleItems: [], excluded: [] }
    : preflight(from, to);
  const disabled = invalidRange || eligible.length === 0;

  const selectClass =
    "w-full rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] text-[#333333] outline-none focus:border-[#2b7bb9]";

  return (
    <>
      <div className="border-b px-6 pt-4.5 pb-3.5">
        <div className="text-[11px] font-medium tracking-wider text-[#1a3d69] uppercase">
          Publish to TMS
        </div>
        <div className="mt-1 text-lg font-bold text-[#333333]">
          Lock a date range for forwarding
        </div>
        <p className="mt-1 text-[13px] font-light text-[#757575]">
          Every booking in this range gets locked and marked ready for TMS. Already-published
          bookings are left as they are. This can be undone (Ctrl/Cmd + Z).
        </p>
      </div>

      {/* Scrollable middle section, header and footer pinned — same shape as booking-drawer's
          body, and needed here since a long breakdown list plus a short viewport could
          otherwise push the buttons off-screen in a full-height side panel. */}
      <div className="flex-1 overflow-y-auto px-6 py-4.5">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[#333333]">From</label>
            <select className={selectClass} value={from} onChange={(e) => setFrom(e.target.value)}>
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  {fmtDate(d.date)} ({d.dow})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-[#333333]">To</label>
            <select className={selectClass} value={to} onChange={(e) => setTo(e.target.value)}>
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  {fmtDate(d.date)} ({d.dow})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          {invalidRange ? (
            <div className="rounded-[10px] bg-[#f7f9fc] px-3.5 py-2.5 text-[13px] text-[#333333]">
              Pick a &apos;From&apos; date on or before &apos;To&apos;.
            </div>
          ) : (
            <PublishBreakdown
              eligibleSummary={eligibleSummary}
              eligibleItems={eligibleItems}
              excluded={excluded}
              onJump={onJumpToCell}
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2.5 border-t px-6 pt-3.5 pb-5">
        <Button variant="outline" onClick={onClose}>
          {excluded.length > 0 ? "Cancel and fix" : "Cancel"}
        </Button>
        <Button disabled={disabled} onClick={() => onConfirm(from, to)}>
          <LockIcon aria-hidden />
          {excluded.length > 0 ? `Publish ${eligible.length}` : "Publish range"}
        </Button>
      </div>
    </>
  );
}
