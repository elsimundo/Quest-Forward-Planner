"use client";

import { tintBorder } from "@/lib/statuses";
import { useStatusCatalog } from "./status-context";
import type { OverlayBooking } from "@/lib/db/tms/overlay";

// The faded original left behind when a scheduler moves a TMS booking — the client's own
// ask: "I'd like for that original TMS booking to stay where it is, but be made slightly
// transparent. A link would also be added to that faded out TMS booking that would scroll
// the user to where that new booking is now located."
//
// It renders TMS's current truth, not one of our rows, so it stays inert in every sense that
// would change data: not draggable, not selectable, never opens the drawer, never counted for
// publishing. The ONE thing it does is navigate — clicking jumps to where the booking now
// sits. That's why it's a button rather than a div: it's a link, not an editable cell.
export function GhostChip({
  booking,
  toLabel,
  onGoTo,
}: {
  booking: OverlayBooking;
  /** Human-readable destination, e.g. "RCT22 · 3 Mar" — for the tooltip. */
  toLabel: string | null;
  onGoTo?: () => void;
}) {
  const catalog = useStatusCatalog();
  const st = catalog.get(booking.status);

  const title = toLabel
    ? `${booking.siteName} — still here in TMS. Moved to ${toLabel} in the planner, not yet published. Click to jump there.`
    : `${booking.siteName} — still here in TMS, moved elsewhere in the planner and not yet published.`;

  return (
    <button
      type="button"
      onClick={onGoTo}
      disabled={!onGoTo}
      title={title}
      aria-label={title}
      className="group flex h-10 w-full items-center overflow-hidden rounded-md border border-dashed text-left transition-opacity duration-150 select-none enabled:cursor-pointer enabled:hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
      style={{
        borderColor: tintBorder(st.bar, 0.45),
        background: st.bg,
        opacity: 0.45,
      }}
    >
      <span className="line-clamp-2 flex-1 px-2 text-xs leading-[14px] italic" style={{ color: st.text }}>
        {booking.siteName}
      </span>
      {onGoTo && (
        <span
          className="shrink-0 pr-1.5 text-[11px] leading-none text-[#5a6472] transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        >
          ↷
        </span>
      )}
    </button>
  );
}

export function CellChip({
  booking,
  dimmed,
  warning,
  checked,
  isOpen,
  draggable,
  preview,
  flash,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  booking: OverlayBooking | null;
  dimmed: boolean;
  warning?: boolean;
  checked?: boolean;
  isOpen?: boolean;
  draggable?: boolean;
  preview?: "ok" | "bad" | null;
  /** Transient highlight after jumping here from a ghost's "moved to" link (Stage C1). */
  flash?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  // Read the catalogue unconditionally (before the no-booking early return) so hook order
  // stays stable across renders where the cell flips between empty and booked.
  const catalog = useStatusCatalog();

  // Longhand only — the base styles below set `borderColor`, so mixing in the `border`
  // shorthand here makes React warn when the preview clears (shorthand removed while the
  // longhand persists). Keep every border property in longhand form on both sides.
  const previewStyle =
    preview === "ok"
      ? { borderColor: "#3d7f53", borderStyle: "solid", borderWidth: "1.5px", background: "#e9f4ec" }
      : preview === "bad"
        ? { borderColor: "#b13a3a", borderStyle: "solid", borderWidth: "1.5px", background: "#f9ebeb" }
        : null;

  if (!booking) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Available — click to assign"
        className="flex h-10 w-full items-center justify-center rounded-md border border-dashed text-xs transition-[opacity,border-color,background] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
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

  const st = catalog.get(booking.status);
  const borderColour = tintBorder(st.bar, booking.status === "confirmed" ? 0.28 : 0.5);
  const locked = !!booking.publishedAt;
  const hasTmsConflict = !!booking.tmsConflictAt;

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable && !locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${booking.siteName} · ${st.label}${locked ? " · published & locked" : ""}${warning ? " · ⚠ capability mismatch" : ""}${hasTmsConflict ? " · ⇄ TMS also changed this booking — edit and save to resolve" : ""}${locked ? "" : " · Drag to move · Ctrl-click to multi-select"}`}
      className="relative flex h-10 w-full items-center overflow-hidden rounded-md border text-left transition-[box-shadow,border-color,opacity] duration-150 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
      style={{
        cursor: locked ? "pointer" : "grab",
        borderColor: flash ? "#f17f42" : checked ? "#2b7bb9" : isOpen ? "#2b7bb9" : borderColour,
        boxShadow: flash
          ? "0 0 0 3px rgba(241,127,66,0.45)"
          : checked
            ? "0 0 0 2px rgba(43,123,185,0.28)"
            : isOpen
              ? "0 0 0 2px #f0f7ff"
              : "none",
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
      {hasTmsConflict && (
        <span
          className="absolute bottom-0.5 left-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f17f42] text-[9px] leading-none font-bold text-white"
          aria-hidden
          title="TMS also changed this booking — edit and save to resolve"
        >
          ⇄
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
