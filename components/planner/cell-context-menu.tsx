"use client";

import { useMemo, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Clash } from "./clash-dialog";

type Unit = { id: number; registration: string; description: string | null; displayOrder: number };

type MoveState = { origin: { date: string; unitId: number }; keys: string[] };
type PreviewResult = { clashes: Clash[]; oob: boolean };

/**
 * Right-click "move to unit" — the client's own Excel-era reflex (right-click a cell to act
 * on it), added specifically to skip dragging a selection across a long run of unit columns.
 * Not a general context menu (SPEC.md §14 still defers that) — one action, routed through the
 * exact same clash-detection/move pipeline as a drag, see docs/DECISIONS.md #34.
 *
 * One cell → a submenu of destination units, moved immediately. A multi-select → the
 * per-row dialog instead (#35): sending a whole block to one unit would just re-create the
 * clash it's usually being moved to escape. Exactly two selected → also a direct "Swap"
 * shortcut: already possible today via two picks in that dialog (each choosing the other's
 * unit), this just does it in one click, reusing the same swap pipeline a drag onto an
 * occupied cell already resolves to.
 */
export function CellMoveMenu({
  day,
  unit,
  cellKey,
  checked,
  visibleUnits,
  computePreview,
  onMove,
  onOpenMoveDialog,
  onSwapSelected,
  children,
}: {
  day: { date: string };
  unit: Unit;
  cellKey: string;
  checked: Set<string>;
  /** Candidate destinations — the same list the toolbar's search/"Available units" filter produces. */
  visibleUnits: Unit[];
  computePreview: (st: MoveState, targetDate: string, targetUnitId: number) => PreviewResult;
  onMove: (targetUnitId: number) => void;
  onOpenMoveDialog: () => void;
  /** Swap the two currently-selected bookings directly. Only ever called when exactly two are selected. */
  onSwapSelected: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const inSelection = checked.has(cellKey);
  const movingCount = inSelection ? checked.size : 1;
  const multi = movingCount > 1;
  const canSwap = inSelection && movingCount === 2;

  // Gated on `open` — this runs a clash check against every other visible unit, which would be
  // wasted work on every rendered cell in the virtualised grid if it ran unconditionally.
  // Skipped entirely for a multi-select, where the dialog does its own per-row checks.
  const candidates = useMemo(() => {
    if (!open || multi) return [];
    return visibleUnits
      .filter((u) => u.id !== unit.id)
      .map((u) => {
        const res = computePreview(
          { origin: { date: day.date, unitId: unit.id }, keys: [cellKey] },
          day.date,
          u.id,
        );
        return { unit: u, clashes: res.clashes.length, oob: res.oob };
      })
      .filter((c) => !c.oob)
      .sort((a, b) => a.clashes - b.clashes || a.unit.registration.localeCompare(b.unit.registration));
  }, [open, multi, visibleUnits, unit.id, day.date, cellKey, computePreview]);

  return (
    <ContextMenu onOpenChange={setOpen}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {multi ? (
          <>
            {canSwap && (
              <ContextMenuItem onSelect={onSwapSelected}>⇄ Swap these two bookings</ContextMenuItem>
            )}
            <ContextMenuItem onSelect={onOpenMoveDialog}>
              Move {movingCount} selected bookings…
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move to unit</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {candidates.length === 0 && <ContextMenuItem disabled>No other units in view</ContextMenuItem>}
              {candidates.map(({ unit: u, clashes }) => (
                <ContextMenuItem key={u.id} onSelect={() => onMove(u.id)}>
                  <span className="flex-1">{u.registration}</span>
                  {clashes > 0 && <span className="text-xs text-muted-foreground">occupied</span>}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
