"use client";

import { forwardRef } from "react";
import {
  ArrowRightIcon,
  ArrowLeftRightIcon,
  CheckIcon,
  EraserIcon,
  PlusIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { mixHex, tintBorder } from "@/lib/statuses";
import { useStatusCatalog } from "./status-context";
import { useGeneratorTagIds } from "./generator-tag-context";
import { useTagCatalog } from "./tag-context";
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

// The "this day has already happened" wash — deliberately NOT the padlock's opacity/
// saturate/icon treatment (that's reserved for an explicitly published booking, a different
// reason for read-only). A flat neutral grey, same family as the past-row background in
// planner-grid.tsx, mixed in stronger than the change-wash so it reads clearly while still
// letting the underlying status colour show through — an auditor scrolling back needs to
// see what was booked, not just that it's old.
const PAST_COLOR = "#9aa1ad";
const PAST_WASH_RATIO = 0.3;

// One shared shape for every small circular status icon anchored to a chip's corner (lock,
// TMS-conflict, collision, supersedes, selected-checkmark) — so a badge always has the same
// size, corner inset and pill shape no matter which status it's naming. Before this, each
// callsite duplicated the same Tailwind string with its own copy-paste drift risk; the lock
// badge fell out of sync with the others (plain inline icon, no circle) until this fix.
const CORNER_POSITION: Record<"top-left" | "top-right" | "bottom-left" | "bottom-right", string> = {
  "top-left": "top-0.5 left-0.5",
  "top-right": "top-0.5 right-0.5",
  "bottom-left": "bottom-0.5 left-0.5",
  "bottom-right": "bottom-0.5 right-0.5",
};

export function CornerBadge({
  position,
  color,
  title,
  children,
}: {
  position: keyof typeof CORNER_POSITION;
  color: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`absolute ${CORNER_POSITION[position]} flex h-3.5 w-3.5 items-center justify-center rounded-full text-white`}
      style={{ background: color }}
      aria-hidden
      title={title}
    >
      {children}
    </span>
  );
}

// The bottom-right corner the sync dot used to occupy (docs/DECISIONS.md #43) — reused here
// for tag dots. Different from that dot in the way that matters: this one only appears on a
// cell that actually carries tags, not on every changed cell, so it isn't the same clutter
// the client asked to remove. See the "Decorations" table in docs/CELL_STATES.md.
const MAX_TAG_DOTS = 3;
// A tag id a booking still carries that TMS no longer returns (deactivated/removed since it
// was picked) — render *something* rather than silently dropping a scheduler's earlier
// choice. Same muted grey used for the year label in planner-grid.tsx.
const UNKNOWN_TAG_COLOUR = "#c2c7d1";

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
          className="flex h-full shrink-0 cursor-pointer items-center px-1.5 text-[#5a6472] opacity-55 transition-opacity duration-150 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          <ArrowRightIcon className="size-3" aria-hidden />
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
   * This cell's day is before today — read-only for scheduling but still shown, for audit/
   * cross-reference. Independent of `booking.publishedAt`/`locked`: a past booking that was
   * never published is still past, and the two reasons get distinct treatment (see
   * docs/CELL_STATES.md) rather than being folded into one "locked" concept.
   */
  isPast?: boolean;
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
  /**
   * Reserves space at the chip's left edge for the "moved from" jump arrow planner-grid.tsx
   * overlays there (a sibling of this button, not nested inside it — see the comment next to
   * that arrow). Without this the site name renders flush left, underneath the arrow.
   */
  leftGutter?: boolean;
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
  isPast,
  preview,
  flash,
  pendingRemoval,
  leftGutter,
  onClick,
  onDragStart,
  onDragEnd,
  style: injectedStyle,
  ...rest
}, ref) {
  // Read the catalogue unconditionally (before the no-booking early return) so hook order
  // stays stable across renders where the cell flips between empty and booked.
  const catalog = useStatusCatalog();
  const generatorTagIds = useGeneratorTagIds();
  const tagCatalog = useTagCatalog();

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
        title={isPast ? "Date has passed" : (
          checked
            ? "Selected — book this and the rest of the selection in one go, or click to unselect"
            : pendingRemoval
              ? `Free — you've cleared "${pendingRemoval}" here. TMS still shows it until that's published. Click to book something else.`
              : "Available — click to assign · Ctrl-click or Shift-click to select several"
        )}
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
          borderColor: isPast
            ? "#e2e4e8"
            : flash ? "#f17f42" : checked ? "#2b7bb9" : isOpen ? "#2b7bb9" : pendingRemoval ? "#d8c5b4" : "#e6e6e6",
          // A dashed border reads as "click to book" — a past empty cell never was booked and
          // never can be, so it drops the dashed "available" affordance entirely.
          borderStyle: isPast ? "solid" : flash || checked ? "solid" : "dashed",
          cursor: isPast ? "default" : "pointer",
          boxShadow: flash
            ? "0 0 0 3px rgba(241,127,66,0.45)"
            : checked
              ? "0 0 0 2px rgba(43,123,185,0.28)"
              : "none",
          background: isPast ? "#eef0f3" : isOpen ? "#f0f7ff" : checked ? "#f0f7ff" : "transparent",
          opacity: dimmed && !preview ? 0.22 : 1,
          ...(previewStyle ?? {}),
        }}
        {...rest}
      >
        {isOpen && <PlusIcon className="size-3.5" aria-hidden />}
        {checked && (
          <span
            className="absolute top-[3px] right-[3px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2b7bb9] text-white"
            aria-hidden
          >
            <CheckIcon className="size-2.5" strokeWidth={3} />
          </span>
        )}
        {pendingRemoval && !isOpen && (
          // Small enough to read as "free with a note", not as an occupied cell — the whole
          // reason this isn't rendered as a struck-through booking chip.
          <span
            className="absolute bottom-[3px] left-[4px] text-[#b8865c]"
            aria-hidden
          >
            <EraserIcon className="size-2.5" />
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
  // Layered on top of (not instead of) the change-wash: a past, unpublished, changed booking
  // should still show both — an auditor needs to see "this was a pending TMS change that
  // never got sent" on old rows, not just "this is old". Skipped when `locked`: the padlock
  // look already answers the read-only question more specifically, see docs/CELL_STATES.md.
  const pastFill = isPast && !locked ? mixHex(fill, PAST_COLOR, PAST_WASH_RATIO) : fill;

  const tagNames = booking.tagIds.map((id) => tagCatalog.get(id)?.name ?? "Unknown tag");

  // Generator tracking (docs/DECISIONS.md): a booking "needs a generator" when any of its
  // tags is one an admin has designated as a generator tag (/admin/tag-categories) — no
  // separate field of our own. Colour/label come straight from the live tag catalogue, same
  // as the tag dots below; a tag id that's both a generator tag and deactivated/removed in
  // TMS since falls back the same way a tag dot does.
  const generatorTagId = booking.tagIds.find((id) => generatorTagIds.has(id));
  const generator = generatorTagId !== undefined ? tagCatalog.get(generatorTagId) : undefined;

  // The generator tag already gets its own ⚡ badge (top-left) — repeating it as a dot down
  // here just says the same thing twice on one chip. Every other tag still gets a dot.
  const dotTagIds =
    generatorTagId !== undefined ? booking.tagIds.filter((id) => id !== generatorTagId) : booking.tagIds;

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
      draggable={draggable && !locked && !isPast}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${booking.siteName} · ${st.label}${locked ? " · published & locked" : isPast ? " · date has passed — view only" : ""}${changeKind ? ` · ${CHANGE_KIND_LABEL[changeKind]}` : ""}${warning ? " · ⚠ capability mismatch" : ""}${hasTmsConflict ? " · ⇄ TMS also changed this booking — edit and save to resolve" : ""}${collision ? ` · ⨯ TMS also has ${booking.tmsCollision!.siteName} here — move or clear one` : ""}${supersedes ? " · ↻ TMS has updated this booking since — open it to resolve" : ""}${generatorTagId !== undefined ? ` · ⚡ Generator: ${generator?.name ?? "Unknown tag"}` : ""}${tagNames.length ? ` · Tags: ${tagNames.join(", ")}` : ""}${locked || isPast ? "" : " · Drag to move · Ctrl-click to multi-select"}`}
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
        cursor: locked || isPast ? "pointer" : "grab",
        borderColor: flash ? "#f17f42" : checked ? "#2b7bb9" : isOpen ? "#2b7bb9" : borderColour,
        boxShadow: flash
          ? "0 0 0 3px rgba(241,127,66,0.45)"
          : checked
            ? "0 0 0 2px rgba(43,123,185,0.28)"
            : isOpen
              ? "0 0 0 2px #f0f7ff"
              : "none",
        background: pastFill,
        opacity: dimmed && !preview ? 0.22 : locked ? 0.72 : 1,
        filter: locked ? "saturate(0.55)" : "none",
        ...(previewStyle ?? {}),
      }}
      {...rest}
    >
      {leftGutter && <span className="w-6 shrink-0" aria-hidden />}
      {generatorTagId !== undefined && (
        <span
          className="absolute top-1 right-1"
          aria-hidden
          title={`Generator: ${generator?.name ?? "Unknown tag"}`}
          style={{ color: generator?.hexColour ?? UNKNOWN_TAG_COLOUR }}
        >
          <ZapIcon className="size-2.5" fill="currentColor" />
        </span>
      )}
      {/* The lock badge is NOT rendered here. This button has `overflow-hidden` (so the
          background wash respects the rounded corners), which would clip an absolutely-
          positioned badge to sit inside the border instead of straddling it. planner-grid.tsx
          renders it as a sibling of this button instead — same CornerBadge, unclipped — see
          the comment next to the "moved from" arrow there, which reserves room for via
          `leftGutter` above. */}
      <span
        className={`line-clamp-2 flex-1 pr-2 text-xs leading-[14px] ${leftGutter ? "pl-0" : "pl-2"}`}
        style={{ color: "#333333" }}
      >
        {booking.siteName}
      </span>
      {warning && (
        <span className="absolute top-0.5 right-0.5" aria-hidden title="Capability mismatch">
          <TriangleAlertIcon className="size-2.5" style={{ color: "#f17f42" }} />
        </span>
      )}
      {hasTmsConflict && (
        <CornerBadge
          position="bottom-left"
          color="#f17f42"
          title="TMS also changed this booking — edit and save to resolve"
        >
          <ArrowLeftRightIcon className="size-2.5" strokeWidth={3} />
        </CornerBadge>
      )}
      {collision && (
        <CornerBadge
          position="bottom-left"
          color="#c0392b"
          title={`TMS also has ${booking.tmsCollision!.siteName} here — move or clear one to publish`}
        >
          <XIcon className="size-2.5" strokeWidth={3} />
        </CornerBadge>
      )}
      {supersedes && (
        <CornerBadge position="bottom-left" color="#8a3ffc" title="TMS has updated this booking since — open it to resolve">
          <RefreshCwIcon className="size-2.5" strokeWidth={3} />
        </CornerBadge>
      )}
      {checked && (
        <CornerBadge position="top-right" color="#2b7bb9">
          <CheckIcon className="size-2.5" strokeWidth={3} />
        </CornerBadge>
      )}
      {dotTagIds.length > 0 && (
        <span className="absolute right-1 bottom-1 flex gap-[2px]" aria-hidden>
          {dotTagIds.slice(0, MAX_TAG_DOTS).map((id) => (
            <span
              key={id}
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: tagCatalog.get(id)?.hexColour ?? UNKNOWN_TAG_COLOUR }}
            />
          ))}
        </span>
      )}
    </button>
  );
});
