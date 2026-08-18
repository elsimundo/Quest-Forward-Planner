"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import type { DayInfo } from "@/lib/dates";
import { fmtDate, DOW_FULL, todayIso } from "@/lib/dates";
import type { OverlayBooking } from "@/lib/db/tms/overlay";
import type { StatusView } from "@/lib/statuses";
import type { TmsBookingTag } from "@/lib/db/tms/queries";
import { StatusCatalogProvider } from "./status-context";
import { GeneratorTagIdsProvider } from "./generator-tag-context";
import { TagCatalogProvider } from "./tag-context";
import { computeCapabilityWarnings } from "@/lib/capability-matching";
import { moveBookings, type MoveMode, type MoveSpec } from "@/lib/actions/booking-moves";
import { undoBatch } from "@/lib/actions/undo";
import { publishBookings, type PublishTarget } from "@/lib/actions/publish";
import { discardUnpublishedChanges } from "@/lib/actions/discard-changes";
import { classifyForPublish } from "@/lib/publish-eligibility";
import { changeKindFor, summariseChanges } from "@/lib/planner-changes";
import type { Role } from "@/lib/db/schema";
import { AvailabilityBar } from "./availability-bar";
import { CellChip, GhostChip } from "./cell-chip";
import { CellMoveMenu, EmptySlotContextMenu } from "./cell-context-menu";
import { MoveSelectedDialog, type MoveRow } from "./move-selected-dialog";
import { PlannerToolbar } from "./toolbar";
import { StatusLegend } from "./status-legend";
import { SelectionBar } from "./selection-bar";
import { BulkBookingDrawer } from "./bulk-booking-drawer";
import { BulkEditDrawer, type BulkEditRow } from "./bulk-edit-drawer";
import { createBookings, clearBookings } from "@/lib/actions/bookings";
import { ChangesBar } from "./changes-bar";
import { ClashDialog, type Clash } from "./clash-dialog";
import { PublishRangeDialog } from "./publish-range-dialog";
import { PublishSelectedDialog } from "./publish-selected-dialog";
import { DiscardChangesDialog } from "./discard-changes-dialog";
import type { PublishExclusion } from "./publish-breakdown";
import { BookingDrawer, type DrawerTarget } from "./booking-drawer";

// Publishing (forward to TMS) is scheduler+; unlocking a published booking is admin-only
// (SPEC.md §2b). These mirror the server-side gates in lib/actions/publish.ts — the UI
// checks are a convenience, never the boundary.
const PUBLISH_ROLES: Role[] = ["scheduler", "admin", "super_admin"];
const UNLOCK_ROLES: Role[] = ["admin", "super_admin"];

const DATE_COL_WIDTH = 190;
const UNIT_COL_WIDTH = 132;
const ROW_HEIGHT = 54;

// Undo/redo batch ids are persisted to sessionStorage so a stray tab refresh doesn't wipe
// the stack — the server still validates every batchId on undo (lib/actions/undo.ts), so a
// stale or cross-tab id just fails gracefully (NOT_FOUND/LOCKED/CONFLICT) instead of corrupting
// anything. sessionStorage (not localStorage) is deliberate: it's per-tab and clears when the
// tab closes, matching "don't lose it on refresh" without batches leaking across tabs/sessions.
const UNDO_STACK_KEY = "planner-undo-stack";
const REDO_STACK_KEY = "planner-redo-stack";

function readStack(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") ? parsed : [];
  } catch {
    return [];
  }
}

function writeStack(key: string, stack: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(stack));
  } catch {
    // ignore quota/privacy-mode errors — undo/redo just won't survive a refresh
  }
}

// Same sessionStorage precedent as the undo/redo stacks above, applied to which cell's edit
// drawer is open. Without this, the drawer closing is entirely a function of `PlannerGrid`
// staying mounted — and it isn't guaranteed to: the ~10s background poll's router.refresh()
// (see the live-updates effect below) re-renders app/(planner)/page.tsx server-side, and on
// any TMS hiccup that page swaps the whole grid out for a structurally different
// "TMS unavailable" screen and back (lib/db/tms/booking-cache.ts), unmounting this component
// and silently dropping whatever the scheduler was mid-edit on. Restoring from here means a
// remount — from that, or a stray tab refresh — reopens the drawer instead of just closing it.
const OPEN_CELL_KEY = "planner-open-cell";

type StoredOpenCell = { companyId: number; modalityId: number; unitId: number; date: string };

function readOpenCell(): StoredOpenCell | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OPEN_CELL_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as StoredOpenCell).companyId === "number" &&
      typeof (parsed as StoredOpenCell).modalityId === "number" &&
      typeof (parsed as StoredOpenCell).unitId === "number" &&
      typeof (parsed as StoredOpenCell).date === "string"
    ) {
      return parsed as StoredOpenCell;
    }
    return null;
  } catch {
    return null;
  }
}

function writeOpenCell(value: StoredOpenCell | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(OPEN_CELL_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(OPEN_CELL_KEY);
  } catch {
    // ignore quota/privacy-mode errors — worst case a remount just closes the drawer, as before
  }
}

type Unit = { id: number; registration: string; description: string | null; displayOrder: number };
type CapabilityRequirement = { requirementKey: string; required: boolean };
const cellKey = (date: string, unitId: number) => `${date}|${unitId}`;

/**
 * A live "drag the edge of a run" gesture.
 *
 * `startIdx`/`endIdx` are the run as it stands in the database; `edgeIdx` is where the
 * dragged edge currently sits, clamped to `[minIdx, maxIdx]` — the walls worked out once at
 * pointer-down (the first occupied day in the growth direction, and one day short of the
 * opposite end when shrinking). The difference between the two is what gets written.
 */
type ResizeState = {
  unitId: number;
  edge: "top" | "bottom";
  /** Inherited by every day this gesture creates. */
  siteId: number;
  siteName: string;
  status: string;
  startIdx: number;
  endIdx: number;
  edgeIdx: number;
  minIdx: number;
  maxIdx: number;
};

/**
 * The grab strip on the top or bottom edge of a run.
 *
 * A sibling of CellChip rather than a child: the chip is a `<button>`, and a button inside a
 * button is invalid HTML that browsers recover from unpredictably — GhostChip already solved
 * the same problem the same way. It's a plain div, not a button, because it isn't reachable
 * or operable by keyboard; extending a run without a pointer is done by booking the extra
 * days directly, which the keyboard path already supports.
 *
 * `draggable={false}` matters: without it the strip inherits the chip's HTML5 drag on some
 * browsers and the two gestures fight over the same pointer-down.
 */
function ResizeHandle({ edge, onStart }: { edge: "top" | "bottom"; onStart: (e: React.PointerEvent) => void }) {
  return (
    <div
      draggable={false}
      onPointerDown={onStart}
      title={edge === "top" ? "Drag to start this visit earlier or later" : "Drag to extend or shorten this visit"}
      // (54px row − 40px chip) / 2 = 7px of dead space above and below the chip, so the
      // strip sits exactly on the chip's edge without overhanging the row.
      className={`absolute right-[3px] left-[3px] z-10 h-[8px] cursor-ns-resize opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
        edge === "top" ? "top-[7px] rounded-t-md" : "bottom-[7px] rounded-b-md"
      }`}
      style={{ background: "rgba(43,123,185,0.55)" }}
    />
  );
}

/** The days a resize would add, and the days it would give up. Exactly one is ever non-empty. */
function resizeSlices(st: ResizeState, days: DayInfo[]): { add: string[]; remove: string[] } {
  const range = (from: number, to: number) =>
    from > to ? [] : days.slice(from, to + 1).map((d) => d.date);
  return st.edge === "bottom"
    ? { add: range(st.endIdx + 1, st.edgeIdx), remove: range(st.edgeIdx + 1, st.endIdx) }
    : { add: range(st.edgeIdx, st.startIdx - 1), remove: range(st.startIdx, st.edgeIdx - 1) };
}

type DragPreview = {
  origin: { date: string; unitId: number };
  keys: string[];
  target?: string;
  /** Shift is down: only the grabbed cell is being placed, not the whole block. */
  single: boolean;
  preview: Map<string, "ok" | "bad">;
  valid: boolean;
  moves: MoveSpec[];
  clashes: Clash[];
  oob: boolean;
  /** Count of targets that land on a past day — a real cell, unlike `oob`, so it gets its own count rather than being silently skipped. */
  pastCount: number;
  dDelta: number;
  uDelta: number;
};

export function PlannerGrid({
  companyId,
  modalities,
  activeModalityId,
  units,
  days,
  bookings,
  tmsFetchedAtIso,
  statuses,
  generatorTagIds,
  tags,
  unitSpecs,
  siteCapabilityRequirements,
  role,
  actorId,
}: {
  companyId: number;
  modalities: { id: number; name: string }[];
  activeModalityId: number;
  units: Unit[];
  days: DayInfo[];
  bookings: OverlayBooking[];
  /** When the TMS half of the overlay was last read — surfaced in the toolbar (Stage E1). */
  tmsFetchedAtIso: string;
  statuses: StatusView[];
  /** TMS `booking_tags.id` values an admin has designated as generator tags. */
  generatorTagIds: number[];
  /** TMS's live `booking_tags` catalogue for this company (docs/DECISIONS.md #51). */
  tags: TmsBookingTag[];
  unitSpecs: Record<number, Record<string, string>>;
  siteCapabilityRequirements: Record<number, CapabilityRequirement[]>;
  role: Role;
  /** The logged-in user's id — who "discard my changes" acts on (bookings.updatedBy). */
  actorId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canPublish = PUBLISH_ROLES.includes(role);
  const canUnlock = UNLOCK_ROLES.includes(role);
  // Discarding your own changes is exactly as safe as Undo — same roles. Discarding
  // everyone's can wipe out a colleague's in-progress edits regardless of ownership, so
  // it's gated like unlocking a publish, not like Undo (docs/DECISIONS.md).
  const canDiscardMine = PUBLISH_ROLES.includes(role);
  const canDiscardEveryone = UNLOCK_ROLES.includes(role);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  // The changes view (docs/DECISIONS.md #29) — fades back everything TMS already has, leaving
  // only what publishing would send. A view mode, not a data filter: nothing is removed from
  // the grid, so the changes stay in the context of the schedule around them, which is the
  // half of "how it affects the schedule" a filtered list would lose.
  const [changesOnly, setChangesOnly] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);

  // Restores a drawer that was open the last time this component existed — see OPEN_CELL_KEY
  // above for why that isn't guaranteed to be "before the user closed it": it also covers a
  // remount this component didn't choose to have happen. Scoped to the SAME company+modality
  // the target was opened under, on mount only, so a genuine company/modality switch (a
  // deliberate action, not a remount) never resurrects a drawer from a different sheet.
  useEffect(() => {
    const stored = readOpenCell();
    if (!stored || stored.companyId !== companyId || stored.modalityId !== activeModalityId) return;
    const unit = units.find((u) => u.id === stored.unitId);
    if (!unit) return;
    setDrawerTarget({
      unitId: unit.id,
      unitRegistration: unit.registration,
      date: stored.date,
      unitDescription: unit.description,
      modalityId: activeModalityId,
      isPast: stored.date < todayIso(),
    });
    // Deliberately mount-only — see the comment above for why this must not re-fire on a
    // later company/modality change on a live instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modality is a URL param, not local state — switching pills navigates
  // (app/(planner)/page.tsx re-fetches server-side for the new modality), so the sheet
  // actually changes instead of just relabeling the same data.
  function changeModality(id: number) {
    const name = modalities.find((m) => m.id === id)?.name;
    if (!name) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("modality", name);
    router.push(`${pathname}?${params.toString()}`);
  }

  const [selectMode, setSelectMode] = useState(false);
  // "Book N days" on a selection of free cells. Separate from `drawerTarget`, which is always
  // about one specific cell.
  const [bulkOpen, setBulkOpen] = useState(false);
  // "Bulk edit" on a selection of already-booked cells — the booked-cell counterpart to
  // `bulkOpen`, which is for booking empty cells. Separate from `drawerTarget` (one cell)
  // and from `bulkOpen` (empty cells only) because the action and its drawer are different.
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<{ date: string; unitId: number } | null>(null);
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const [conflict, setConflict] = useState<{ moves: MoveSpec[]; clashes: Clash[] } | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [publishRange, setPublishRange] = useState<{ from: string; to: string } | null>(null);
  const [discardMode, setDiscardMode] = useState<"mine" | "everyone" | null>(null);
  // The keys "Publish selected" opened on, frozen at click time — not the live `checked` set.
  // With the sheet non-modal and the grid interactive behind it, the scheduler could otherwise
  // change their selection while the sheet is open; freezing which rows the sheet is ABOUT
  // (their eligibility still re-derives live via preflightForKeys) is less disorienting than a
  // row list that silently grows or shrinks underneath a half-read sheet.
  const [selectedSheetKeys, setSelectedSheetKeys] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const dragRef = useRef<{ origin: { date: string; unitId: number }; keys: string[] } | null>(null);
  // Both stacks START EMPTY and are restored in the effect below — deliberately NOT read in a
  // useState initialiser. That initialiser runs during render, where the server has no
  // sessionStorage and returns []: with batches stored, the server sends "Undo disabled" and
  // the client's first render says "Undo enabled", which is a hydration mismatch React refuses
  // to patch up. One render with the buttons disabled is the price of reading browser-only
  // state under SSR.
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [stacksRestored, setStacksRestored] = useState(false);

  useEffect(() => {
    setUndoStack(readStack(UNDO_STACK_KEY));
    setRedoStack(readStack(REDO_STACK_KEY));
    setStacksRestored(true);
  }, []);

  // Gated on `stacksRestored` so the write-back can't run during the mount pass and persist the
  // initial [] over the batches still sitting in sessionStorage — which would defeat the whole
  // point of storing them.
  useEffect(() => {
    if (stacksRestored) writeStack(UNDO_STACK_KEY, undoStack);
  }, [undoStack, stacksRestored]);
  useEffect(() => {
    if (stacksRestored) writeStack(REDO_STACK_KEY, redoStack);
  }, [redoStack, stacksRestored]);

  // Only REAL bookings — ghosts are excluded deliberately. A ghost is a rendering of where
  // TMS still has a booking a scheduler has moved (lib/db/tms/overlay.ts); it isn't one of
  // our rows, so it must never be selectable, draggable, publishable, or openable in the
  // drawer. Keeping it out of this one map is what guarantees that for every downstream
  // consumer at once, rather than needing an isGhost check at each of them.
  const bookingLookup = useMemo(() => {
    const map = new Map<string, OverlayBooking>();
    for (const b of bookings) if (!b.isGhost) map.set(cellKey(b.date, b.unitId), b);
    return map;
  }, [bookings]);

  const ghostLookup = useMemo(() => {
    const map = new Map<string, OverlayBooking>();
    for (const b of bookings) if (b.isGhost) map.set(cellKey(b.date, b.unitId), b);
    return map;
  }, [bookings]);

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  // Every unpublished difference between the planner and TMS in the loaded range. Counted
  // over `bookings` — ghosts included, since a cleared booking exists only as one — rather
  // than over the visible/filtered set, so the number doesn't silently shrink when someone
  // types in the search box. It answers "what have we changed", not "what can I see".
  const changeSummary = useMemo(() => summariseChanges(bookings), [bookings]);

  // Same computation, scoped to what the acting user currently owns — drives "discard my
  // changes". "Owns" means current updatedBy, not original authorship: if someone else has
  // since edited a booking you touched, it's no longer yours to discard (docs/DECISIONS.md).
  const myChangeSummary = useMemo(
    () => summariseChanges(bookings.filter((b) => b.updatedBy === actorId)),
    [bookings, actorId],
  );

  // Which loaded date to land on when the changes view is switched on. `days` now spans a
  // full ±1yr planning window (app/(planner)/page.tsx) and the grid opens scrolled to today,
  // so the 22 changes a company might have pending are easily nowhere near the current
  // scroll position — switching the view on would otherwise just fade the entire visible
  // range to ~20% with nothing lit anywhere in sight. Picks the change closest to today
  // (by calendar distance, not chronological order) since that's the one most likely to be
  // what a scheduler opening the view actually wants to check first.
  const nearestChangeDate = useMemo(() => {
    const changeDates = bookings.filter((b) => changeKindFor(b) !== null).map((b) => b.date);
    if (!changeDates.length) return null;
    const todayMs = Date.parse(todayIso());
    return changeDates.reduce((best, d) =>
      Math.abs(Date.parse(d) - todayMs) < Math.abs(Date.parse(best) - todayMs) ? d : best,
    );
  }, [bookings]);

  // Transient highlight on the cells we just jumped to, so the eye lands on them rather than
  // on "some row scrolled past". Cleared on a timer, and on unmount.
  //
  // A Set rather than one key: an undo reverts a whole batch, and flashing only the cell that
  // happened to be scrolled to would understate what just changed — nine bookings snapping
  // back should light up nine cells.
  const [flashKeys, setFlashKeys] = useState<Set<string>>(() => new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const sitesByUnit = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const b of bookings) {
      if (b.isGhost) continue;
      const set = map.get(b.unitId) ?? new Set<string>();
      set.add(b.siteName.toLowerCase());
      map.set(b.unitId, set);
    }
    return map;
  }, [bookings]);

  // Dates to check for the "available units only" filter below. Scoped to the current
  // multi-select when one exists — a scheduler clearing a downed unit's block selects
  // those bookings first, and wants units with room on THOSE dates, not just any gap
  // somewhere in the loaded range. Falls back to every loaded day when nothing's selected.
  const selectedDates = useMemo(() => {
    if (checked.size === 0) return null;
    const set = new Set<string>();
    for (const k of checked) set.add(k.split("|")[0]);
    return set;
  }, [checked]);

  // A unit "has room" if it has at least one cell, across the relevant dates, that isn't
  // booked — matching the availability bar's own definition of free (bidding counts as
  // free capacity, SPEC.md §13).
  const unitsWithAvailability = useMemo(() => {
    const relevantDays = selectedDates ? days.filter((d) => selectedDates.has(d.date)) : days;
    const set = new Set<number>();
    for (const u of units) {
      for (const day of relevantDays) {
        const b = bookingLookup.get(cellKey(day.date, u.id));
        if (!b || b.status === "bidding") {
          set.add(u.id);
          break;
        }
      }
    }
    return set;
  }, [units, days, bookingLookup, selectedDates]);

  // Units holding the current selection. The filter below must never hide these — they're
  // the source column(s) the scheduler is dragging FROM, and by definition they're full on
  // the very dates selected (that's why the block is being moved off them at all). Hiding
  // your own selection out from under you would make the checked chips undraggable.
  const checkedUnitIds = useMemo(() => {
    const set = new Set<number>();
    for (const k of checked) set.add(Number(k.split("|")[1]));
    return set;
  }, [checked]);

  const [availableOnly, setAvailableOnly] = useState(false);

  const visibleUnits = useMemo(() => {
    let list = units;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => {
        if (u.registration.toLowerCase().includes(q)) return true;
        if ((u.description ?? "").toLowerCase().includes(q)) return true;
        const unitSites = sitesByUnit.get(u.id);
        if (!unitSites) return false;
        for (const s of unitSites) if (s.includes(q)) return true;
        return false;
      });
    }
    if (availableOnly) {
      list = list.filter((u) => unitsWithAvailability.has(u.id) || checkedUnitIds.has(u.id));
    }
    return list;
  }, [search, units, sitesByUnit, availableOnly, unitsWithAvailability, checkedUnitIds]);

  const availabilityByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of days) {
      let free = 0;
      for (const u of units) {
        const b = bookingLookup.get(cellKey(day.date, u.id));
        if (!b || b.status === "bidding") free++;
      }
      map.set(day.date, free);
    }
    return map;
  }, [days, units, bookingLookup]);

  const dateIdx = useMemo(() => {
    const m = new Map<string, number>();
    days.forEach((d, i) => m.set(d.date, i));
    return m;
  }, [days]);
  const unitIdx = useMemo(() => {
    const m = new Map<number, number>();
    units.forEach((u, i) => m.set(u.id, i));
    return m;
  }, [units]);
  // Cheap date -> isPast lookup for the selection-count memos below, so they don't need to
  // re-derive "is this booking's date before today" from scratch.
  const isPastByDate = useMemo(() => {
    const m = new Map<string, boolean>();
    days.forEach((d) => m.set(d.date, d.isPast));
    return m;
  }, [days]);

  // History isn't part of day-to-day scheduling (docs/DECISIONS.md #54) — the grid opens with
  // past days collapsed out of the loaded row list entirely, rather than merely styled
  // read-only, so a scheduler never has to scroll past months of it to get to today. A banner
  // takes their place at the top of the list; clicking it is the deliberate "I want to check
  // something from the past" action that brings them back.
  const hasPastDays = useMemo(() => days.some((d) => d.isPast), [days]);
  const [pastRevealed, setPastRevealed] = useState(false);
  const renderDays = useMemo(
    () => (pastRevealed ? days : days.filter((d) => !d.isPast)),
    [days, pastRevealed],
  );
  // One extra virtual row for the banner, only while there's something for it to reveal and
  // it hasn't been clicked yet.
  const bannerOffset = !pastRevealed && hasPastDays ? 1 : 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: renderDays.length + bannerOffset,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const jumpToday = () => {
    const idx = renderDays.findIndex((d) => d.date === todayIso());
    // `align: "start"`, not "center" — today is meant to be the top row a scheduler sees, with
    // the reveal banner sitting just above it, scrolled out of view until they deliberately
    // scroll up for it. Centering left the banner visible immediately on every load (there's
    // rarely enough content above today to push it off-screen when centred), which made the
    // "day to day, no clutter" point of collapsing history in the first place moot.
    if (idx >= 0) virtualizer.scrollToIndex(idx + bannerOffset, { align: "start" });
  };

  // Revealing swaps `renderDays` from the collapsed (future-only) list to the full range,
  // which shifts every index below it — today moves from "row 1" (right after the banner) to
  // wherever it actually falls in the full ±1yr window. Without this the scroll position would
  // hold steady in INDEX terms and land on whatever now-different day that index maps to,
  // which reads as the grid randomly jumping. Landing back on today with `align: "start"`
  // instead puts the newly-revealed history directly above the fold, scrollable immediately —
  // which is the whole point of having just asked to see it.
  useEffect(() => {
    if (!pastRevealed) return;
    const idx = days.findIndex((d) => d.date === todayIso());
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastRevealed]);

  // Land on today whenever the sheet being viewed changes — first mount, switching modality
  // pills, or a remount (see OPEN_CELL_KEY above for why this component isn't guaranteed to
  // stay mounted). `days` spans a full ±1yr planning window regardless of where actual
  // bookings fall (app/(planner)/page.tsx), so row 0 is frequently a stretch of genuinely
  // empty future dates — opening there reads as "the schedule is empty" even when the real
  // data is just scrolled out of view.
  //
  // Deliberately always today, on every run, with no "restore the last scroll position"
  // branch (docs/DECISIONS.md #55) — day-to-day scheduling has one obvious home row, and a
  // scheduler who deliberately scrolled ahead or revealed the past shouldn't be dropped back
  // there invisibly by an unrelated background poll's remount; they land on today and, if
  // they want history again, the reveal banner is one click away, same as it always is.
  // Keyed on `activeModalityId` rather than `days` itself so the ~10s poll's
  // `router.refresh()` (same modality, new `days` reference) doesn't re-snap the view and
  // fight a scheduler who has since scrolled elsewhere on purpose mid-session.
  useEffect(() => {
    jumpToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModalityId]);

  const gridTemplateColumns = `${DATE_COL_WIDTH}px repeat(${visibleUnits.length}, ${UNIT_COL_WIDTH}px)`;

  // The TMS booking still sitting at the open cell, when we've moved or cleared it away.
  // Without this the drawer would show a bare "New booking" form and lose the fact that TMS
  // still has something here until publish — see docs/CELL_STATES.md.
  const drawerGhost = drawerTarget
    ? (ghostLookup.get(cellKey(drawerTarget.date, drawerTarget.unitId)) ?? null)
    : null;

  const drawerBooking = drawerTarget
    ? (bookingLookup.get(cellKey(drawerTarget.date, drawerTarget.unitId)) ?? null)
    : null;

  // Site IDs that already have a (non-ghost) booking on the drawer's date, so the "which pad?"
  // prompt can show a free/booked badge next to each pad.
  const bookedSiteIds = useMemo(() => {
    if (!drawerTarget) return new Set<number>();
    const set = new Set<number>();
    for (const b of bookings) {
      if (b.isGhost) continue;
      if (b.date === drawerTarget.date) set.add(b.siteId);
    }
    return set;
  }, [bookings, drawerTarget]);

  // ── selection ──
  const toggleCheck = useCallback((date: string, unitId: number) => {
    const k = cellKey(date, unitId);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
    setAnchor({ date, unitId });
  }, []);

  // Shift-click extends from the anchor down the same unit column. The range takes its KIND
  // from the anchor: anchored on a booking it picks up bookings, anchored on an empty cell it
  // picks up empty cells. That keeps a range homogeneous without anyone having to think about
  // it, and it's what makes "shift-click twelve free days and book them all" one gesture
  // instead of twelve ctrl-clicks — the thing the client asked for.
  const rangeCheck = useCallback(
    (date: string, unitId: number) => {
      if (!anchor || anchor.unitId !== unitId) return toggleCheck(date, unitId);
      const wantEmpty = !bookingLookup.has(cellKey(anchor.date, anchor.unitId));
      const a = dateIdx.get(anchor.date)!;
      const b = dateIdx.get(date)!;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      setChecked((prev) => {
        const next = new Set(prev);
        for (let i = lo; i <= hi; i++) {
          const d = days[i].date;
          const c = bookingLookup.get(cellKey(d, unitId));
          if (wantEmpty ? !c : c && !c.publishedAt) next.add(cellKey(d, unitId));
        }
        return next;
      });
    },
    [anchor, dateIdx, days, bookingLookup, toggleCheck],
  );

  // The selection can now hold both booked and empty cells, so every action states its own
  // scope rather than assuming one kind. Splitting it here once means `moveRows`, the publish
  // preflight and the drag all read a list that's already the right shape for them.
  //
  // A moved-away ghost's cell counts as empty on purpose: that slot genuinely IS free (the
  // availability bar counts it free, and the database will accept a booking there), and
  // `bookingLookup` excludes ghosts, so it falls out correctly with no special case. See
  // docs/CELL_STATES.md.
  const selectedBookingKeys = useMemo(
    () => [...checked].filter((k) => bookingLookup.has(k)),
    [checked, bookingLookup],
  );
  const selectedBookingSet = useMemo(() => new Set(selectedBookingKeys), [selectedBookingKeys]);
  const selectedEmptySlots = useMemo(
    () =>
      [...checked]
        .filter((k) => !bookingLookup.has(k))
        .map((k) => {
          const [date, unitStr] = k.split("|");
          return { unitId: Number(unitStr), date };
        }),
    [checked, bookingLookup],
  );

  // Of the booked selection, how many are unpublished (and therefore editable/publishable).
  // Deliberately NOT also gated on past-ness: this feeds "Publish selected" too, and
  // publishing a forgotten, never-published past booking must keep working (docs/DECISIONS.md)
  // — only Bulk edit excludes past bookings, via `bulkEditTargets`/`bulkEditableCount` below.
  const editableSelectedCount = useMemo(
    () => selectedBookingKeys.filter((k) => !bookingLookup.get(k)!.publishedAt).length,
    [selectedBookingKeys, bookingLookup],
  );

  // The actual rows the BulkEditDrawer will act on: unpublished, unlocked, non-past bookings
  // only. Excluded bookings are reported back as `bulkEditLockedCount`/`bulkEditPastCount`
  // rather than silently dropped — same reasoning as the publish preflight's excluded list,
  // split by reason so the drawer can say *why* rather than just how many.
  const bulkEditTargets = useMemo<BulkEditRow[]>(
    () =>
      selectedBookingKeys
        .filter((k) => {
          const b = bookingLookup.get(k)!;
          return !b.publishedAt && !isPastByDate.get(b.date);
        })
        .map((k) => {
          const b = bookingLookup.get(k)!;
          const [date, unitStr] = k.split("|");
          return {
            unitId: Number(unitStr),
            date,
            expectedUpdatedAt: b.updatedAt.toISOString(),
            unitLabel: unitById.get(b.unitId)?.registration ?? "?",
          };
        }),
    [selectedBookingKeys, bookingLookup, isPastByDate, unitById],
  );
  const bulkEditLockedCount = selectedBookingKeys.filter((k) => bookingLookup.get(k)!.publishedAt).length;
  // Past but NOT published — published already gets counted (and explained) as "locked", and
  // combined past+published shouldn't be double-counted across the two reasons.
  const bulkEditPastCount = selectedBookingKeys.filter((k) => {
    const b = bookingLookup.get(k)!;
    return !b.publishedAt && isPastByDate.get(b.date);
  }).length;

  const clearSelection = useCallback(() => {
    setChecked(new Set());
    setAnchor(null);
  }, []);

  const openCell = useCallback(
    (day: DayInfo, unit: Unit) => {
      setDrawerTarget({
        unitId: unit.id,
        unitRegistration: unit.registration,
        date: day.date,
        unitDescription: unit.description,
        modalityId: activeModalityId,
        isPast: day.isPast,
      });
      writeOpenCell({ companyId, modalityId: activeModalityId, unitId: unit.id, date: day.date });
    },
    [activeModalityId, companyId],
  );

  // Every place the drawer closes (Escape, "go to where it moved", and the `onClose` prop
  // <BookingDrawer> itself calls after saving/clearing/unlocking) routes through this, so the
  // persisted target never outlives the drawer it describes.
  const closeDrawer = useCallback(() => {
    setDrawerTarget(null);
    writeOpenCell(null);
  }, []);

  // Empty cells are selectable too now. The `&& booking` guards these branches used to carry
  // were what made `checked` provably all-booked; the scoping memos above replace that
  // guarantee with an explicit split, so each action still knows what it's acting on.
  //
  // A plain unmodified click on an empty cell is unchanged: it opens the drawer to book that
  // one cell, which is the common case and shouldn't need a modifier.
  const handleCellClick = (e: React.MouseEvent, day: DayInfo, unit: Unit, booking: OverlayBooking | null) => {
    if (booking?.publishedAt) return openCell(day, unit);
    // A past day is read-only for scheduling but still worth opening for audit — same
    // read-only drawer a locked booking gets, just a different reason. An EMPTY past cell has
    // nothing to show, so it's simply inert rather than opening a "book this" form for a slot
    // that can no longer be booked.
    if (day.isPast) return booking ? openCell(day, unit) : undefined;
    const k = cellKey(day.date, unit.id);
    if (checked.has(k)) return toggleCheck(day.date, unit.id);
    if (e.shiftKey) return rangeCheck(day.date, unit.id);
    if (e.ctrlKey || e.metaKey || selectMode) return toggleCheck(day.date, unit.id);
    openCell(day, unit);
  };

  // ── drag and drop ──
  const startDrag = (e: React.DragEvent, day: DayInfo, unit: Unit) => {
    const k = cellKey(day.date, unit.id);
    // A drag moves BOOKINGS. Any empty cells in the selection are along for a different ride
    // (they're what "Book N cells" acts on) and are dropped from the drag here rather than
    // being fed to computePreview, which has nothing to move for them.
    let keys = selectedBookingKeys;
    if (!checked.has(k)) {
      setChecked(new Set([k]));
      keys = [k];
    }
    const origin = { date: day.date, unitId: unit.id };
    dragRef.current = { origin, keys };
    setDrag({ origin, keys, single: false, preview: new Map(), valid: false, moves: [], clashes: [], oob: false, pastCount: 0, dDelta: 0, uDelta: 0 });
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", "quest-move");
    } catch {
      /* Safari can throw for unsupported MIME types — the drag still works without it */
    }
  };

  const computePreview = useCallback(
    (st: { origin: { date: string; unitId: number }; keys: string[] }, targetDate: string, targetUnitId: number) => {
      const dDelta = dateIdx.get(targetDate)! - dateIdx.get(st.origin.date)!;
      const uDelta = unitIdx.get(targetUnitId)! - unitIdx.get(st.origin.unitId)!;
      const moving = new Set(st.keys);
      const preview = new Map<string, "ok" | "bad">();
      const moves: MoveSpec[] = [];
      const clashes: Clash[] = [];
      let oob = false;
      let pastCount = 0;
      for (const k of st.keys) {
        const [srcDate, srcUnitStr] = k.split("|");
        const srcUnit = Number(srcUnitStr);
        const di = dateIdx.get(srcDate)! + dDelta;
        const ui = unitIdx.get(srcUnit)! + uDelta;
        if (di < 0 || di >= days.length || ui < 0 || ui >= units.length) {
          oob = true;
          continue;
        }
        const tDate = days[di].date;
        const tUnit = units[ui].id;
        const tKey = cellKey(tDate, tUnit);
        // A past target is a real cell, unlike an out-of-bounds index — it can't be silently
        // skipped the way `oob` is, or the block-level "valid" verdict below would say ok for
        // a drop that the server will reject. Treated like a clash: painted bad, counted, and
        // reported to the scheduler (see selection-bar.tsx's dragMessage).
        if (days[di].isPast) {
          preview.set(tKey, "bad");
          pastCount++;
          continue;
        }
        const occupant = bookingLookup.get(tKey);
        const occupied = !!occupant && !moving.has(tKey);
        preview.set(tKey, occupied ? "bad" : "ok");
        if (occupied && occupant) {
          clashes.push({ unitLabel: units[ui].registration, date: tDate, siteName: occupant.siteName, status: occupant.status });
        }
        moves.push({ fromUnitId: srcUnit, fromDate: srcDate, toUnitId: tUnit, toDate: tDate });
      }
      const valid = !oob && clashes.length === 0 && pastCount === 0;
      // One block, one verdict. Painting each target cell on its own merits meant dragging
      // nine bookings into a gap that fits six showed six green cells and three red ones —
      // which the client read as "this will work", because green is the go-ahead colour and
      // most of the block was green. It never did work: `attemptMove` below sends anything
      // with a clash to the swap/overwrite dialog and anything out of range to a toast. So
      // this is a feedback fix, not a behaviour one — if the set doesn't land cleanly as a
      // set, the whole set says so. Green now means exactly "drop this and it just moves".
      //
      // Out-of-range members have no in-range key to paint, which is the case this matters
      // most for: without the sweep a block hanging off the end of the calendar showed its
      // remaining members in green with nothing to indicate the rest had nowhere to go.
      if (!valid) for (const k of preview.keys()) preview.set(k, "bad");
      return { preview, valid, moves, clashes, oob, pastCount, dDelta, uDelta };
    },
    [dateIdx, unitIdx, days, units, bookingLookup],
  );

  // What this drag would place right now. Shift narrows an IN-FLIGHT block drag down to just
  // the cell that was grabbed, leaving the rest of the selection where it is — the escape hatch
  // for a block that can't land contiguously anywhere (docs/DECISIONS.md #35).
  //
  // Read per-event during the drag rather than once at dragstart, and that matters: shift held
  // at mousedown makes the browser extend the document's text selection instead of starting a
  // drag, so the gesture fired only intermittently. Once a drag is in flight there's no
  // selection to extend, and dragover/drop carry `shiftKey` just as well.
  function narrowForShift(
    st: { origin: { date: string; unitId: number }; keys: string[] },
    shiftKey: boolean,
  ) {
    const single = shiftKey && st.keys.length > 1;
    if (!single) return { st, single };
    return { st: { origin: st.origin, keys: [cellKey(st.origin.date, st.origin.unitId)] }, single };
  }

  const onCellDragOver = (e: React.DragEvent, day: DayInfo, unit: Unit) => {
    const active = dragRef.current;
    if (!active) return;
    e.preventDefault();
    const { st, single } = narrowForShift(active, e.shiftKey);
    const res = computePreview(st, day.date, unit.id);
    e.dataTransfer.dropEffect = res.valid ? "move" : "none";
    const tKey = cellKey(day.date, unit.id);
    // Capture values now, synchronously — the updater below can run after a later event
    // (e.g. drop) has already nulled dragRef.current via endDrag().
    const { origin, keys } = st;
    setDrag((prev) => {
      // `single` is part of the equality check, not just the target: tapping shift without
      // moving the mouse still has to repaint the preview from "whole block" to "one cell".
      if (prev && prev.target === tKey && prev.single === single) return prev;
      return { origin, keys, target: tKey, single, ...res };
    });
  };

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  // ── extend / shorten a run (drag the top or bottom edge) ──
  //
  // The client's "would be nice to drag the top or bottom of the planned movement to extend
  // it". A "planned movement" on screen is a vertical run of days — but there is no run in the
  // database: a booking is one row per unit per day (`bookings.date` is a single date column),
  // so there is no duration to stretch. Extending by three days CREATES three rows; pulling
  // the edge back in soft-deletes them. Both go through the bulk actions in
  // lib/actions/bookings.ts under one batch id, so the whole gesture is one Ctrl+Z.
  //
  // A run is: contiguous days, same unit, same SITE, none of them published. Status is
  // allowed to vary within one — a week at one site that's Confirmed for three days and
  // Provisional for two is still one visit, and splitting the handle there would be
  // surprising. New days inherit the grabbed booking's site and status, with blank notes:
  // notes are per-day operational detail ("arrive 7am"), and copying one across a fortnight
  // would be wrong more often than right.

  // Which cells carry a handle, and on which edge. Computed once per render over the whole
  // lookup rather than per cell — the grid is virtualised but still renders every visible
  // unit column for every visible day, and walking neighbours inside the cell render would
  // repeat this work a few hundred times a scroll.
  const runEdges = useMemo(() => {
    const edges = new Map<string, { top: boolean; bottom: boolean }>();
    const sameRun = (unitId: number, siteId: number, idx: number) => {
      if (idx < 0 || idx >= days.length) return false;
      const n = bookingLookup.get(cellKey(days[idx].date, unitId));
      return !!n && !n.publishedAt && n.siteId === siteId;
    };
    // A handle is pointless if there's no room to grow into: the neighbouring day is either
    // off the grid, in the past (can't extend a run backward into history), or already held
    // by some other booking (bookingLookup excludes ghosts, so a moved-away ghost's slot
    // still counts as free — a run may grow over it, same as the actual clamp in beginResize
    // below).
    const free = (unitId: number, idx: number) =>
      idx >= 0 && idx < days.length && !days[idx].isPast && !bookingLookup.has(cellKey(days[idx].date, unitId));
    for (const [k, b] of bookingLookup) {
      if (b.publishedAt) continue;
      const i = dateIdx.get(b.date);
      if (i === undefined) continue;
      edges.set(k, {
        top: !sameRun(b.unitId, b.siteId, i - 1) && free(b.unitId, i - 1),
        bottom: !sameRun(b.unitId, b.siteId, i + 1) && free(b.unitId, i + 1),
      });
    }
    return edges;
  }, [bookingLookup, dateIdx, days]);

  const [resize, setResize] = useState<ResizeState | null>(null);
  // The live gesture, for the pointer handlers — same reason dragRef exists: they're
  // registered once and can't see fresh state.
  const resizeRef = useRef<ResizeState | null>(null);
  const resizePointerY = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Which day is under the pointer. Read from the DOM rather than computed from coordinates:
  // rows are virtualised and sit behind a sticky header, columns behind a sticky date column,
  // and reproducing all of that in arithmetic is exactly the kind of thing that drifts the
  // first time a padding value changes.
  function dayIdxAtPoint(clientY: number, unitId: number): number | null {
    const el = document.elementFromPoint(
      // Any x inside the unit's own column would do; the cell we want is keyed by both, so
      // just probe straight down the column the run lives in via its data attribute.
      resizeProbeX.current,
      clientY,
    );
    const cell = (el as HTMLElement | null)?.closest<HTMLElement>("[data-cell-date]");
    if (!cell || Number(cell.dataset.cellUnit) !== unitId) return null;
    return dateIdx.get(cell.dataset.cellDate!) ?? null;
  }
  const resizeProbeX = useRef(0);

  function updateResize(clientY: number) {
    const st = resizeRef.current;
    if (!st) return;
    const idx = dayIdxAtPoint(clientY, st.unitId);
    if (idx === null) return;
    // Clamp to the walls: growth stops at the first occupied day (the run physically cannot
    // pass another booking, so there's no invalid state to paint — the edge just refuses to
    // go further), and shrinking stops one day short of the opposite end. A run always keeps
    // at least one day; emptying it entirely is "Clear", not a resize.
    const edgeIdx = Math.max(st.minIdx, Math.min(st.maxIdx, idx));
    if (edgeIdx === st.edgeIdx) return;
    const next = { ...st, edgeIdx };
    resizeRef.current = next;
    setResize(next);
  }

  function beginResize(e: React.PointerEvent, day: DayInfo, unit: Unit, edge: "top" | "bottom") {
    const booking = bookingLookup.get(cellKey(day.date, unit.id));
    if (!booking) return;
    // Stop the chip's HTML5 dragstart from firing underneath: this gesture and the move
    // gesture overlap on the same chip, and only one of them can own the pointer.
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const i = dateIdx.get(day.date)!;
    const inRun = (j: number) => {
      if (j < 0 || j >= days.length) return false;
      const n = bookingLookup.get(cellKey(days[j].date, unit.id));
      return !!n && !n.publishedAt && n.siteId === booking.siteId;
    };
    let startIdx = i;
    while (inRun(startIdx - 1)) startIdx--;
    let endIdx = i;
    while (inRun(endIdx + 1)) endIdx++;

    // How far this edge can grow before it hits something. `bookingLookup` excludes ghosts,
    // which is right: a moved-away ghost's slot is genuinely free and a run may grow over it.
    // Also stops at the past/future boundary — a run can never grow backward into history.
    const free = (j: number) =>
      j >= 0 && j < days.length && !days[j].isPast && !bookingLookup.has(cellKey(days[j].date, unit.id));
    let limit = edge === "bottom" ? endIdx : startIdx;
    while (free(edge === "bottom" ? limit + 1 : limit - 1)) limit += edge === "bottom" ? 1 : -1;

    const st: ResizeState = {
      unitId: unit.id,
      edge,
      siteId: booking.siteId,
      siteName: booking.siteName,
      status: booking.status,
      startIdx,
      endIdx,
      edgeIdx: edge === "bottom" ? endIdx : startIdx,
      minIdx: edge === "bottom" ? startIdx : limit,
      maxIdx: edge === "bottom" ? limit : endIdx,
    };
    resizeRef.current = st;
    resizePointerY.current = e.clientY;
    resizeProbeX.current = e.clientX;
    setResize(st);

    // A downward extend runs off the bottom of the viewport within a few days, so the grid
    // has to come to the pointer. Recomputed from the stored pointer position on each tick,
    // since the pointer itself isn't moving while the content scrolls under it.
    autoScrollTimer.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el || !resizeRef.current) return;
      const box = el.getBoundingClientRect();
      const y = resizePointerY.current;
      const margin = 48;
      if (y < box.top + margin) el.scrollTop -= ROW_HEIGHT;
      else if (y > box.bottom - margin) el.scrollTop += ROW_HEIGHT;
      else return;
      updateResize(y);
    }, 60);
  }

  function endResize() {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    const st = resizeRef.current;
    resizeRef.current = null;
    setResize(null);
    return st;
  }

  async function commitResize(st: ResizeState) {
    const { add, remove } = resizeSlices(st, days);
    if (!add.length && !remove.length) return;

    setPending(true);
    const result = add.length
      ? await createBookings({
          slots: add.map((date) => ({ unitId: st.unitId, date })),
          site: { id: st.siteId },
          status: st.status,
          notes: "",
          modalityId: activeModalityId,
        })
      : await clearBookings({
          slots: remove.map((date) => ({
            unitId: st.unitId,
            date,
            // Every removed day is a live local booking by construction — `remove` only ever
            // covers days inside the run, and a run is built from bookingLookup.
            expectedUpdatedAt: bookingLookup.get(cellKey(date, st.unitId))!.updatedAt.toISOString(),
          })),
        });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    pushUndo(result.batchId);
    router.refresh();
  }

  function pushUndo(batchId: string) {
    setUndoStack((s) => [...s, batchId]);
    setRedoStack([]);
  }

  async function applyMove(moves: MoveSpec[], mode: MoveMode) {
    setPending(true);
    const result = await moveBookings(moves, mode);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    pushUndo(result.batchId);
    router.refresh();
    // The selection FOLLOWS the bookings to their new cells rather than being cleared: a tick
    // stays on until the scheduler takes it off (clicking the booking, or Clear selection).
    // That's what makes placing a block one-at-a-time work — after each shift-drag the moved
    // booking is still ticked at its destination and the unplaced ones are still ticked where
    // they are, so the set you're working through stays visible and intact throughout.
    const remap = new Map(moves.map((m) => [cellKey(m.fromDate, m.fromUnitId), cellKey(m.toDate, m.toUnitId)]));
    setChecked((prev) => {
      const next = new Set<string>();
      for (const k of prev) next.add(remap.get(k) ?? k);
      return next;
    });
    // Keep the shift-click range anchor pointing at the same booking, wherever it landed.
    setAnchor((prev) => {
      if (!prev) return prev;
      const moved = moves.find((m) => m.fromDate === prev.date && m.fromUnitId === prev.unitId);
      return moved ? { date: moved.toDate, unitId: moved.toUnitId } : prev;
    });
  }

  // Shared by drag-drop and the right-click "move to unit" menu — one move pipeline, two
  // triggers, so clash handling (swap/overwrite dialog) and undo behave identically either way.
  function attemptMove(st: { origin: { date: string; unitId: number }; keys: string[] }, targetDate: string, targetUnitId: number) {
    const res = computePreview(st, targetDate, targetUnitId);
    if (res.dDelta === 0 && res.uDelta === 0) return;
    if (res.oob) {
      toast.error("Can't move there — part of the selection would fall outside the planner range");
      return;
    }
    if (res.pastCount > 0) {
      toast.error("Can't move there — part of the selection would land on a date that's passed");
      return;
    }
    if (res.clashes.length > 0) {
      setConflict({ moves: res.moves, clashes: res.clashes });
      return;
    }
    void applyMove(res.moves, "move");
  }

  const onCellDrop = (e: React.DragEvent, day: DayInfo, unit: Unit) => {
    e.preventDefault();
    const active = dragRef.current;
    endDrag();
    if (!active) return;
    // Shift state is taken from the drop itself, so releasing over the target with shift held
    // places only the grabbed booking — whatever the drag started as.
    const { st } = narrowForShift(active, e.shiftKey);
    attemptMove(st, day.date, unit.id);
  };

  // Right-click "move to unit" (docs/DECISIONS.md #34): moves the whole current selection if
  // the right-clicked cell is part of it, otherwise just that one cell — same rule `handleCellClick`
  // already uses for what a plain click targets.
  function moveCellToUnit(day: DayInfo, unit: Unit, targetUnitId: number) {
    const k = cellKey(day.date, unit.id);
    const keys = checked.has(k) ? selectedBookingKeys : [k];
    attemptMove({ origin: { date: day.date, unitId: unit.id }, keys }, day.date, targetUnitId);
  }

  // Right-click "Return to TMS" (docs/DECISIONS.md #36): moves a single TMS-sourced booking
  // back to where TMS still has it, using the same clash-detection/move pipeline as any other
  // move. The overlay's `movedFrom` field is the TMS position — only non-null when the
  // booking has actually been moved from its TMS slot.
  function returnToTms(day: DayInfo, unit: Unit) {
    const booking = bookingLookup.get(cellKey(day.date, unit.id));
    if (!booking?.movedFrom) return;
    attemptMove(
      { origin: { date: day.date, unitId: unit.id }, keys: [cellKey(day.date, unit.id)] },
      booking.movedFrom.date,
      booking.movedFrom.unitId,
    );
  }

  // The booked part of the current selection, as dialog rows. Published bookings can't be
  // selected in the first place (handleCellClick opens rather than checks a locked cell), and
  // empty cells and ghosts aren't in `selectedBookingKeys`, so everything here is movable.
  const moveRows: MoveRow[] = useMemo(() => {
    const rows: MoveRow[] = [];
    for (const k of selectedBookingKeys) {
      const b = bookingLookup.get(k);
      if (!b) continue;
      rows.push({
        key: k,
        date: b.date,
        unitId: b.unitId,
        unitLabel: unitById.get(b.unitId)?.registration ?? "?",
        siteName: b.siteName,
      });
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.unitLabel.localeCompare(b.unitLabel));
  }, [selectedBookingKeys, bookingLookup, unitById]);

  // Per-row destinations from the "Move selected bookings" dialog. Unlike a drag (one uniform
  // date/unit delta applied to the whole block) each row here names its own target unit, on its
  // own existing date — which is the point: a block coming off a downed unit rarely fits in one
  // contiguous run anywhere else. Clash rules are the drag's: a target is only occupied if
  // something is there that isn't itself moving away in this same batch.
  function attemptExplicitMoves(assignments: { fromDate: string; fromUnitId: number; toUnitId: number }[]) {
    const vacating = new Set(assignments.map((a) => cellKey(a.fromDate, a.fromUnitId)));
    const moves: MoveSpec[] = [];
    const clashes: Clash[] = [];
    for (const a of assignments) {
      const tKey = cellKey(a.fromDate, a.toUnitId);
      const occupant = bookingLookup.get(tKey);
      if (occupant && !vacating.has(tKey)) {
        clashes.push({
          unitLabel: unitById.get(a.toUnitId)?.registration ?? "?",
          date: a.fromDate,
          siteName: occupant.siteName,
          status: occupant.status,
        });
      }
      moves.push({ fromUnitId: a.fromUnitId, fromDate: a.fromDate, toUnitId: a.toUnitId, toDate: a.fromDate });
    }
    if (moves.length === 0) return;
    if (clashes.length > 0) {
      setConflict({ moves, clashes });
      return;
    }
    void applyMove(moves, "move");
  }

  // Right-click shortcut for exactly two selected cells: swap them directly, reusing the same
  // swap pipeline a drag onto an occupied cell already resolves to (moveBookings' "swap"
  // mode computes the reciprocal reposition itself from a single MoveSpec). No clash dialog —
  // picking "Swap" on a two-cell selection IS the confirmation.
  async function handleSwapSelected() {
    if (selectedBookingKeys.length !== 2) return;
    const [keyA, keyB] = selectedBookingKeys;
    const a = bookingLookup.get(keyA);
    const b = bookingLookup.get(keyB);
    if (!a || !b) return;
    setPending(true);
    const result = await moveBookings(
      [{ fromUnitId: a.unitId, fromDate: a.date, toUnitId: b.unitId, toDate: b.date }],
      "swap",
    );
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    pushUndo(result.batchId);
    router.refresh();
    // Unlike applyMove's general remap (built for one-directional moves, where `moves` names
    // every departing cell), a straight two-way swap doesn't change WHICH cells are selected
    // — both slots stay occupied, just by each other's booking — so `checked`/`anchor` need
    // no remap here.
  }

  async function resolveConflict(choice: "swap" | "overwrite" | "cancel") {
    if (!conflict) return;
    if (choice === "cancel") {
      setConflict(null);
      return;
    }
    await applyMove(conflict.moves, choice);
    setConflict(null);
  }

  // ── cell navigation ──
  // Scroll a specific cell into view and flash it. Built for the ghost's "jump to where this
  // moved" link (Stage C1) and now shared with undo/redo, which has the same problem: the
  // thing that changed is very often nowhere near the viewport, and a toast alone doesn't say
  // where to look. Two axes to handle: rows are virtualised (so scrollIntoView on a DOM node
  // is useless — the target row may not be mounted), and unit columns scroll horizontally
  // behind a sticky date column.
  //
  // `flash` defaults to just the scrolled-to cell; callers reverting a whole batch pass every
  // cell they touched, so the highlight describes the change rather than the destination.
  const goToCell = useCallback(
    (to: { unitId: number; date: string }, flash?: Iterable<string>) => {
      // If a search or "available units only" filter is hiding the destination column,
      // clear it first — jumping to a column that isn't rendered would silently do
      // nothing, which reads as a broken link.
      const hidden = !visibleUnits.some((u) => u.id === to.unitId);
      if (hidden) {
        setSearch("");
        setAvailableOnly(false);
      }
      const columns = hidden ? units : visibleUnits;

      const run = () => {
        const rowIdx = dateIdx.get(to.date);
        if (rowIdx !== undefined) virtualizer.scrollToIndex(rowIdx, { align: "center" });

        const el = scrollRef.current;
        const colIdx = columns.findIndex((u) => u.id === to.unitId);
        if (el && colIdx >= 0) {
          // Centre the column in the space to the RIGHT of the sticky date column, which
          // overlays the first DATE_COL_WIDTH px of the viewport.
          const contentX = DATE_COL_WIDTH + colIdx * UNIT_COL_WIDTH;
          const gutter = DATE_COL_WIDTH + Math.max(0, (el.clientWidth - DATE_COL_WIDTH - UNIT_COL_WIDTH) / 2);
          const left = Math.max(0, Math.min(contentX - gutter, el.scrollWidth - el.clientWidth));
          el.scrollTo({ left, behavior: "smooth" });
        }

        setFlashKeys(new Set(flash ?? [cellKey(to.date, to.unitId)]));
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlashKeys(new Set()), 2000);
      };

      // Clearing the search has to paint before the column index means anything.
      if (hidden) requestAnimationFrame(() => requestAnimationFrame(run));
      else run();
    },
    [dateIdx, virtualizer, visibleUnits, units],
  );

  // Green on the days about to be added, tan-and-faded on the days about to be given up.
  // Same `preview` prop the move drag paints through, so a cell can never try to show both.
  const resizePreview = useMemo(() => {
    const map = new Map<string, "ok" | "remove">();
    if (!resize) return map;
    const { add, remove } = resizeSlices(resize, days);
    for (const d of add) map.set(cellKey(d, resize.unitId), "ok");
    for (const d of remove) map.set(cellKey(d, resize.unitId), "remove");
    return map;
  }, [resize, days]);

  // ── publish / lock ──
  // Which statuses may be forwarded to TMS, straight from the admin-managed catalogue
  // (booking_statuses.publishable, migration 0012). Both this and the server gate in
  // lib/actions/publish.ts read the same data, so the "Publish N" count can't drift from
  // what the server will actually accept — which a hardcoded list on either side would.
  const publishableKeys = useMemo(
    () => new Set(statuses.filter((s) => s.publishable).map((s) => s.key)),
    [statuses],
  );

  // Stage D1: classify every candidate against the SAME logic the server gate uses
  // (lib/publish-eligibility.ts), so what this preview promises is what publishBookings
  // actually does. Ghosts are never candidates — bookingLookup already excludes them, and
  // the range sweep below reads from `bookings` directly so it must skip them explicitly.
  const classify = useCallback(
    // staleSincePreflight only exists server-side (lib/actions/publish.ts, comparing against a
    // later DB read) — this client-side preview has no "expected vs. actual" gap to detect.
    (b: OverlayBooking) => classifyForPublish({ ...b, tmsCollision: !!b.tmsCollision, staleSincePreflight: false }, publishableKeys),
    [publishableKeys],
  );

  // Live, unpublished PLANNER CHANGES within [from, to], split into what will publish and
  // what won't — and why. Already-published bookings in range are excluded from BOTH lists
  // entirely (re-sweeping a range that includes locked bookings is routine, not an exception
  // worth naming — SPEC.md §2b).
  //
  // An untouched TMS booking (`origin: "tms"`) is filtered out here before classification —
  // not reported as eligible OR excluded. It was never a change the planner is proposing, so
  // it isn't this dialog's business (docs/DECISIONS.md #29). Before this filter the range
  // sweep reported on TMS's entire underlying schedule: a booking nobody had touched, sitting
  // in `likely`/`tbc`/etc. because that's what it normally is, showed up as "Not yet
  // Confirmed — needs attention" alongside genuine planner exceptions.
  const preflightForRange = useCallback(
    (from: string, to: string) => {
      const eligibleBookings: OverlayBooking[] = [];
      const excluded: PublishExclusion[] = [];
      for (const b of bookings) {
        if (b.isGhost || b.date < from || b.date > to || b.publishedAt || b.origin === "tms") continue;
        const result = classify(b);
        if (result.eligible) eligibleBookings.push(b);
        else excluded.push({ key: cellKey(b.date, b.unitId), unitId: b.unitId, date: b.date, label: `${unitById.get(b.unitId)?.registration ?? "?"} · ${fmtDate(b.date)}`, siteName: b.siteName, reason: result.reason });
      }
      return {
        eligible: eligibleBookings.map((b) => ({ unitId: b.unitId, date: b.date, expectedUpdatedAt: b.updatedAt.toISOString() })),
        eligibleSummary: summariseChanges(eligibleBookings),
        excluded,
      };
    },
    [bookings, classify, unitById],
  );

  // Same split, but over an explicit key list rather than the live multi-select — shared by
  // preflightForSelection (below) and by the "Publish selected" sheet, which freezes the key
  // list at open time (planner-grid.tsx's publishSelected) so the set of rows it's discussing
  // doesn't silently grow/shrink if the scheduler changes their selection while it's open.
  // Unlike the range sweep, an untouched TMS booking reached this way was chosen deliberately —
  // a scheduler ctrl-clicked it — so it's reported rather than silently dropped, just with a
  // calm reason ("already matches TMS") rather than the alarming "needs attention" ones.
  const preflightForKeys = useCallback(
    (keys: Iterable<string>) => {
      const eligibleBookings: OverlayBooking[] = [];
      const excluded: PublishExclusion[] = [];
      for (const k of keys) {
        const b = bookingLookup.get(k);
        if (!b || b.publishedAt) continue;
        if (b.origin === "tms") {
          excluded.push({ key: k, unitId: b.unitId, date: b.date, label: `${unitById.get(b.unitId)?.registration ?? "?"} · ${fmtDate(b.date)}`, siteName: b.siteName, reason: "not-a-planner-change" });
          continue;
        }
        const result = classify(b);
        if (result.eligible) eligibleBookings.push(b);
        else excluded.push({ key: k, unitId: b.unitId, date: b.date, label: `${unitById.get(b.unitId)?.registration ?? "?"} · ${fmtDate(b.date)}`, siteName: b.siteName, reason: result.reason });
      }
      return {
        eligible: eligibleBookings.map((b) => ({ unitId: b.unitId, date: b.date, expectedUpdatedAt: b.updatedAt.toISOString() })),
        eligibleSummary: summariseChanges(eligibleBookings),
        excluded,
      };
    },
    [bookingLookup, classify, unitById],
  );

  const preflightForSelection = useCallback(() => preflightForKeys(checked), [checked, preflightForKeys]);

  // Just the count, for the selection bar's button label/disabled state — recomputed from
  // the same preflight so it can never disagree with what clicking the button actually does.
  const publishableSelected = useMemo(() => preflightForSelection().eligible.length, [preflightForSelection]);

  async function applyPublish(targets: PublishTarget[]) {
    if (!targets.length) return;
    setPending(true);
    const result = await publishBookings(targets);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.count === 0 || !result.batchId) {
      toast.info(result.message);
      return;
    }
    toast.success(result.message);
    pushUndo(result.batchId);
    router.refresh();
  }

  // Stage D1: if every selected booking is eligible, publish immediately — there's nothing
  // to explain, and adding a confirmation dialog to the common case would just be friction.
  // Only open the pre-flight when the selection actually contains an exception, which is
  // exactly the situation the old silent-skip behaviour used to hide.
  function publishSelected() {
    const { eligible, excluded } = preflightForSelection();
    if (excluded.length === 0) {
      void applyPublish(eligible).then(clearSelection);
      return;
    }
    setSelectedSheetKeys([...checked]);
  }

  async function confirmPublishSelected() {
    if (!selectedSheetKeys) return;
    // Re-run at click time, not from a stale closure — picks up anything resolved live while
    // the sheet was open.
    const { eligible } = preflightForKeys(selectedSheetKeys);
    setSelectedSheetKeys(null);
    await applyPublish(eligible);
    clearSelection();
  }

  async function confirmPublishRange(from: string, to: string) {
    setPublishRange(null);
    await applyPublish(preflightForRange(from, to).eligible);
  }

  // Reverts to TMS's current version rather than undoing step by step — see
  // lib/actions/discard-changes.ts for why this reuses undoBatch's snapshot restore
  // instead of soft-deleting. Deliberately NOT pushed onto the undo stack (docs/DECISIONS.md):
  // every event it produces is itself a normal, already-undoable booking_events row, but
  // grouping several batches into one Ctrl/Cmd+Z step is a follow-up, not part of this pass —
  // the confirmation dialog is the safety net here.
  async function applyDiscard(mode: "mine" | "everyone") {
    setPending(true);
    const result = await discardUnpublishedChanges({
      from: days[0]?.date ?? "",
      to: days[days.length - 1]?.date ?? "",
      companyId,
      modalityId: activeModalityId,
      mode,
    });
    setPending(false);
    setDiscardMode(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.rowCount === 0 && result.skipped === 0) {
      toast.info(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  // ── undo / redo — both call the same server action; redo is just "undo the undo" ──

  // Take the scheduler to what just got reverted. Ctrl+Z from anywhere in a ±1yr scroll is
  // otherwise a toast and nothing else — the booking snaps back somewhere off-screen and you
  // have to go and find it to check the undo did what you meant.
  //
  // Scrolls to the earliest date in the batch (leftmost unit to break a tie) so a multi-day
  // block is entered from its start, and flashes every reverted cell. Deliberately not
  // awaiting router.refresh(): `days`/`dateIdx` are a fixed range, so the row index is valid
  // regardless of whether fresh data has landed, and waiting would just delay the scroll.
  function goToReverted(targets: { unitId: number; date: string }[]) {
    if (!targets.length) return;
    const focus = targets.reduce((best, t) =>
      t.date < best.date || (t.date === best.date && (unitIdx.get(t.unitId) ?? 0) < (unitIdx.get(best.unitId) ?? 0))
        ? t
        : best,
    );
    goToCell(focus, targets.map((t) => cellKey(t.date, t.unitId)));
  }

  async function handleUndo() {
    if (!undoStack.length) {
      toast.info("Nothing to undo");
      return;
    }
    const batchId = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setPending(true);
    const result = await undoBatch(batchId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setRedoStack((s) => [...s, result.newBatchId]);
    router.refresh();
    goToReverted(result.targets);
  }

  async function handleRedo() {
    if (!redoStack.length) {
      toast.info("Nothing to redo");
      return;
    }
    const batchId = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setPending(true);
    const result = await undoBatch(batchId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message.replace("Undone", "Redone"));
    setUndoStack((s) => [...s, result.newBatchId]);
    router.refresh();
    goToReverted(result.targets);
  }

  // Pointer tracking for a live edge-resize. Registered on the window, and gated on whether a
  // gesture is running rather than on `resize` itself — the state object changes on every day
  // the edge crosses, and re-registering three listeners each time would be pure churn. The
  // handlers read everything they need through refs, so there's no stale closure to worry
  // about across the gesture.
  const resizing = resize !== null;
  useEffect(() => {
    if (!resizing) return;
    function onMove(e: PointerEvent) {
      resizePointerY.current = e.clientY;
      resizeProbeX.current = e.clientX;
      updateResize(e.clientY);
    }
    function onUp() {
      const st = endResize();
      if (st) void commitResize(st);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // Losing the pointer (the browser stealing it, a touch cancelled) abandons the gesture
    // rather than committing whatever the edge happened to be sitting on.
    window.addEventListener("pointercancel", endResize);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", endResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing]);

  // ── keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea";
      if (e.key === "Escape") {
        // The move dialog is *about* the selection, so backing out of it keeps the selection
        // intact — otherwise dismissing it would silently undo the multi-select the scheduler
        // just built, which is the expensive part to redo. Radix closes the dialog itself.
        if (moveDialogOpen) {
          setMoveDialogOpen(false);
          return;
        }
        // Same reasoning for the bulk booking sheet: it's *about* the selection, so backing
        // out of it must leave the selection intact — that's the expensive part to rebuild.
        if (bulkOpen) {
          setBulkOpen(false);
          return;
        }
        // Same again for the bulk edit sheet.
        if (bulkEditOpen) {
          setBulkEditOpen(false);
          return;
        }
        clearSelection();
        closeDrawer();
        endDrag();
        endResize();
        setConflict(null);
        setPublishRange(null);
        setSelectedSheetKeys(null);
        return;
      }
      if (typing || pending) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        void handleUndo();
      } else if ((mod && e.shiftKey && (e.key === "z" || e.key === "Z")) || (mod && (e.key === "y" || e.key === "Y"))) {
        e.preventDefault();
        void handleRedo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSelection, closeDrawer, endDrag, undoStack, redoStack, pending, moveDialogOpen, bulkOpen, bulkEditOpen]);

  // ── live updates (SPEC.md §1/§11: ~10s polling) ──
  // Skipped while a mutation is in flight or a drag is live, so a background refresh can't
  // race the in-progress write or yank the drag preview's data out from under it. Reads
  // `pending`/`drag` from refs (kept in sync below) rather than effect deps, so the
  // interval itself is set up once instead of restarting on every state change.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  // A live edge-resize counts as a drag here for the same reason: the run bounds and growth
  // walls were worked out at pointer-down from the data as it stood, and a refresh mid-gesture
  // would repaint the grid underneath a preview computed against the old rows.
  const dragActiveRef = useRef(false);
  dragActiveRef.current = !!drag || !!resize;
  useEffect(() => {
    const id = setInterval(() => {
      if (!pendingRef.current && !dragActiveRef.current) router.refresh();
    }, 10_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <StatusCatalogProvider statuses={statuses}>
    <GeneratorTagIdsProvider tagIds={generatorTagIds}>
    <TagCatalogProvider tags={tags}>
    <div className="flex h-full flex-col">
      <PlannerToolbar
        tmsFetchedAtIso={tmsFetchedAtIso}
        modalities={modalities}
        activeModalityId={activeModalityId}
        onModalityChange={changeModality}
        search={search}
        onSearchChange={setSearch}
        availableOnly={availableOnly}
        onToggleAvailableOnly={() => setAvailableOnly((v) => !v)}
        availableOnlyScoped={!!selectedDates}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        changesOnly={changesOnly}
        changeCount={changeSummary.total}
        onToggleChangesOnly={() =>
          setChangesOnly((v) => {
            const next = !v;
            if (next && nearestChangeDate) {
              const idx = dateIdx.get(nearestChangeDate);
              if (idx !== undefined) virtualizer.scrollToIndex(idx, { align: "center" });
            }
            return next;
          })
        }
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend((v) => !v)}
        onJumpToday={jumpToday}
        selectMode={selectMode}
        onToggleSelectMode={() => {
          setSelectMode((v) => !v);
          if (selectMode) clearSelection();
        }}
        canUndo={undoStack.length > 0 && !pending}
        canRedo={redoStack.length > 0 && !pending}
        onUndo={() => void handleUndo()}
        onRedo={() => void handleRedo()}
        canPublish={canPublish}
        onPublishUpcoming={() =>
          setPublishRange({ from: days[0]?.date ?? "", to: days[days.length - 1]?.date ?? "" })
        }
      />
      {changesOnly && (
        <ChangesBar
          summary={changeSummary}
          myTotal={myChangeSummary.total}
          canPublish={canPublish}
          canDiscardMine={canDiscardMine}
          canDiscardEveryone={canDiscardEveryone}
          // Same dialog as "Publish upcoming…", over the same range — the changes view is a
          // way of *reading* the range before publishing it, not a second publish path.
          onReviewPublish={() =>
            setPublishRange({ from: days[0]?.date ?? "", to: days[days.length - 1]?.date ?? "" })
          }
          onDiscardMine={() => setDiscardMode("mine")}
          onDiscardEveryone={() => setDiscardMode("everyone")}
          onExit={() => setChangesOnly(false)}
        />
      )}
      <SelectionBar
        bookingCount={selectedBookingKeys.length}
        emptyCount={selectedEmptySlots.length}
        editableCount={editableSelectedCount}
        bulkEditableCount={bulkEditTargets.length}
        publishableCount={publishableSelected}
        canPublish={canPublish}
        dragSummary={
          drag?.target
            ? { total: drag.keys.length, clashes: drag.clashes.length, oob: drag.oob, pastCount: drag.pastCount, valid: drag.valid }
            : null
        }
        onPublish={() => void publishSelected()}
        onBookEmpty={() => setBulkOpen(true)}
        onBulkEdit={() => setBulkEditOpen(true)}
        onClear={clearSelection}
      />
      {showLegend && <StatusLegend />}

      {/* overscroll-contain: reaching either end of this container must not chain the scroll
          up to the browser, where a horizontal trackpad swipe becomes back-navigation and
          drops the scheduler out of the planner mid-scroll. Belt-and-braces with the
          root-level rule in globals.css — this one states the intent where the scrolling
          actually happens. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white"
      >
        <div style={{ minWidth: "max-content" }}>
          <div
            className="sticky top-0 z-20 grid border-b-2 border-[#214b7f]"
            style={{ gridTemplateColumns, background: "#f7f9fc" }}
          >
            <div
              className="sticky left-0 z-30 border-r px-3.5 py-2.5"
              style={{ background: "#f7f9fc" }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#214b7f]">
                Date
              </div>
              <div className="mt-0.5 text-[10px] text-[#9a9a9a]">Units available</div>
            </div>
            {visibleUnits.map((u) => (
              <div key={u.id} title={u.description ?? undefined} className="px-2 py-2">
                <div className="text-[13px] font-bold text-[#333333]">{u.registration}</div>
                <div className="mt-0.5 line-clamp-2 h-6 text-[10px] leading-[12px] font-light text-[#9a9a9a]">
                  {u.description}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              if (bannerOffset && virtualRow.index === 0) {
                // The row itself spans the full grid width (all unit columns included) so the
                // grey bar reads as a proper row, same as every day row below it — but the
                // grid can run to 30+ unit columns wide, far past one screen. Centering the
                // clickable text in THAT full width, rather than pinning it to the visible
                // left edge the way the date column does, put it off-screen unless a scheduler
                // happened to have scrolled horizontally to the middle of the sheet — it read
                // as an unlabelled grey bar from anywhere else. `sticky left-0` is the same fix
                // the date column already relies on for the same reason.
                return (
                  <div
                    key="past-reveal-banner"
                    className="absolute top-0 left-0 w-full border-b"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: ROW_HEIGHT,
                      background: "#f7f9fc",
                      borderColor: "#e4e9f0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPastRevealed(true)}
                      title="Show every day before today, for audit or cross-reference"
                      className="sticky left-0 flex h-full cursor-pointer items-center gap-1.5 px-3.5 text-[13px] font-medium text-[#2b7bb9] transition-colors hover:bg-[#f0f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
                    >
                      ↑ Click to view previous bookings
                    </button>
                  </div>
                );
              }
              const day = renderDays[virtualRow.index - bannerOffset];
              const free = availabilityByDate.get(day.date) ?? 0;
              return (
                <div
                  key={day.date}
                  className="absolute top-0 left-0 grid w-full"
                  style={{
                    gridTemplateColumns,
                    transform: `translateY(${virtualRow.start}px)`,
                    height: ROW_HEIGHT,
                    background: day.isPast ? "#f3f4f6" : day.isWeekend ? "#fafbfd" : "#fff",
                    // Today outranks the Monday week-divider: the past/future boundary is the
                    // more important line to see while scrolling, and the two would otherwise
                    // collide on a Monday.
                    borderTop: day.isToday ? "2px solid #2b7bb9" : day.isMonday ? "2px solid #e4e9f0" : undefined,
                    borderBottom: "1px solid #f7f9fc",
                  }}
                >
                  <div
                    className="sticky left-0 z-10 flex flex-col justify-center border-r px-3.5"
                    style={{
                      background: day.isPast ? "#eef0f3" : day.isWeekend ? "#f1f3f7" : "#f7f9fc",
                      // NOT day.isToday here, deliberately — the row div above already draws
                      // its own 2px top border spanning the full row width, including behind
                      // this sticky column. Adding a second border-top on this child stacked
                      // it directly beneath the row's, doubling the visible line's thickness
                      // over the date column specifically (the one place both elements'
                      // borders render). The Monday divider still does this (kept, unrequested
                      // scope), which is why it uses a deliberately different, darker colour —
                      // the flat "#2b7bb9" for Today made the doubled strip obvious instead.
                      borderTop: day.isMonday ? "2px solid #cdd6e2" : undefined,
                    }}
                  >
                    {/* Absolutely positioned rather than a fourth item in the flex row below:
                        that row is already tight at DATE_COL_WIDTH (190px) with the date, day
                        name and year on it, and "TODAY" pushed it over — the date text wrapped
                        onto a second line and covered the availability bar underneath it. */}
                    {day.isToday && (
                      <span className="absolute top-1.5 right-2.5 text-[9px] font-bold text-[#2b7bb9] uppercase">
                        Today
                      </span>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: day.isPast ? "#9aa1ad" : day.isWeekend ? "#6a7488" : "#333333" }}
                      >
                        {fmtDate(day.date)}
                      </span>
                      <span className="text-[11px] text-[#9a9a9a]">{DOW_FULL[day.dow]}</span>
                      {/* `days` now spans a full ±1yr planning window (app/(planner)/page.tsx),
                          so scrolling from e.g. "5 Mar" to another "5 Mar" a year later reads
                          as if nothing moved — the year has to be on every row, not just at a
                          boundary, since a scroll can land anywhere in the range. */}
                      <span className="text-[11px] text-[#c2c7d1] tabular-nums">{day.date.slice(0, 4)}</span>
                    </div>
                    <div className="mt-1">
                      <AvailabilityBar free={free} total={units.length} />
                    </div>
                  </div>
                  {visibleUnits.map((u) => {
                    const booking = bookingLookup.get(cellKey(day.date, u.id)) ?? null;
                    const k = cellKey(day.date, u.id);
                    // Where TMS still has a booking we've changed. Only ever in an otherwise
                    // empty cell — the overlay guarantees a ghost and a real booking never
                    // share a slot.
                    const ghost = booking ? null : (ghostLookup.get(k) ?? null);
                    // A MOVED ghost renders as Dave's faded original with the jump link. A
                    // CLEARED one does not: that slot is genuinely free now (the availability
                    // bar counts it free, and the database will accept a booking there), so
                    // rendering it as an occupied-looking chip both misreports capacity at a
                    // glance and blocks the click that would book it. It renders as an
                    // available cell carrying a small "pending removal" mark instead — free
                    // and bookable, but still visibly disagreeing with TMS. See
                    // docs/CELL_STATES.md.
                    const movedGhost = ghost?.ghostReason === "moved" ? ghost : null;
                    const pendingRemoval = ghost?.ghostReason === "cleared" ? ghost : null;
                    // Does publishing change anything here? A cleared slot counts — the ghost
                    // is the only thing on screen for it — which is why this consults the
                    // ghost when there's no booking. A MOVED ghost renders through GhostChip,
                    // which takes no `dimmed` prop at all, so it stays lit either way: the
                    // slot a move freed up is part of what the changes view is showing.
                    const changeCell = booking ?? ghost;
                    const isChange = changeCell ? changeKindFor(changeCell) !== null : false;
                    const dimmed =
                      (!!statusFilter && booking?.status !== statusFilter) || (changesOnly && !isChange);
                    // Handles only on the outermost days of an unpublished, non-past run — see runEdges.
                    const edges = booking && !booking.publishedAt && !day.isPast ? runEdges.get(k) : null;
                    const warning = booking
                      ? computeCapabilityWarnings(
                          siteCapabilityRequirements[booking.siteId] ?? [],
                          unitSpecs[u.id] ?? {},
                          u.registration,
                          booking.siteName,
                        ).length > 0
                      : false;
                    return (
                      <div
                        key={u.id}
                        // data-* is how the resize gesture finds the day under the pointer
                        // (see dayIdxAtPoint) — cheaper and far more robust than reproducing
                        // the virtualiser's row maths plus two sticky offsets in arithmetic.
                        data-cell-date={day.date}
                        data-cell-unit={u.id}
                        className="group relative flex items-center px-[3px]"
                        onDragOver={(e) => onCellDragOver(e, day, u)}
                        onDrop={(e) => onCellDrop(e, day, u)}
                      >
                        {edges && !drag && (
                          <>
                            {edges.top && (
                              <ResizeHandle edge="top" onStart={(e) => beginResize(e, day, u, "top")} />
                            )}
                            {edges.bottom && (
                              <ResizeHandle edge="bottom" onStart={(e) => beginResize(e, day, u, "bottom")} />
                            )}
                          </>
                        )}
                        {movedGhost ? (
                          <GhostChip
                            booking={movedGhost}
                            onOpen={() => openCell(day, u)}
                            toLabel={
                              movedGhost.movedTo
                                ? `${unitById.get(movedGhost.movedTo.unitId)?.registration ?? "another unit"} · ${fmtDate(movedGhost.movedTo.date)}`
                                : null
                            }
                            onGoTo={movedGhost.movedTo ? () => goToCell(movedGhost.movedTo!) : undefined}
                            preview={drag?.preview.get(k) ?? null}
                          />
                        ) : (
                        (() => {
                          const chip = (
                            <CellChip
                              booking={booking}
                              dimmed={dimmed}
                              warning={warning}
                              checked={checked.has(k)}
                              isOpen={drawerTarget?.unitId === u.id && drawerTarget?.date === day.date}
                              draggable={!!booking}
                              isPast={day.isPast}
                              preview={drag?.preview.get(k) ?? resizePreview.get(k) ?? null}
                              flash={flashKeys.has(k)}
                              pendingRemoval={pendingRemoval?.siteName ?? null}
                              onClick={(e) => handleCellClick(e, day, u, booking)}
                              onDragStart={(e) => startDrag(e, day, u)}
                              onDragEnd={endDrag}
                            />
                          );
                          // A free cell that's part of the current multi-selection gets the
                          // same "Book N days" the blue SelectionBar offers, so the bulk
                          // action is reachable without moving the pointer up to the bar. An
                          // unselected free cell falls through to the browser's default menu.
                          if (!booking) {
                            if (checked.has(k) && selectedEmptySlots.length > 0) {
                              return (
                                <EmptySlotContextMenu
                                  count={selectedEmptySlots.length}
                                  onBook={() => setBulkOpen(true)}
                                >
                                  {chip}
                                </EmptySlotContextMenu>
                              );
                            }
                            return chip;
                          }
                          // Only booked, unpublished, non-past cells get the move menu — same
                          // rule that already gates dragging (published bookings are locked
                          // until an admin unlocks them; past bookings can't move at all).
                          if (booking.publishedAt || day.isPast) return chip;
                          const tmsReturnLabel = booking.movedFrom
                            ? `${unitById.get(booking.movedFrom.unitId)?.registration ?? "?"} · ${fmtDate(booking.movedFrom.date)}`
                            : null;
                          return (
                            <CellMoveMenu
                              day={day}
                              unit={u}
                              cellKey={k}
                              selectedBookings={selectedBookingSet}
                              visibleUnits={visibleUnits}
                              computePreview={computePreview}
                              onMove={(targetUnitId) => moveCellToUnit(day, u, targetUnitId)}
                              onOpenMoveDialog={() => setMoveDialogOpen(true)}
                              onOpenBulkEdit={() => setBulkEditOpen(true)}
                              onSwapSelected={() => void handleSwapSelected()}
                              onReturnToTms={() => returnToTms(day, u)}
                              tmsReturnLabel={tmsReturnLabel}
                            >
                              {chip}
                            </CellMoveMenu>
                          );
                        })()
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BookingDrawer
        companyId={companyId}
        target={drawerTarget}
        booking={drawerBooking}
        ghost={drawerGhost}
        ghostMovedToLabel={
          drawerGhost?.movedTo
            ? `${unitById.get(drawerGhost.movedTo.unitId)?.registration ?? "another unit"} · ${fmtDate(drawerGhost.movedTo.date)}`
            : null
        }
        onGoToGhost={drawerGhost?.movedTo ? () => { const to = drawerGhost.movedTo!; closeDrawer(); goToCell(to); } : undefined}
        unitSpecs={unitSpecs}
        siteCapabilityRequirements={siteCapabilityRequirements}
        canUnlock={canUnlock}
        bookedSiteIds={bookedSiteIds}
        onClose={closeDrawer}
        onMutated={pushUndo}
      />

      <BulkBookingDrawer
        open={bulkOpen && selectedEmptySlots.length > 0}
        companyId={companyId}
        modalityId={activeModalityId}
        slots={selectedEmptySlots}
        unitLabels={unitById}
        unitSpecs={unitSpecs}
        siteCapabilityRequirements={siteCapabilityRequirements}
        onClose={() => setBulkOpen(false)}
        onMutated={pushUndo}
      />

      <BulkEditDrawer
        open={bulkEditOpen && bulkEditTargets.length > 0}
        companyId={companyId}
        targets={bulkEditTargets}
        lockedCount={bulkEditLockedCount}
        pastCount={bulkEditPastCount}
        onClose={() => setBulkEditOpen(false)}
        onMutated={pushUndo}
      />

      <ClashDialog clashes={conflict?.clashes ?? null} onResolve={(c) => void resolveConflict(c)} />

      <MoveSelectedDialog
        open={moveDialogOpen}
        rows={moveRows}
        units={units}
        isOccupied={(date, unitId) => bookingLookup.has(cellKey(date, unitId))}
        onConfirm={(assignments) => {
          setMoveDialogOpen(false);
          attemptExplicitMoves(assignments);
        }}
        onClose={() => setMoveDialogOpen(false)}
      />

      <PublishRangeDialog
        open={!!publishRange}
        days={days}
        defaultFrom={publishRange?.from ?? days[0]?.date ?? ""}
        defaultTo={publishRange?.to ?? days[days.length - 1]?.date ?? ""}
        preflight={preflightForRange}
        onConfirm={(from, to) => void confirmPublishRange(from, to)}
        onClose={() => setPublishRange(null)}
        onJumpToCell={(t) => goToCell(t)}
      />

      <PublishSelectedDialog
        open={selectedSheetKeys !== null}
        preflight={() => preflightForKeys(selectedSheetKeys ?? [])}
        onConfirm={() => void confirmPublishSelected()}
        onClose={() => setSelectedSheetKeys(null)}
        onJumpToCell={(t) => goToCell(t)}
      />

      <DiscardChangesDialog
        open={discardMode !== null}
        mode={discardMode ?? "mine"}
        summary={discardMode === "everyone" ? changeSummary : myChangeSummary}
        pending={pending}
        onConfirm={() => void applyDiscard(discardMode ?? "mine")}
        onClose={() => setDiscardMode(null)}
      />
    </div>
    </TagCatalogProvider>
    </GeneratorTagIdsProvider>
    </StatusCatalogProvider>
  );
}
