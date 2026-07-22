import { STATUS_CONFIG, tintBorder } from "@/lib/statuses";
import type { GridBooking } from "@/lib/db/queries";

export function CellChip({
  booking,
  dimmed,
  warning,
  checked,
  isOpen,
  draggable,
  preview,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  booking: GridBooking | null;
  dimmed: boolean;
  warning?: boolean;
  checked?: boolean;
  isOpen?: boolean;
  draggable?: boolean;
  preview?: "ok" | "bad" | null;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const previewStyle =
    preview === "ok"
      ? { border: "1.5px solid #3d7f53", background: "#e9f4ec" }
      : preview === "bad"
        ? { border: "1.5px solid #b13a3a", background: "#f9ebeb" }
        : null;

  if (!booking) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Available — click to assign"
        className="flex h-10 w-full items-center justify-center rounded-md border border-dashed text-xs transition-[opacity,border-color,background] duration-150"
        style={{
          borderColor: isOpen ? "#2b7bb9" : "#e6e6e6",
          background: isOpen ? "#f0f7ff" : "transparent",
          opacity: dimmed && !preview ? 0.22 : 1,
          ...(previewStyle ?? {}),
        }}
      >
        {isOpen ? "+" : ""}
      </button>
    );
  }

  const st = STATUS_CONFIG[booking.status];
  const borderColour = tintBorder(st.bar, booking.status === "confirmed" ? 0.28 : 0.5);
  const locked = !!booking.publishedAt;

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable && !locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${booking.siteName} · ${st.label}${locked ? " · published & locked" : ""}${warning ? " · ⚠ capability mismatch" : ""}${locked ? "" : " · Drag to move · Ctrl-click to multi-select"}`}
      className="relative flex h-10 w-full items-center overflow-hidden rounded-md border text-left transition-[box-shadow,border-color,opacity] duration-150"
      style={{
        cursor: locked ? "pointer" : "grab",
        borderColor: checked ? "#2b7bb9" : isOpen ? "#2b7bb9" : borderColour,
        boxShadow: checked ? "0 0 0 2px rgba(43,123,185,0.28)" : isOpen ? "0 0 0 2px #f0f7ff" : "none",
        background: st.bg,
        opacity: dimmed && !preview ? 0.22 : locked ? 0.72 : 1,
        filter: locked ? "saturate(0.55)" : "none",
        ...(previewStyle ?? {}),
      }}
    >
      {locked && (
        <span className="shrink-0 pl-1.5 text-[11px] leading-none text-[#9a9a9a]" aria-hidden>
          🔒
        </span>
      )}
      <span className="line-clamp-2 flex-1 px-2 text-xs leading-[14px]" style={{ color: st.text }}>
        {booking.siteName}
      </span>
      {warning && (
        <span className="absolute top-0.5 right-0.5 text-[10px] leading-none" aria-hidden title="Capability mismatch">
          ⚠
        </span>
      )}
      {checked && (
        <span
          className="absolute top-[3px] right-[3px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2b7bb9] text-[9px] leading-none font-bold text-white"
          aria-hidden
        >
          ✓
        </span>
      )}
    </button>
  );
}
