"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import type { DayInfo } from "@/lib/dates";
import { fmtDate, DOW_FULL, todayIso } from "@/lib/dates";
import type { OverlayBooking } from "@/lib/db/tms/overlay";
import type { StatusView } from "@/lib/statuses";
import { StatusCatalogProvider } from "./status-context";
import { computeCapabilityWarnings } from "@/lib/capability-matching";
import { moveBookings, type MoveMode, type MoveSpec } from "@/lib/actions/booking-moves";
import { undoBatch } from "@/lib/actions/undo";
import { publishBookings, type PublishTarget } from "@/lib/actions/publish";
import { discardUnpublishedChanges } from "@/lib/actions/discard-changes";
import { classifyForPublish } from "@/lib/publish-eligibility";
import { changeKindFor, summariseChanges, type ChangeSummary } from "@/lib/planner-changes";
import type { Role } from "@/lib/db/schema";
import { AvailabilityBar } from "./availability-bar";
import { CellChip, GhostChip } from "./cell-chip";
import { CellMoveMenu } from "./cell-context-menu";
import { MoveSelectedDialog, type MoveRow } from "./move-selected-dialog";
import { PlannerToolbar } from "./toolbar";
import { StatusLegend } from "./status-legend";
import { SelectionBar } from "./selection-bar";
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

type Unit = { id: number; registration: string; description: string | null; displayOrder: number };
type CapabilityRequirement = { requirementKey: string; required: boolean };
const cellKey = (date: string, unitId: number) => `${date}|${unitId}`;

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
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<{ date: string; unitId: number } | null>(null);
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const [conflict, setConflict] = useState<{ moves: MoveSpec[]; clashes: Clash[] } | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [publishRange, setPublishRange] = useState<{ from: string; to: string } | null>(null);
  const [discardMode, setDiscardMode] = useState<"mine" | "everyone" | null>(null);
  const [selectedPreflight, setSelectedPreflight] = useState<{
    eligible: PublishTarget[];
    eligibleSummary: ChangeSummary;
    excluded: PublishExclusion[];
  } | null>(null);
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

  // Transient highlight on the cell we just jumped to from a ghost, so the eye lands on it
  // rather than on "some row scrolled past". Cleared on a timer, and on unmount.
  const [flashKey, setFlashKey] = useState<string | null>(null);
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: days.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const jumpToday = () => {
    const idx = days.findIndex((d) => d.date === todayIso());
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: "center" });
  };

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

  const rangeCheck = useCallback(
    (date: string, unitId: number) => {
      if (!anchor || anchor.unitId !== unitId) return toggleCheck(date, unitId);
      const a = dateIdx.get(anchor.date)!;
      const b = dateIdx.get(date)!;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      setChecked((prev) => {
        const next = new Set(prev);
        for (let i = lo; i <= hi; i++) {
          const d = days[i].date;
          const c = bookingLookup.get(cellKey(d, unitId));
          if (c && !c.publishedAt) next.add(cellKey(d, unitId));
        }
        return next;
      });
    },
    [anchor, dateIdx, days, bookingLookup, toggleCheck],
  );

  const clearSelection = useCallback(() => {
    setChecked(new Set());
    setAnchor(null);
  }, []);

  const openCell = useCallback(
    (day: DayInfo, unit: Unit) =>
      setDrawerTarget({
        unitId: unit.id,
        unitRegistration: unit.registration,
        date: day.date,
        unitDescription: unit.description,
        modalityId: activeModalityId,
      }),
    [activeModalityId],
  );

  const handleCellClick = (e: React.MouseEvent, day: DayInfo, unit: Unit, booking: OverlayBooking | null) => {
    if (booking?.publishedAt) return openCell(day, unit);
    const k = cellKey(day.date, unit.id);
    if (booking && checked.has(k)) return toggleCheck(day.date, unit.id);
    if (e.shiftKey && booking) return rangeCheck(day.date, unit.id);
    if ((e.ctrlKey || e.metaKey || selectMode) && booking) return toggleCheck(day.date, unit.id);
    openCell(day, unit);
  };

  // ── drag and drop ──
  const startDrag = (e: React.DragEvent, day: DayInfo, unit: Unit) => {
    const k = cellKey(day.date, unit.id);
    let set = checked;
    if (!checked.has(k)) {
      set = new Set([k]);
      setChecked(set);
    }
    const origin = { date: day.date, unitId: unit.id };
    dragRef.current = { origin, keys: [...set] };
    setDrag({ origin, keys: [...set], single: false, preview: new Map(), valid: false, moves: [], clashes: [], oob: false, dDelta: 0, uDelta: 0 });
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
        const occupant = bookingLookup.get(tKey);
        const occupied = !!occupant && !moving.has(tKey);
        preview.set(tKey, occupied ? "bad" : "ok");
        if (occupied && occupant) {
          clashes.push({ unitLabel: units[ui].registration, date: tDate, siteName: occupant.siteName, status: occupant.status });
        }
        moves.push({ fromUnitId: srcUnit, fromDate: srcDate, toUnitId: tUnit, toDate: tDate });
      }
      const valid = !oob && clashes.length === 0;
      return { preview, valid, moves, clashes, oob, dDelta, uDelta };
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
    const keys = checked.has(k) ? [...checked] : [k];
    attemptMove({ origin: { date: day.date, unitId: unit.id }, keys }, day.date, targetUnitId);
  }

  // The current selection, as dialog rows. Ghosts and published bookings can't be selected in
  // the first place (bookingLookup excludes ghosts; handleCellClick opens rather than checks a
  // locked cell), so anything in `checked` with a booking behind it is movable.
  const moveRows: MoveRow[] = useMemo(() => {
    const rows: MoveRow[] = [];
    for (const k of checked) {
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
  }, [checked, bookingLookup, unitById]);

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
    if (checked.size !== 2) return;
    const [keyA, keyB] = [...checked];
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

  // ── ghost navigation (Stage C1) ──
  // Jump from a ghost to where its booking actually sits now. Two axes to handle: rows are
  // virtualised (so scrollIntoView on a DOM node is useless — the target row may not be
  // mounted), and unit columns scroll horizontally behind a sticky date column.
  const goToMoved = useCallback(
    (to: { unitId: number; date: string }) => {
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

        setFlashKey(cellKey(to.date, to.unitId));
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlashKey(null), 2000);
      };

      // Clearing the search has to paint before the column index means anything.
      if (hidden) requestAnimationFrame(() => requestAnimationFrame(run));
      else run();
    },
    [dateIdx, virtualizer, visibleUnits, units],
  );

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
    (b: OverlayBooking) => classifyForPublish({ ...b, tmsCollision: !!b.tmsCollision }, publishableKeys),
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
        else excluded.push({ key: cellKey(b.date, b.unitId), label: `${unitById.get(b.unitId)?.registration ?? "?"} · ${fmtDate(b.date)}`, siteName: b.siteName, reason: result.reason });
      }
      return {
        eligible: eligibleBookings.map((b) => ({ unitId: b.unitId, date: b.date })),
        eligibleSummary: summariseChanges(eligibleBookings),
        excluded,
      };
    },
    [bookings, classify, unitById],
  );

  // Same split, but over the current multi-select rather than a date range. Unlike the range
  // sweep, an untouched TMS booking reached this way was chosen deliberately — a scheduler
  // ctrl-clicked it — so it's reported rather than silently dropped, just with a calm reason
  // ("already matches TMS") rather than the alarming "needs attention" ones.
  const preflightForSelection = useCallback(() => {
    const eligibleBookings: OverlayBooking[] = [];
    const excluded: PublishExclusion[] = [];
    for (const k of checked) {
      const b = bookingLookup.get(k);
      if (!b || b.publishedAt) continue;
      if (b.origin === "tms") {
        excluded.push({ key: k, label: `${unitById.get(b.unitId)?.registration ?? "?"} · ${fmtDate(b.date)}`, siteName: b.siteName, reason: "not-a-planner-change" });
        continue;
      }
      const result = classify(b);
      if (result.eligible) eligibleBookings.push(b);
      else excluded.push({ key: k, label: `${unitById.get(b.unitId)?.registration ?? "?"} · ${fmtDate(b.date)}`, siteName: b.siteName, reason: result.reason });
    }
    return {
      eligible: eligibleBookings.map((b) => ({ unitId: b.unitId, date: b.date })),
      eligibleSummary: summariseChanges(eligibleBookings),
      excluded,
    };
  }, [checked, bookingLookup, classify, unitById]);

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
    const { eligible, eligibleSummary, excluded } = preflightForSelection();
    if (excluded.length === 0) {
      void applyPublish(eligible).then(clearSelection);
      return;
    }
    setSelectedPreflight({ eligible, eligibleSummary, excluded });
  }

  async function confirmPublishSelected() {
    if (!selectedPreflight) return;
    const targets = selectedPreflight.eligible;
    setSelectedPreflight(null);
    await applyPublish(targets);
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
  }

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
        clearSelection();
        setDrawerTarget(null);
        endDrag();
        setConflict(null);
        setPublishRange(null);
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
  }, [clearSelection, endDrag, undoStack, redoStack, pending, moveDialogOpen]);

  // ── live updates (SPEC.md §1/§11: ~10s polling) ──
  // Skipped while a mutation is in flight or a drag is live, so a background refresh can't
  // race the in-progress write or yank the drag preview's data out from under it. Reads
  // `pending`/`drag` from refs (kept in sync below) rather than effect deps, so the
  // interval itself is set up once instead of restarting on every state change.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const dragActiveRef = useRef(false);
  dragActiveRef.current = !!drag;
  useEffect(() => {
    const id = setInterval(() => {
      if (!pendingRef.current && !dragActiveRef.current) router.refresh();
    }, 10_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <StatusCatalogProvider statuses={statuses}>
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
        onToggleChangesOnly={() => setChangesOnly((v) => !v)}
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
        count={checked.size}
        publishableCount={publishableSelected}
        canPublish={canPublish}
        onPublish={() => void publishSelected()}
        onClear={clearSelection}
      />
      {showLegend && <StatusLegend />}

      {/* overscroll-contain: reaching either end of this container must not chain the scroll
          up to the browser, where a horizontal trackpad swipe becomes back-navigation and
          drops the scheduler out of the planner mid-scroll. Belt-and-braces with the
          root-level rule in globals.css — this one states the intent where the scrolling
          actually happens. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white">
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
              const day = days[virtualRow.index];
              const free = availabilityByDate.get(day.date) ?? 0;
              return (
                <div
                  key={day.date}
                  className="absolute top-0 left-0 grid w-full"
                  style={{
                    gridTemplateColumns,
                    transform: `translateY(${virtualRow.start}px)`,
                    height: ROW_HEIGHT,
                    background: day.isWeekend ? "#fafbfd" : "#fff",
                    borderTop: day.isMonday ? "2px solid #e4e9f0" : undefined,
                    borderBottom: "1px solid #f7f9fc",
                  }}
                >
                  <div
                    className="sticky left-0 z-10 flex flex-col justify-center border-r px-3.5"
                    style={{
                      background: day.isWeekend ? "#f1f3f7" : "#f7f9fc",
                      borderTop: day.isMonday ? "2px solid #cdd6e2" : undefined,
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: day.isWeekend ? "#6a7488" : "#333333" }}
                      >
                        {fmtDate(day.date)}
                      </span>
                      <span className="text-[11px] text-[#9a9a9a]">{DOW_FULL[day.dow]}</span>
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
                        className="flex items-center px-[3px]"
                        onDragOver={(e) => onCellDragOver(e, day, u)}
                        onDrop={(e) => onCellDrop(e, day, u)}
                      >
                        {movedGhost ? (
                          <GhostChip
                            booking={movedGhost}
                            onOpen={() => openCell(day, u)}
                            toLabel={
                              movedGhost.movedTo
                                ? `${unitById.get(movedGhost.movedTo.unitId)?.registration ?? "another unit"} · ${fmtDate(movedGhost.movedTo.date)}`
                                : null
                            }
                            onGoTo={movedGhost.movedTo ? () => goToMoved(movedGhost.movedTo!) : undefined}
                          />
                        ) : (
                        (() => {
                          const chip = (
                            <CellChip
                              booking={booking}
                              dimmed={dimmed}
                              warning={warning}
                              checked={booking ? checked.has(k) : false}
                              isOpen={drawerTarget?.unitId === u.id && drawerTarget?.date === day.date}
                              draggable={!!booking}
                              preview={drag?.preview.get(k) ?? null}
                              flash={flashKey === k}
                              pendingRemoval={pendingRemoval?.siteName ?? null}
                              onClick={(e) => handleCellClick(e, day, u, booking)}
                              onDragStart={(e) => startDrag(e, day, u)}
                              onDragEnd={endDrag}
                            />
                          );
                          // Only booked, unpublished cells get the menu — same rule that
                          // already gates dragging (published bookings are locked until an
                          // admin unlocks them).
                          if (!booking || booking.publishedAt) return chip;
                          return (
                            <CellMoveMenu
                              day={day}
                              unit={u}
                              cellKey={k}
                              checked={checked}
                              visibleUnits={visibleUnits}
                              computePreview={computePreview}
                              onMove={(targetUnitId) => moveCellToUnit(day, u, targetUnitId)}
                              onOpenMoveDialog={() => setMoveDialogOpen(true)}
                              onSwapSelected={() => void handleSwapSelected()}
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
        onGoToGhost={drawerGhost?.movedTo ? () => { const to = drawerGhost.movedTo!; setDrawerTarget(null); goToMoved(to); } : undefined}
        unitSpecs={unitSpecs}
        siteCapabilityRequirements={siteCapabilityRequirements}
        canUnlock={canUnlock}
        onClose={() => setDrawerTarget(null)}
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
      />

      <PublishSelectedDialog
        open={!!selectedPreflight}
        eligibleSummary={selectedPreflight?.eligibleSummary ?? { total: 0, breakdown: [] }}
        excluded={selectedPreflight?.excluded ?? []}
        onConfirm={() => void confirmPublishSelected()}
        onClose={() => setSelectedPreflight(null)}
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
    </StatusCatalogProvider>
  );
}
