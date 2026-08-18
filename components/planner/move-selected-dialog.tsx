"use client";

import type * as React from "react";
import { useMemo, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/dates";

type Unit = { id: number; registration: string; description: string | null; displayOrder: number };

export type MoveRow = {
  key: string;
  date: string;
  unitId: number;
  unitLabel: string;
  siteName: string;
};

/**
 * Redistribute a multi-select, one booking at a time, from a single dialog
 * (docs/DECISIONS.md #35). Each row keeps its own date and picks its own destination unit —
 * the drag's uniform "same offset for the whole block" doesn't fit a block coming off a
 * downed unit, which usually has to be scattered across whatever gaps exist.
 */
export function MoveSelectedDialog({
  open,
  rows,
  units,
  isOccupied,
  onConfirm,
  onClose,
}: {
  open: boolean;
  rows: MoveRow[];
  units: Unit[];
  /** Is some other booking already sitting at this unit/date? Drives the "occupied" hints. */
  isOccupied: (date: string, unitId: number) => boolean;
  onConfirm: (assignments: { fromDate: string; fromUnitId: number; toUnitId: number }[]) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* sm:max-w-, not max-w-: the DialogContent base sets `sm:max-w-sm`, and tailwind-merge
          won't let an unprefixed max-w- override a prefixed one — so a plain max-w-[620px]
          silently loses to 384px on every screen above the sm breakpoint. */}
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[620px]">
        {open && (
          <MoveSelectedBody
            key={rows.map((r) => r.key).join(",")}
            rows={rows}
            units={units}
            isOccupied={isOccupied}
            onConfirm={onConfirm}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const KEEP = "keep";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-[#e6e6e6] bg-white pr-7 pl-2.5 text-[13px] text-[#333333] outline-none hover:border-[#cfd6e0] focus:border-[#2b7bb9]";

/**
 * Native selects draw an OS arrow that's a different size and colour in every browser, which
 * reads as three mismatched controls once a few rows are stacked. `appearance-none` plus our
 * own chevron keeps the column looking like one control repeated.
 */
function UnitSelect({
  className = "",
  ...props
}: React.ComponentProps<"select"> & { className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      <select {...props} className={selectClass} />
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-[#757575]"
      >
        <path
          d="M2.5 4.5L6 8l3.5-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function MoveSelectedBody({
  rows,
  units,
  isOccupied,
  onConfirm,
  onClose,
}: {
  rows: MoveRow[];
  units: Unit[];
  isOccupied: (date: string, unitId: number) => boolean;
  onConfirm: (assignments: { fromDate: string; fromUnitId: number; toUnitId: number }[]) => void;
  onClose: () => void;
}) {
  // Everything starts on "keep" — this dialog never moves anything the scheduler didn't
  // explicitly retarget, so opening it by accident and confirming is a no-op.
  const [dest, setDest] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.key, KEEP])),
  );

  const assignments = rows
    .filter((r) => dest[r.key] !== KEEP)
    .map((r) => ({ fromDate: r.date, fromUnitId: r.unitId, toUnitId: Number(dest[r.key]) }));

  // Two rows sent to the same unit on the same date would collide with each other — caught
  // here rather than at the clash dialog, because that one explains a conflict with an
  // *existing* booking and has no sensible swap/overwrite answer for this.
  const selfClashKeys = useMemo(() => {
    const byTarget = new Map<string, string[]>();
    for (const r of rows) {
      if (dest[r.key] === KEEP) continue;
      const k = `${r.date}|${dest[r.key]}`;
      byTarget.set(k, [...(byTarget.get(k) ?? []), r.key]);
    }
    const clashing = new Set<string>();
    for (const keys of byTarget.values()) if (keys.length > 1) keys.forEach((k) => clashing.add(k));
    return clashing;
  }, [rows, dest]);

  // A slot only counts as occupied if what's in it is staying put. Mirrors the rule
  // `attemptExplicitMoves` applies server-side, so the hints here match what actually happens:
  // shuffling two bookings between units is not a clash if both are moving in this same batch.
  const occupiedAt = useMemo(() => {
    const vacating = new Set(
      rows.filter((r) => dest[r.key] !== KEEP).map((r) => `${r.date}|${r.unitId}`),
    );
    return (date: string, unitId: number) =>
      isOccupied(date, unitId) && !vacating.has(`${date}|${unitId}`);
  }, [rows, dest, isOccupied]);

  const movingCount = assignments.length;
  const clashCount = rows.filter(
    (r) => dest[r.key] !== KEEP && occupiedAt(r.date, Number(dest[r.key])),
  ).length;

  return (
    <>
      <div className="border-b px-6 pt-4.5 pb-3.5">
        <div className="text-[11px] font-medium tracking-wider text-[#1a3d69] uppercase">
          Redistribute
        </div>
        <div className="mt-1 text-lg font-bold text-[#333333]">
          Move {rows.length} selected booking{rows.length > 1 ? "s" : ""}
        </div>
        <p className="mt-1 text-[13px] font-light text-[#757575]">
          Each booking keeps its date and moves to the unit you pick. Leave one on “Keep where it
          is” to skip it. This can be undone (Ctrl/Cmd + Z).
        </p>
      </div>

      <div className="max-h-[46vh] overflow-y-auto px-6 py-1">
        {rows.map((r) => {
          const value = dest[r.key];
          const moving = value !== KEEP;
          const clashing = selfClashKeys.has(r.key);
          const occupied = moving && occupiedAt(r.date, Number(value));
          return (
            <div key={r.key} className="border-b border-[#f2f4f8] py-2.5 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-[52px] shrink-0 text-[12px] font-medium whitespace-nowrap text-[#757575]">
                  {fmtDate(r.date)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-[#333333]" title={r.siteName}>
                    {r.siteName}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] whitespace-nowrap text-[#9a9a9a]">
                    <span className={moving ? "line-through" : undefined}>{r.unitLabel}</span>
                    {moving && (
                      <>
                        <ArrowRightIcon className="size-3" aria-hidden />
                        <span className="font-medium text-[#1a3d69]">
                          {units.find((u) => u.id === Number(value))?.registration}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <UnitSelect
                  aria-label={`Destination unit for ${r.siteName} on ${fmtDate(r.date)}`}
                  className={`w-[200px] ${clashing ? "[&>select]:border-[#b13a3a]" : ""}`}
                  value={value}
                  onChange={(e) => setDest((d) => ({ ...d, [r.key]: e.target.value }))}
                >
                  <option value={KEEP}>Keep where it is</option>
                  {units
                    .filter((u) => u.id !== r.unitId)
                    .map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.registration}
                        {occupiedAt(r.date, u.id) ? " — occupied" : ""}
                      </option>
                    ))}
                </UnitSelect>
              </div>
              {(clashing || occupied) && (
                <div
                  className={`mt-1.5 ml-[64px] text-[11px] ${clashing ? "text-[#b13a3a]" : "text-[#8a6d1f]"}`}
                >
                  {clashing
                    ? "Another selected booking is going to this unit on this date."
                    : "That slot is taken — you'll be asked to swap or overwrite."}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 border-t px-6 pt-3.5 pb-5">
        <div className="min-w-0 flex-1 text-[12px] text-[#757575]">
          {selfClashKeys.size > 0 ? (
            <span className="text-[#b13a3a]">Fix the clashes above to continue.</span>
          ) : movingCount === 0 ? (
            "Nothing to move yet — pick a destination unit."
          ) : (
            <>
              {movingCount} moving, {rows.length - movingCount} staying
              {clashCount > 0 && (
                <span className="text-[#8a6d1f]">
                  {" "}
                  · {clashCount} into {clashCount === 1 ? "an occupied slot" : "occupied slots"}
                </span>
              )}
            </>
          )}
        </div>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="min-w-[110px]"
          disabled={movingCount === 0 || selfClashKeys.size > 0}
          onClick={() => onConfirm(assignments)}
        >
          {movingCount > 0 ? `Move ${movingCount}` : "Move"}
        </Button>
      </div>
    </>
  );
}
