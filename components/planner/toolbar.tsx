"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStatusCatalog } from "./status-context";
import { TmsFreshness } from "./tms-freshness";

function Pill({
  active,
  onClick,
  children,
  dot,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
      style={{
        borderColor: active ? "#2b7bb9" : "#e6e6e6",
        background: active ? "#2b7bb9" : "#fff",
        color: active ? "#fff" : "#333333",
      }}
    >
      {dot && (
        <span
          className="h-[9px] w-[9px] shrink-0 rounded-full"
          style={{ background: active ? "#fff" : dot }}
        />
      )}
      {children}
    </button>
  );
}

export function PlannerToolbar({
  tmsFetchedAtIso,
  modalities,
  activeModalityId,
  onModalityChange,
  search,
  onSearchChange,
  availableOnly,
  onToggleAvailableOnly,
  availableOnlyScoped,
  statusFilter,
  onStatusFilterChange,
  changesOnly,
  changeCount,
  onToggleChangesOnly,
  showLegend,
  onToggleLegend,
  onJumpToday,
  selectMode,
  onToggleSelectMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canPublish,
  onPublishUpcoming,
}: {
  tmsFetchedAtIso: string;
  modalities: { id: number; name: string }[];
  activeModalityId: number;
  onModalityChange: (id: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
  availableOnly: boolean;
  onToggleAvailableOnly: () => void;
  /** True when the filter is scoped to the current multi-select rather than the whole loaded range. */
  availableOnlyScoped: boolean;
  statusFilter: string | null;
  onStatusFilterChange: (s: string | null) => void;
  changesOnly: boolean;
  /** Unpublished changes in the loaded date range — the pill carries the count at rest. */
  changeCount: number;
  onToggleChangesOnly: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  onJumpToday: () => void;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canPublish: boolean;
  onPublishUpcoming: () => void;
}) {
  // Filter pills for the active, user-pickable statuses — the calendar-derived ones
  // (weekend/bankholiday) aren't things a scheduler filters to.
  const filterStatuses = useStatusCatalog().all.filter((s) => s.editable && s.active);
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5 border-b bg-white px-6 py-3">
      <div className="inline-flex gap-1">
        {modalities.map((m) => (
          <Pill key={m.id} active={m.id === activeModalityId} onClick={() => onModalityChange(m.id)}>
            {m.name}
          </Pill>
        ))}
      </div>
      <span className="h-6 w-px bg-[#e6e6e6]" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search units or sites…"
        className="h-8 w-[200px]"
      />
      {/* Hides fully-booked unit columns, same mechanism as the search box above (shrinks
          the grid's columns) rather than the status pills below (which dim in place) —
          useful when redistributing a block off a unit that's gone down, so the client
          isn't scrolling past columns with no room left. */}
      <Pill
        active={availableOnly}
        onClick={onToggleAvailableOnly}
        title={
          availableOnlyScoped
            ? "Hide unit columns with no room on any of the selected dates"
            : "Hide unit columns that are fully booked across the loaded date range"
        }
      >
        Available units
      </Pill>
      <span className="h-6 w-px bg-[#e6e6e6]" />
      <Pill active={!statusFilter} onClick={() => onStatusFilterChange(null)}>
        All statuses
      </Pill>
      {filterStatuses.map((s) => (
        <Pill
          key={s.key}
          active={statusFilter === s.key}
          onClick={() => onStatusFilterChange(statusFilter === s.key ? null : s.key)}
          dot={s.bar}
        >
          {s.label.split(" — ")[0].split(" / ")[0]}
        </Pill>
      ))}
      <span className="h-6 w-px bg-[#e6e6e6]" />
      {/* Sits with the filters because it behaves like one, but it filters on a different
          axis: not "what kind of work is this" but "does TMS have this yet". The dot matches
          the marker on the chips themselves (docs/DECISIONS.md #29, #32). */}
      <Pill
        active={changesOnly}
        onClick={onToggleChangesOnly}
        dot="#2b7bb9"
        title={
          changeCount === 0
            ? "Nothing in this date range differs from TMS"
            : `Show only what TMS doesn't have yet — ${changeCount} change${changeCount > 1 ? "s" : ""}`
        }
      >
        Changes{changeCount > 0 ? ` (${changeCount})` : ""}
      </Pill>
      <span className="flex-1" />
      <div className="inline-flex">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd + Z)"
          className="inline-flex items-center gap-1.5 rounded-l-full border px-3.5 py-1.5 text-[13px] transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
          style={{
            borderColor: "#e6e6e6",
            background: "#fff",
            color: canUndo ? "#333333" : "#c5c9d1",
            cursor: canUndo ? "pointer" : "not-allowed",
          }}
        >
          <span aria-hidden className="text-sm leading-none">↺</span> Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd + Shift + Z, or Ctrl + Y)"
          className="-ml-px inline-flex items-center gap-1.5 rounded-r-full border px-3.5 py-1.5 text-[13px] transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
          style={{
            borderColor: "#e6e6e6",
            background: "#fff",
            color: canRedo ? "#333333" : "#c5c9d1",
            cursor: canRedo ? "pointer" : "not-allowed",
          }}
        >
          Redo <span aria-hidden className="text-sm leading-none">↻</span>
        </button>
      </div>
      <span className="h-6 w-px bg-[#e6e6e6]" />
      <Pill active={selectMode} onClick={onToggleSelectMode}>
        {selectMode ? "Selecting…" : "Select"}
      </Pill>
      {canPublish && (
        <button
          onClick={onPublishUpcoming}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#1a3d69] bg-[#1a3d69] px-3.5 py-1.5 text-[13px] text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          🔒 Publish upcoming…
        </button>
      )}
      <Button variant="outline" size="sm" onClick={onJumpToday}>
        Today
      </Button>
      <Pill active={showLegend} onClick={onToggleLegend}>
        Key
      </Pill>
      <TmsFreshness fetchedAtIso={tmsFetchedAtIso} />
    </div>
  );
}
