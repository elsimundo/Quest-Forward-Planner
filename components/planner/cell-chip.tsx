"use client";

import { forwardRef } from "react";
import { mixHex, tintBorder } from "@/lib/statuses";
import { useStatusCatalog } from "./status-context";
import { CHANGE_KIND_LABEL, changeKindFor } from "@/lib/planner-changes";
import type { OverlayBooking } from "@/lib/db/tms/overlay";

// The "TMS doesn't have this yet" colour. The app's own blue accent (#2b7bb9 — focus rings,
// links, the open-cell highlight) rather than the very dark navy this used to be: mixing
// white toward near-black navy at a light ratio reads as grey, not blue, and Dave was
// explicit that Confirmed-in-planner needed to actually look blue, not just "not quite
// white" (docs/DECISIONS.md #32). Applied as a background wash mixed into the status colour
// (#31 — a small corner dot alone wasn't enough). The wash is deliberately a small mix (14%)
// so every status keeps its own colour family rather than eight statuses converging on one
// "changed" colour — the grid has to stay readable as a *schedule* first.
//
// The wash used to be accompanied by a 6px corner dot naming which KIND of change it was.
// That dot is gone at the client's request (docs/DECISIONS.md #39): the wash already answers
// "does TMS have this?", and the kind is still named in full in the chip's tooltip below, so
// nothing was lost but clutter on every changed cell in the grid.
const CHANGE_COLOR = "#2b7bb9";
const CHANGE_WASH_RATIO = 0.14;

// The faded original left behind when a scheduler moves a TMS booking — the client's own
// ask: "I'd like for that original TMS booking to stay where it is, but be made slightly
// transparent. A link would also be added to that faded out TMS booking that would scroll
// the user to where that new booking is now located."
//
// It renders TMS's current truth, not one of our rows, so it stays inert in every sense that
// would change data: not draggable, not selectable, never opens the drawer, never counted for
// publishing. The ONE thing it does is navigate — clicking jumps to where the booking now
// sits. That's why it's a button rather than a div: it's a link, not an editable cell.
//
// MOVED ghosts only. A cleared booking's slot is genuinely free and renders through CellChip
// as an available cell with a small mark — see docs/CELL_STATES.md for why.
export function GhostChip({
  booking,
  toLabel,
  onOpen,
  onGoTo,
  preview,
}: {
  booking: OverlayBooking;
  /** Human-readable destination, e.g. "RCT22 · 3 Mar" — for the tooltip. */
  toLabel: string | null;
  /** Open this cell, as clicking any other cell would. The slot is free — see below. */
  onOpen: () => void;
  onGoTo?: () => void;
  /**
   * Live drag feedback, same as CellChip's `preview` — this slot is excluded from
   * `bookingLookup` (see docs/CELL_STATES.md) so a drag treats it as free, and the border
   * needs to say so instead of staying silent while every other free cell paints green.
   */
  preview?: "ok" | "bad" | "remove" | null;
}) {
  const catalog = useStatusCatalog();
  const st = catalog.get(booking.status);

  const where = toLabel ? `Moved to ${toLabel}` : "Moved elsewhere";
  const bodyTitle = `${booking.siteName} — still here in TMS. ${where} in the planner, not yet published. This slot is free: click to book something else.`;

  const previewStyle: React.CSSProperties | null =
    preview === "ok"
      ? { borderColor: "#3d7f53", borderStyle: "solid", borderWidth: "1.5px", background: "#e9f4ec" }
      : preview === "bad"
        ? { borderColor: "#b13a3a", borderStyle: "solid", borderWidth: "1.5px", background: "#f9ebeb" }
        : null;

  // TWO targets, not one. The body opens the cell like every other cell in the grid, because
  // the slot genuinely IS free — the booking that was here now lives somewhere else, the
  // availability bar counts this unit free, and a drag already drops onto it. Making the
  // whole chip a jump link meant a click aimed at booking the slot silently scrolled you to a
  // different part of the grid instead, which is a worse failure than simply not supporting
  // it. The ↷ keeps the one-click jump the client asked for. See docs/CELL_STATES.md.
  //
  // Siblings rather than nesting: a button inside a button is invalid HTML and browsers
  // recover from it unpredictably.
  return (
    <div
      className="relative flex h-10 w-full items-center overflow-hidden rounded-md border border-dashed select-none"
      style={{ borderColor: tintBorder(st.bar, 0.45), background: st.bg, ...(previewStyle ?? {}) }}
    >
      <button
        type="button"
        onClick={onOpen}
        title={bodyTitle}
        aria-label={bodyTitle}
        className="h-full min-w-0 flex-1 cursor-pointer px-2 text-left opacity-45 transition-opacity duration-150 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
      >
        <span className="line-clamp-2 text-xs leading-[14px] italic" style={{ color: "#333333" }}>
          {booking.siteName}
        </span>
      </button>
      {onGoTo && (
        <button
          type="button"
          onClick={onGoTo}
          title={`Jump to where this booking now sits${toLabel ? ` — ${toLabel}` : ""}`}
          aria-label={`Jump to where this booking now sits${toLabel ? `, ${toLabel}` : ""}`}
          className="flex h-full shrink-0 cursor-pointer items-center px-1.5 text-[11px] leading-none text-[#5a6472] opacity-55 transition-opacity duration-150 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          ↷
        </button>
      )}
    </div>
  );
}

type CellChipProps = {
  booking: OverlayBooking | null;
  dimmed: boolean;
  warning?: boolean;
  checked?: boolean;
  isOpen?: boolean;
  draggable?: boolean;
  /**
   * Live drag feedback. `ok`/`bad` come from a move — green when the whole set lands cleanly,
   * red when it doesn't. `remove` comes from dragging a run's edge INWARD: this day is about
   * to be given up, which is neither of those things.
   */
  preview?: "ok" | "bad" | "remove" | null;
  /** Transient highlight after jumping here from a ghost's "moved to" link (Stage C1). */
  flash?: boolean;
  /**
   * Site name of a TMS booking this cell is CLEARING on publish. The slot is free and
   * bookable — this is only a marker that the planner and TMS currently disagree here.
   * See docs/CELL_STATES.md.
   */
  pendingRemoval?: string | null;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
} & Omit<React.ComponentPropsWithoutRef<"button">, "onClick" | "onDragStart" | "onDragEnd" | "draggable" | "type">;

// Forwards its ref to the root <button> so a booked, unlocked cell can sit inside a Radix
// `ContextMenuTrigger asChild` (the right-click "move to unit" menu) without Slot wrapping
// it in an extra element — which would break the grid cell's flex layout. `...rest` matters
// just as much as the ref: Slot clones its own onContextMenu/pointer handlers onto whatever
// element it wraps, and without forwarding them here they'd land on props this component
// never reads, silently dropped — the menu trigger would never fire and the browser's own
// context menu would show instead.
export const CellChip = forwardRef<HTMLButtonElement, CellChipProps>(function CellChip({
  booking,
  dimmed,
  warning,
  checked,
  isOpen,
  draggable,
  preview,
  flash,
  pendingRemoval,
  onClick,
  onDragStart,
  onDragEnd,
  style: injectedStyle,
  ...rest
}, ref) {
  // Read the catalogue unconditionally (before the no-booking early return) so hook order
  // stays stable across renders where the cell flips between empty and booked.
  const catalog = useStatusCatalog();

  // Longhand only — the base styles below set `borderColor`, so mixing in the `border`
  // shorthand here makes React warn when the preview clears (shorthand removed while the
  // longhand persists). Keep every border property in longhand form on both sides.
  // Typed as CSSProperties rather than inferred: every branch below sets borderColor,
  // borderStyle and background, and an inferred union of those literals makes TypeScript
  // flag the intentional override where this is spread over the base styles. The override
  // IS the point — a drag preview outranks whatever the cell normally looks like.
  const previewStyle: React.CSSProperties | null =
    preview === "ok"
      ? { borderColor: "#3d7f53", borderStyle: "solid", borderWidth: "1.5px", background: "#e9f4ec" }
      : preview === "bad"
        ? { borderColor: "#b13a3a", borderStyle: "solid", borderWidth: "1.5px", background: "#f9ebeb" }
        : preview === "remove"
          ? // The tan the app already uses for "pending removal" (the ⌫ mark on a cleared
            // TMS slot), plus a fade — this day is on its way out, not in conflict. Red
            // would have said "clash", which is a different thing entirely.
            { borderColor: "#d8c5b4", borderStyle: "dashed", borderWidth: "1.5px", background: "#faf6f2", opacity: 0.5 }
          : null;

  if (!booking) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        title={
          checked
            ? "Selected — book this and the rest of the selection in one go, or click to unselect"
            : pendingRemoval
              ? `Free — you've cleared "${pendingRemoval}" here. TMS still shows it until that's published. Click to book something else.`
              : "Available — click to assign · Ctrl-click or Shift-click to select several"
        }
        className="relative flex h-10 w-full items-center justify-center rounded-md border border-dashed text-xs transition-[opacity,border-color,background,box-shadow] duration-150 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        style={{
          ...injectedStyle,
          // An empty cell flashes too. Undoing a *create* empties the cell it's taking you
          // to, so without this the grid would scroll to the right place and highlight
          // nothing — the one case where the highlight matters most, because there's no chip
          // left to notice.
          // An empty cell can be selected now (to book a run of free days in one go), so it
          // needs the same blue border-and-ring the booked chip uses — the ✓ badge alone,
          // floating in an otherwise-unchanged dashed outline, didn't read as "picked".
          borderColor: flash ? "#f17f42" : checked ? "#2b7bb9" : isOpen ? "#2b7bb9" : pendingRemoval ? "#d8c5b4" : "#e6e6e6",
          borderStyle: flash || checked ? "solid" : "dashed",
          boxShadow: flash
            ? "0 0 0 3px rgba(241,127,66,0.45)"
            : checked
              ? "0 0 0 2px rgba(43,123,185,0.28)"
              : "none",
          background: isOpen ? "#f0f7ff" : checked ? "#f0f7ff" : "transparent",
          opacity: dimmed && !preview ? 0.22 : 1,
          ...(previewStyle ?? {}),
        }}
        {...rest}
      >
        {isOpen ? "+" : ""}
        {checked && (
          <span
            className="absolute top-[3px] right-[3px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2b7bb9] text-[9px] leading-none font-bold text-white"
            aria-hidden
          >
            ✓
          </span>
        )}
        {pendingRemoval && !isOpen && (
          // Small enough to read as "free with a note", not as an occupied cell — the whole
          // reason this isn't rendered as a struck-through booking chip.
          <span
            className="absolute bottom-[3px] left-[4px] text-[9px] leading-none text-[#b8865c]"
            aria-hidden
          >
            ⌫
          </span>
        )}
      </button>
    );
  }

  const st = catalog.get(booking.status);
  const borderColour = tintBorder(st.bar, booking.status === "confirmed" ? 0.28 : 0.5);
  const locked = !!booking.publishedAt;
  const hasTmsConflict = !!booking.tmsConflictAt;
  // Stage C3: TMS has changed this booking since it was amended — distinct from
  // hasTmsConflict above, which belongs to the retiring booking-import mechanism
  // (docs/OVERLAY_BUILD_PLAN.md Stage F) and won't fire under the overlay model. Different
  // badge, different colour, so the two are never mistaken for one another while both exist.
  // Both badges anchor the same corner; hasTmsConflict (retiring) takes priority in the rare
  // case both are ever true at once, so they never render stacked.
  // Stage B4: TMS holds a DIFFERENT, unlinked booking on this exact unit+date — most often
  // because it was entered straight into TMS rather than through the planner, so nothing
  // upstream ever had a chance to catch it at write time. Same shared corner as ⇄/↻, and
  // takes priority over both: two things wanting one slot is more urgent than either of
  // them, and — unlike a supersede — there's no shared lineage to reconcile, only a clash to
  // pick a side of.
  const collision = !!booking.tmsCollision && !hasTmsConflict;
  const supersedes = booking.tmsSupersedes && !hasTmsConflict && !collision;
  // What publishing this cell would change in TMS, if anything. Null once published (🔒 is
  // already the stronger statement) and for untouched TMS bookings. See lib/planner-changes.ts.
  // Now drives the background wash alone; the tooltip below is what names the kind.
  const changeKind = changeKindFor(booking);
  // The background itself — see CHANGE_COLOR above. Skipped once locked: a published chip is
  // already visually distinct (desaturated, padlocked), and by definition nothing published
  // still has a changeKind anyway.
  const fill = changeKind ? mixHex(st.bg, CHANGE_COLOR, CHANGE_WASH_RATIO) : st.bg;

  // `select-none` below matters for more than tidiness: this chip is draggable AND renders the
  // site name as real text, so shift+mousedown extended the document's text selection instead of
  // starting a drag — killing exactly the shift-drag-one-at-a-time gesture (docs/DECISIONS.md
  // #35). A plain drag has no selection to extend, so block drags were unaffected and the
  // breakage looked shift-specific. GhostChip already had it; this branch didn't.
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      draggable={draggable && !locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${booking.siteName} · ${st.label}${locked ? " · published & locked" : ""}${changeKind ? ` · ${CHANGE_KIND_LABEL[changeKind]}` : ""}${warning ? " · ⚠ capability mismatch" : ""}${hasTmsConflict ? " · ⇄ TMS also changed this booking — edit and save to resolve" : ""}${collision ? ` · ⨯ TMS also has ${booking.tmsCollision!.siteName} here — move or clear one` : ""}${supersedes ? " · ↻ TMS has updated this booking since — open it to resolve" : ""}${locked ? "" : " · Drag to move · Ctrl-click to multi-select"}`}
      className="relative flex h-10 w-full items-center overflow-hidden rounded-md border text-left transition-[box-shadow,border-color,opacity] duration-150 select-none focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
      style={{
        // `injectedStyle` first, lowest priority: Radix's `ContextMenuTrigger asChild`
        // (cell-context-menu.tsx, the right-click "move to unit" menu) clones this element
        // with its own `style={{WebkitTouchCallout:"none"}}`, which — because CellChip didn't
        // destructure `style` — used to arrive via `...rest` and, spread after this object,
        // silently replaced the entire computed style with just that one property. Every
        // booked, unlocked cell rendered colourless as a result: not a palette bug, a prop-
        // merge order bug. Spreading it here instead keeps Radix's touch behaviour on the
        // properties below that we actually set.
        ...injectedStyle,
        cursor: locked ? "pointer" : "grab",
        borderColor: flash ? "#f17f42" : checked ? "#2b7bb9" : isOpen ? "#2b7bb9" : borderColour,
        boxShadow: flash
          ? "0 0 0 3px rgba(241,127,66,0.45)"
          : checked
            ? "0 0 0 2px rgba(43,123,185,0.28)"
            : isOpen
              ? "0 0 0 2px #f0f7ff"
              : "none",
        background: fill,
        opacity: dimmed && !preview ? 0.22 : locked ? 0.72 : 1,
        filter: locked ? "saturate(0.55)" : "none",
        ...(previewStyle ?? {}),
      }}
      {...rest}
    >
      {locked && (
        <span className="shrink-0 pl-1.5 text-[11px] leading-none text-[#9a9a9a]" aria-hidden>
          🔒
        </span>
      )}
      <span className="line-clamp-2 flex-1 px-2 text-xs leading-[14px]" style={{ color: "#333333" }}>
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
      {collision && (
        <span
          className="absolute bottom-0.5 left-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#c0392b] text-[9px] leading-none font-bold text-white"
          aria-hidden
          title={`TMS also has ${booking.tmsCollision!.siteName} here — move or clear one to publish`}
        >
          ⨯
        </span>
      )}
      {supersedes && (
        <span
          className="absolute bottom-0.5 left-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#8a3ffc] text-[9px] leading-none font-bold text-white"
          aria-hidden
          title="TMS has updated this booking since — open it to resolve"
        >
          ↻
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
});
