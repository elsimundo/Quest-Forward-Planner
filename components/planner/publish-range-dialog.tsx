"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtDate, type DayInfo } from "@/lib/dates";
import { PublishBreakdown, type PublishExclusion } from "./publish-breakdown";
import type { PublishTarget } from "@/lib/actions/publish";

export function PublishRangeDialog({
  open,
  days,
  defaultFrom,
  defaultTo,
  preflight,
  onConfirm,
  onClose,
}: {
  open: boolean;
  days: DayInfo[];
  defaultFrom: string;
  defaultTo: string;
  // Classifies every live, unpublished booking in [from, to] — computed by the grid, which
  // holds the booking data (Stage D1: docs/OVERLAY_BUILD_PLAN.md). Kept as a callback so the
  // preview updates as the range changes without threading all bookings into this component.
  preflight: (from: string, to: string) => { eligible: PublishTarget[]; excluded: PublishExclusion[] };
  onConfirm: (from: string, to: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[440px] gap-0 p-0">
        {open && (
          <PublishRangeBody
            key={`${defaultFrom}|${defaultTo}`}
            days={days}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
            preflight={preflight}
            onConfirm={onConfirm}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PublishRangeBody({
  days,
  defaultFrom,
  defaultTo,
  preflight,
  onConfirm,
  onClose,
}: {
  days: DayInfo[];
  defaultFrom: string;
  defaultTo: string;
  preflight: (from: string, to: string) => { eligible: PublishTarget[]; excluded: PublishExclusion[] };
  onConfirm: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const invalidRange = from > to;
  const { eligible, excluded } = invalidRange ? { eligible: [], excluded: [] } : preflight(from, to);
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

      <div className="flex gap-3 px-6 py-4.5">
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

      {invalidRange ? (
        <div className="px-6 pb-2.5">
          <div className="rounded-[10px] bg-[#f7f9fc] px-3.5 py-2.5 text-[13px] text-[#333333]">
            Pick a &apos;From&apos; date on or before &apos;To&apos;.
          </div>
        </div>
      ) : (
        <PublishBreakdown eligibleCount={eligible.length} excluded={excluded} />
      )}

      <div className="flex gap-2.5 px-6 pt-3.5 pb-5">
        <Button className="flex-1" disabled={disabled} onClick={() => onConfirm(from, to)}>
          {excluded.length > 0 ? `🔒 Publish ${eligible.length}` : "🔒 Publish range"}
        </Button>
        <Button variant="outline" onClick={onClose}>
          {excluded.length > 0 ? "Cancel and fix" : "Cancel"}
        </Button>
      </div>
    </>
  );
}
