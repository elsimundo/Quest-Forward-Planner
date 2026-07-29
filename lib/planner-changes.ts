// "What have we changed that TMS doesn't have yet?" — the sync-state axis.
//
// The client asked for a way to see "at a glance what we are planning to lock in as changes
// and how it affects the schedule". Their first framing was a new *status* ("Confirmed in
// Forward Planner" alongside "Confirmed"), which we pushed back on (docs/DECISIONS.md #29):
// where a booking is confirmed is a different question from what kind of work it is, and
// answering it with a status would (a) need cross-multiplying against all eight statuses,
// (b) have nothing to map to in TMS's own catalogue (lib/db/tms/status-map.ts), and (c) be
// hand-set, so it could disagree with reality.
//
// This module answers it from data that cannot disagree: where the row came from
// (`origin`) and whether it's been published. No DB or server-only imports, so both the
// grid and the server can read it — same rule as lib/publish-eligibility.ts.

/**
 * Where a rendered cell's content came from, and therefore whether TMS already agrees with
 * it as shown.
 *
 * - `tms` — an untouched TMS booking, or a ghost. TMS has it exactly like this.
 * - `amended` — a TMS booking changed here: edited in place, or moved to this slot.
 * - `local` — exists only here; TMS has never seen it.
 *
 * Needed because `tmsBookingId` alone can't tell the first two apart — it's set on untouched
 * TMS rows as well as on amendments of them.
 */
export type BookingOrigin = "tms" | "amended" | "local";

/** The kinds of pending change a cell can represent. One per cell, at most. */
export type ChangeKind = "new" | "amended" | "moved" | "cleared";

/** Short form, for the summary bar. */
export const CHANGE_KIND_NOUN: Record<ChangeKind, string> = {
  new: "new",
  amended: "amended",
  moved: "moved",
  cleared: "cleared",
};

/** Long form, for the chip tooltip and the drawer. Written to be read on its own. */
export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  new: "New here — TMS doesn't have this booking yet",
  amended: "Changed here — not yet sent to TMS",
  moved: "Moved here — not yet sent to TMS",
  cleared: "Cleared here — TMS still shows this until you publish",
};

export type ChangeClassifiable = {
  origin: BookingOrigin;
  publishedAt: Date | null;
  movedFrom: { unitId: number; date: string } | null;
  isGhost: boolean;
  ghostReason: "moved" | "cleared" | null;
};

/**
 * The pending change this cell represents, or null if TMS already agrees with it.
 *
 * A **moved** booking is deliberately counted at its destination, not at the ghost it left
 * behind — one move is one change, and the ghost is a signpost to the amendment rather than
 * a change in its own right. A **cleared** booking is the opposite case: the ghost is the
 * only thing on screen (the amendment is soft-deleted), so it carries the change itself.
 *
 * Published rows return null. Once published the booking is locked and shows 🔒, which is
 * already a stronger statement than "changed" — and under docs/TMS_WRITE_BACK.md §5 it stops
 * being an amendment at all once TMS accepts it.
 */
export function changeKindFor(b: ChangeClassifiable): ChangeKind | null {
  if (b.isGhost) return b.ghostReason === "cleared" ? "cleared" : null;
  if (b.publishedAt) return null;
  if (b.origin === "tms") return null;
  if (b.origin === "local") return "new";
  return b.movedFrom ? "moved" : "amended";
}

export type ChangeSummary = {
  total: number;
  /** Only the kinds actually present, in a stable display order. */
  breakdown: { kind: ChangeKind; count: number }[];
};

const KIND_ORDER: ChangeKind[] = ["new", "amended", "moved", "cleared"];

export function summariseChanges(cells: ChangeClassifiable[]): ChangeSummary {
  const counts = new Map<ChangeKind, number>();
  for (const c of cells) {
    const kind = changeKindFor(c);
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return {
    total: [...counts.values()].reduce((a, b) => a + b, 0),
    breakdown: KIND_ORDER.filter((k) => counts.has(k)).map((kind) => ({ kind, count: counts.get(kind)! })),
  };
}
