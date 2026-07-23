"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents, type BookingAction, type Status } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";

const EDITOR_ROLES = ["scheduler", "admin", "super_admin"] as const;

export type UndoResult =
  | { ok: true; message: string; newBatchId: string }
  | { ok: false; error: string; code: "PERMISSION" | "NOT_FOUND" | "LOCKED" | "CONFLICT" };

// Undoing (or redoing — redo is just "undo the undo batch") is derived from
// booking_events, not a client-side snapshot, so it survives reloads and works the same
// way regardless of what kind of operation is being reversed (SPEC.md §10, docs/DATABASE.md).
function inverseAction(action: BookingAction): BookingAction {
  switch (action) {
    case "create":
      return "delete";
    case "delete":
      return "create";
    case "overwrite":
      return "update";
    case "publish":
      return "unpublish";
    case "unpublish":
      return "publish";
    default:
      return action; // update/move/swap invert to the same kind of event
  }
}

type Snapshot = {
  id: number;
  unitId: string;
  date: string;
  siteId: number;
  status: Status;
  notes: string | null;
  updatedAt: string;
  publishedAt: string | null;
  publishedBy: number | null;
  deletedAt: string | null;
  deletedBy: number | null;
};

export async function undoBatch(batchId: string): Promise<UndoResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to undo changes.", code: "PERMISSION" };

  return db.transaction(async (tx) => {
    const events = await tx
      .select()
      .from(bookingEvents)
      .where(eq(bookingEvents.batchId, batchId))
      .orderBy(bookingEvents.id);

    if (!events.length) return { ok: false, error: "Nothing to undo.", code: "NOT_FOUND" };

    // Can't undo past a lock — if any row this batch touched is currently published,
    // its history predates the lock and shouldn't be silently rewritten (SPEC.md §2b).
    const ids = [
      ...new Set(
        events.flatMap((e) => {
          const after = e.bookingAfter as Snapshot | null;
          const before = e.bookingBefore as Snapshot | null;
          return [after?.id, before?.id].filter((x): x is number => typeof x === "number");
        }),
      ),
    ];
    const currentRows = await tx.select().from(bookings).where(sql`${bookings.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
    // Undo can't rewrite history that sits under a lock — but undoing the publish *itself*
    // must be allowed (its inverse is exactly the unlock the user is asking for). So a
    // currently-published row only blocks the undo when this batch isn't the one that
    // published it; if the batch has a `publish` event for that row, undoing it will clear
    // the lock, which is fine.
    const publishedByThisBatch = new Set(
      events
        .filter((e) => e.action === "publish")
        .map((e) => (e.bookingAfter as Snapshot | null)?.id)
        .filter((x): x is number => typeof x === "number"),
    );
    if (currentRows.some((r) => r.publishedAt && !publishedByThisBatch.has(r.id))) {
      return { ok: false, error: "Can't undo — one of these bookings is now published and locked.", code: "LOCKED" };
    }

    // SPEC.md §11: "if the booking being undone has changed since the undo step was
    // recorded, the undo fails safely" rather than clobbering someone else's newer edit.
    // Only events with a recorded "after" state can be checked this way — a `delete`
    // event's bookingAfter is null, but nothing else can touch that specific soft-deleted
    // row id (a new booking on the same unit/date gets a fresh row via INSERT), so there's
    // nothing to reconcile there.
    const currentById = new Map(currentRows.map((r) => [r.id, r]));
    for (const e of events) {
      const after = e.bookingAfter as Snapshot | null;
      if (!after) continue;
      const current = currentById.get(after.id);
      if (current && current.updatedAt.toISOString() !== after.updatedAt) {
        return {
          ok: false,
          error: "Can't undo — this booking was changed since then. Refresh to see the latest.",
          code: "CONFLICT",
        };
      }
    }

    // Phase 1: soft-delete every touched row, which removes them all from the partial
    // unique index (unit_id, date) WHERE deleted_at IS NULL. This is what makes Phase 2
    // safe — NOT any statement-level deferral. Postgres enforces a (non-deferrable,
    // and here partial, so un-deferrable) unique index per row as an UPDATE scans, so
    // restoring swapped rows in one statement would otherwise transiently collide. With
    // every touched row first out of the index, each restore target is genuinely empty.
    await tx
      .update(bookings)
      .set({ deletedAt: new Date() })
      .where(sql`${bookings.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

    // Phase 2: restore each row's full pre-event snapshot (including deleted_at, which
    // re-enters live rows into the index) in one CASE-mapped bulk UPDATE. Targets are all
    // free because Phase 1 vacated every touched row.
    const restorable = events.filter((e) => e.bookingBefore !== null);
    if (restorable.length) {
      const snap = (e: (typeof events)[number]) => e.bookingBefore as Snapshot;
      const col = <K extends keyof Snapshot>(key: K) =>
        sql.join(
          restorable.map((e) => sql`WHEN ${snap(e).id} THEN ${snap(e)[key]}`),
          sql` `,
        );

      await tx.execute(sql`
        UPDATE bookings
        SET unit_id = CASE id ${col("unitId")} END,
            date = (CASE id ${col("date")} END)::date,
            site_id = (CASE id ${col("siteId")} END)::int,
            status = CASE id ${col("status")} END,
            notes = CASE id ${col("notes")} END,
            published_at = (CASE id ${col("publishedAt")} END)::timestamptz,
            published_by = (CASE id ${col("publishedBy")} END)::int,
            deleted_at = (CASE id ${col("deletedAt")} END)::timestamptz,
            deleted_by = (CASE id ${col("deletedBy")} END)::int,
            updated_by = ${actor.id},
            updated_at = now()
        WHERE id IN (${sql.join(
          restorable.map((e) => sql`${snap(e).id}`),
          sql`, `,
        )})
      `);
    }

    const afterRows = await tx.select().from(bookings).where(sql`${bookings.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
    const afterById = new Map(afterRows.map((r) => [r.id, r]));

    const newBatchId = randomUUID();
    await tx.insert(bookingEvents).values(
      events.map((e) => {
        const after = e.bookingAfter as Snapshot | null;
        const before = e.bookingBefore as Snapshot | null;
        const rowId = after?.id ?? before!.id;
        return {
          actorId: actor.id,
          action: inverseAction(e.action),
          batchId: newBatchId,
          bookingBefore: e.bookingAfter,
          bookingAfter: afterById.get(rowId) ?? null,
        };
      }),
    );

    revalidatePath("/");
    const n = new Set(events.map((e) => (e.bookingAfter as Snapshot | null)?.id ?? (e.bookingBefore as Snapshot).id)).size;
    return { ok: true, message: `Undone — ${n} booking${n > 1 ? "s" : ""} reverted`, newBatchId };
  });
}
