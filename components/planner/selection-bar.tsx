import { LockIcon, PencilIcon } from "lucide-react";

/**
 * What the drag currently hovering a cell would do, for the live readout below. The count is
 * the number of bookings actually being placed — which is NOT the selection size once Shift
 * has narrowed an in-flight block drag down to the one that was grabbed.
 */
export type DragSummary = {
  total: number;
  clashes: number;
  oob: boolean;
  /** Count of targets landing on a date that's passed — reported separately from `oob`,
   * since it's a real cell (not out-of-range) that just can't be dropped into. */
  pastCount: number;
  valid: boolean;
};

function dragMessage({ total, clashes, oob, pastCount, valid }: DragSummary) {
  const set = `${total} booking${total === 1 ? "" : "s"}`;
  if (valid) return `${set} · all fit here — drop to move`;
  if (oob) return `${set} · part of the set falls outside the planner range`;
  if (pastCount > 0) return `${set} · ${pastCount} would land on a date that's passed`;
  return `${set} · ${clashes} won't fit — drop to swap or overwrite`;
}

export function SelectionBar({
  bookingCount,
  emptyCount,
  editableCount,
  bulkEditableCount,
  publishableCount,
  canPublish,
  dragSummary,
  onPublish,
  onBookEmpty,
  onBulkEdit,
  onClear,
}: {
  /** Selected cells that hold a booking — what "move", "swap" and "publish" act on. */
  bookingCount: number;
  /** Selected cells that are free — what "Book N cells" acts on. */
  emptyCount: number;
  /** Of `bookingCount`, how many are unpublished — gates "Publish selected". Deliberately NOT
   * also excluding past-day bookings: publishing a forgotten, never-published past booking
   * must keep working (docs/DECISIONS.md). */
  editableCount: number;
  /** Of `bookingCount`, how many are unpublished AND not past — gates "Bulk edit", which
   * (unlike publish) treats a past date as read-only the same as a locked one. */
  bulkEditableCount: number;
  publishableCount: number;
  canPublish: boolean;
  /** Non-null only while a drag is hovering a target cell. */
  dragSummary: DragSummary | null;
  onPublish: () => void;
  onBookEmpty: () => void;
  onBulkEdit: () => void;
  onClear: () => void;
}) {
  // The bar keeps its slot in the layout even with nothing selected. Mounting and unmounting it
  // shoved the whole grid down and back up every time a selection started or cleared, which read
  // as the grid jumping under the pointer mid-select. `invisible` (visibility: hidden) keeps the
  // reserved height exactly the bar's own height — no magic number to drift — while hiding it
  // from paint, hit-testing, the tab order and the accessibility tree.
  const count = bookingCount + emptyCount;
  const active = count > 0;
  // Both kinds can be selected at once, and the two halves do different things, so the bar
  // names them separately rather than reporting a single total that neither button matches.
  const label =
    bookingCount && emptyCount
      ? `${bookingCount} booking${bookingCount === 1 ? "" : "s"} and ${emptyCount} free day${emptyCount === 1 ? "" : "s"} selected`
      : emptyCount
        ? `${emptyCount} free day${emptyCount === 1 ? "" : "s"} selected`
        : `${bookingCount} booking${bookingCount === 1 ? "" : "s"} selected`;
  return (
    <div
      aria-hidden={!active}
      className={`flex shrink-0 items-center gap-3.5 bg-[#1a3d69] px-6 py-2.5 text-[13px] text-white${
        active ? "" : " invisible"
      }`}
    >
      <span className="font-bold">{label}</span>
      {/* While a drag is live this strip becomes its readout. The grid colours the whole
          block one way or the other (green only when every booking lands cleanly), and this
          says in words WHY it's red — which the colour on its own can't, since "three of
          these clash" and "this hangs off the end of the calendar" look identical. */}
      {dragSummary ? (
        <span className={dragSummary.valid ? "font-medium text-[#9fe0b4]" : "font-medium text-[#f5b9b9]"}>
          {dragMessage(dragSummary)}
        </span>
      ) : (
        <span className="font-light text-white/75">
          {emptyCount > 0 && bookingCount === 0 ? (
            <>Book them all in one go — they&apos;ll share a site and status. Click a selected day to unselect it.</>
          ) : (
            <>
              Drag to move the whole set — green means the whole set fits; red means it
              doesn&apos;t, and you&apos;ll be asked to swap or overwrite.{" "}
              {bookingCount > 1 && <>Hold Shift mid-drag to place just the one you grabbed. </>}
              Click a selected booking to unselect it.
            </>
          )}
        </span>
      )}
      <span className="flex-1" />
      {emptyCount > 0 && (
        <button
          onClick={onBookEmpty}
          title={`Book ${emptyCount} free day${emptyCount === 1 ? "" : "s"} with one site and status`}
          className="rounded-full border border-white bg-white px-3.5 py-1.5 text-xs font-medium text-[#1a3d69] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          Book {emptyCount} day{emptyCount === 1 ? "" : "s"}
        </button>
      )}
      {/* Gated on there being bookings in the selection at all, not on the role: a
          selection of free days has nothing to bulk-edit. Disabled once every booking in
          the set is already published — same reasoning as "Publish selected" below. */}
      {bookingCount > 0 && (
        <button
          onClick={onBulkEdit}
          disabled={bulkEditableCount === 0}
          title={
            bulkEditableCount === 0
              ? "All selected bookings are published, locked, or on a date that's passed"
              : `Edit ${bulkEditableCount} selected booking${bulkEditableCount > 1 ? "s" : ""}`
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-white/70 px-3.5 py-1.5 text-xs font-medium text-white transition-colors enabled:hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          <PencilIcon className="size-3" aria-hidden /> Bulk edit
        </button>
      )}
      {/* Gated on there being bookings in the selection at all, not just on the role: a
          selection of free days has nothing to publish, and the disabled button's "already
          published" tooltip was actively wrong there.

          Disabled on editableCount (unpublished count), NOT publishableCount (eligible-to-
          publish-right-now count) — the same distinction Bulk edit above already draws.
          publishableCount can be 0 while there's still real work to do: a selection full of
          exceptions (a TMS collision, an unconfirmed status) has nothing eligible yet, but
          clicking should open PublishSelectedDialog to explain why, not disable itself with a
          tooltip claiming everything's already published when it isn't. */}
      {canPublish && bookingCount > 0 && (
        <button
          onClick={onPublish}
          disabled={editableCount === 0}
          title={
            editableCount === 0
              ? "All selected bookings are already published"
              : publishableCount === 0
                ? "None of these are ready to publish yet — see what's blocking them"
                : `Publish ${publishableCount} booking${publishableCount > 1 ? "s" : ""} to TMS`
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white px-3.5 py-1.5 text-xs font-medium text-[#1a3d69] transition-opacity enabled:hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          <LockIcon className="size-3" aria-hidden /> Publish selected
        </button>
      )}
      <button
        onClick={onClear}
        className="rounded-full border border-white/40 px-3.5 py-1.5 text-xs text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
      >
        Clear selection (Esc)
      </button>
    </div>
  );
}
