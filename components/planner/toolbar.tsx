import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG, EDITABLE_STATUSES } from "@/lib/statuses";
import type { Status } from "@/lib/db/schema";

function Pill({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
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
  modalities,
  activeModalityId,
  onModalityChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showLegend,
  onToggleLegend,
  onJumpToday,
  selectMode,
  onToggleSelectMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  modalities: { id: number; name: string }[];
  activeModalityId: number;
  onModalityChange: (id: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: Status | null;
  onStatusFilterChange: (s: Status | null) => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  onJumpToday: () => void;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
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
      <span className="h-6 w-px bg-[#e6e6e6]" />
      <Pill active={!statusFilter} onClick={() => onStatusFilterChange(null)}>
        All statuses
      </Pill>
      {EDITABLE_STATUSES.map((s) => (
        <Pill
          key={s}
          active={statusFilter === s}
          onClick={() => onStatusFilterChange(statusFilter === s ? null : s)}
          dot={STATUS_CONFIG[s].bar}
        >
          {STATUS_CONFIG[s].label.split(" — ")[0].split(" / ")[0]}
        </Pill>
      ))}
      <span className="flex-1" />
      <div className="inline-flex">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd + Z)"
          className="inline-flex items-center gap-1.5 rounded-l-full border px-3.5 py-1.5 text-[13px] transition-colors"
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
          className="-ml-px inline-flex items-center gap-1.5 rounded-r-full border px-3.5 py-1.5 text-[13px] transition-colors"
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
      <Button variant="outline" size="sm" onClick={onJumpToday}>
        Today
      </Button>
      <Pill active={showLegend} onClick={onToggleLegend}>
        Key
      </Pill>
    </div>
  );
}
