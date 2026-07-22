"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import type { DayInfo } from "@/lib/dates";
import { fmtDate, DOW_FULL, todayIso } from "@/lib/dates";
import type { GridBooking } from "@/lib/db/queries";
import type { Status } from "@/lib/db/schema";
import { computeCapabilityWarnings } from "@/lib/capability-matching";
import { moveBookings, type MoveMode, type MoveSpec } from "@/lib/actions/booking-moves";
import { undoBatch } from "@/lib/actions/undo";
import { AvailabilityBar } from "./availability-bar";
import { CellChip } from "./cell-chip";
import { PlannerToolbar } from "./toolbar";
import { StatusLegend } from "./status-legend";
import { SelectionBar } from "./selection-bar";
import { ClashDialog, type Clash } from "./clash-dialog";
import { BookingDrawer, type DrawerTarget } from "./booking-drawer";

const DATE_COL_WIDTH = 190;
const UNIT_COL_WIDTH = 132;
const ROW_HEIGHT = 54;

type Unit = { id: string; description: string | null; displayOrder: number };
type CapabilityRequirement = { requirementKey: string; required: boolean };
const cellKey = (date: string, unitId: string) => `${date}|${unitId}`;

type DragPreview = {
  origin: { date: string; unitId: string };
  keys: string[];
  target?: string;
  preview: Map<string, "ok" | "bad">;
  valid: boolean;
  moves: MoveSpec[];
  clashes: Clash[];
  oob: boolean;
  dDelta: number;
  uDelta: number;
};

export function PlannerGrid({
  modalities,
  activeModalityId,
  units,
  days,
  bookings,
  unitSpecs,
  siteCapabilityRequirements,
}: {
  modalities: { id: number; name: string }[];
  activeModalityId: number;
  units: Unit[];
  days: DayInfo[];
  bookings: GridBooking[];
  unitSpecs: Record<string, Record<string, string>>;
  siteCapabilityRequirements: Record<number, CapabilityRequirement[]>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);
  // Only one modality has data today — switching is wired for when a 2nd one lands
  // (SPEC.md §2d), not a functional re-fetch yet.
  const [modalityId, setModalityId] = useState(activeModalityId);

  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<{ date: string; unitId: string } | null>(null);
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const [conflict, setConflict] = useState<{ moves: MoveSpec[]; clashes: Clash[] } | null>(null);
  const [pending, setPending] = useState(false);
  const dragRef = useRef<{ origin: { date: string; unitId: string }; keys: string[] } | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const bookingLookup = useMemo(() => {
    const map = new Map<string, GridBooking>();
    for (const b of bookings) map.set(cellKey(b.date, b.unitId), b);
    return map;
  }, [bookings]);

  const sitesByUnit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const b of bookings) {
      const set = map.get(b.unitId) ?? new Set<string>();
      set.add(b.siteName.toLowerCase());
      map.set(b.unitId, set);
    }
    return map;
  }, [bookings]);

  const visibleUnits = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units.filter((u) => {
      if (u.id.toLowerCase().includes(q)) return true;
      if ((u.description ?? "").toLowerCase().includes(q)) return true;
      const unitSites = sitesByUnit.get(u.id);
      if (!unitSites) return false;
      for (const s of unitSites) if (s.includes(q)) return true;
      return false;
    });
  }, [search, units, sitesByUnit]);

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
    const m = new Map<string, number>();
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

  const drawerBooking = drawerTarget
    ? (bookingLookup.get(cellKey(drawerTarget.date, drawerTarget.unitId)) ?? null)
    : null;

  // ── selection ──
  const toggleCheck = useCallback((date: string, unitId: string) => {
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
    (date: string, unitId: string) => {
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

  const handleCellClick = (e: React.MouseEvent, day: DayInfo, unit: Unit, booking: GridBooking | null) => {
    if (booking?.publishedAt) {
      setDrawerTarget({ unitId: unit.id, date: day.date, unitDescription: unit.description });
      return;
    }
    const k = cellKey(day.date, unit.id);
    if (booking && checked.has(k)) return toggleCheck(day.date, unit.id);
    if (e.shiftKey && booking) return rangeCheck(day.date, unit.id);
    if ((e.ctrlKey || e.metaKey || selectMode) && booking) return toggleCheck(day.date, unit.id);
    setDrawerTarget({ unitId: unit.id, date: day.date, unitDescription: unit.description });
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
    setDrag({ origin, keys: [...set], preview: new Map(), valid: false, moves: [], clashes: [], oob: false, dDelta: 0, uDelta: 0 });
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", "quest-move");
    } catch {
      /* Safari can throw for unsupported MIME types — the drag still works without it */
    }
  };

  const computePreview = useCallback(
    (targetDate: string, targetUnitId: string) => {
      const st = dragRef.current;
      if (!st) return null;
      const dDelta = dateIdx.get(targetDate)! - dateIdx.get(st.origin.date)!;
      const uDelta = unitIdx.get(targetUnitId)! - unitIdx.get(st.origin.unitId)!;
      const moving = new Set(st.keys);
      const preview = new Map<string, "ok" | "bad">();
      const moves: MoveSpec[] = [];
      const clashes: Clash[] = [];
      let oob = false;
      for (const k of st.keys) {
        const [srcDate, srcUnit] = k.split("|");
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
          clashes.push({ unitId: tUnit, date: tDate, siteName: occupant.siteName, status: occupant.status });
        }
        moves.push({ fromUnitId: srcUnit, fromDate: srcDate, toUnitId: tUnit, toDate: tDate });
      }
      const valid = !oob && clashes.length === 0;
      return { preview, valid, moves, clashes, oob, dDelta, uDelta };
    },
    [dateIdx, unitIdx, days, units, bookingLookup],
  );

  const onCellDragOver = (e: React.DragEvent, day: DayInfo, unit: Unit) => {
    const active = dragRef.current;
    if (!active) return;
    e.preventDefault();
    const res = computePreview(day.date, unit.id);
    if (!res) return;
    e.dataTransfer.dropEffect = res.valid ? "move" : "none";
    const tKey = cellKey(day.date, unit.id);
    // Capture the ref's value now, synchronously — the updater below can run after a
    // later event (e.g. drop) has already nulled dragRef.current via endDrag().
    const { origin, keys } = active;
    setDrag((prev) => {
      if (prev && prev.target === tKey) return prev;
      return { origin, keys, target: tKey, ...res };
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
    clearSelection();
  }

  const onCellDrop = (e: React.DragEvent, day: DayInfo, unit: Unit) => {
    e.preventDefault();
    const res = computePreview(day.date, unit.id);
    endDrag();
    if (!res || (res.dDelta === 0 && res.uDelta === 0)) return;
    if (res.oob) {
      toast.error("Can't move there — part of the selection would fall outside the planner range");
      return;
    }
    if (res.clashes.length > 0) {
      setConflict({ moves: res.moves, clashes: res.clashes });
      return;
    }
    void applyMove(res.moves, "move");
  };

  async function resolveConflict(choice: "swap" | "overwrite" | "cancel") {
    if (!conflict) return;
    if (choice === "cancel") {
      setConflict(null);
      return;
    }
    await applyMove(conflict.moves, choice);
    setConflict(null);
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
        clearSelection();
        setDrawerTarget(null);
        endDrag();
        setConflict(null);
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
  }, [clearSelection, endDrag, undoStack, redoStack, pending]);

  return (
    <div className="flex h-full flex-col">
      <PlannerToolbar
        modalities={modalities}
        activeModalityId={modalityId}
        onModalityChange={setModalityId}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
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
      />
      <SelectionBar count={checked.size} onClear={clearSelection} />
      {showLegend && <StatusLegend />}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-white">
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
                <div className="text-[13px] font-bold text-[#333333]">{u.id}</div>
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
                    const dimmed = !!statusFilter && booking?.status !== statusFilter;
                    const warning = booking
                      ? computeCapabilityWarnings(
                          siteCapabilityRequirements[booking.siteId] ?? [],
                          unitSpecs[u.id] ?? {},
                          u.id,
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
                        <CellChip
                          booking={booking}
                          dimmed={dimmed}
                          warning={warning}
                          checked={booking ? checked.has(k) : false}
                          isOpen={drawerTarget?.unitId === u.id && drawerTarget?.date === day.date}
                          draggable={!!booking}
                          preview={drag?.preview.get(k) ?? null}
                          onClick={(e) => handleCellClick(e, day, u, booking)}
                          onDragStart={(e) => startDrag(e, day, u)}
                          onDragEnd={endDrag}
                        />
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
        target={drawerTarget}
        booking={drawerBooking}
        unitSpecs={unitSpecs}
        siteCapabilityRequirements={siteCapabilityRequirements}
        onClose={() => setDrawerTarget(null)}
        onMutated={pushUndo}
      />

      <ClashDialog clashes={conflict?.clashes ?? null} onResolve={(c) => void resolveConflict(c)} />
    </div>
  );
}
