"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents, type BookingAction } from "@/lib/db/schema";
import { requireRole, type AuthedUser } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { logCompanyAccessDenied } from "@/lib/audit/security-log";
import { getUnitRegistrations } from "@/lib/db/unit-labels";

const EDITOR_ROLES = ["scheduler", "admin", "super_admin"] as const;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Where each touched booking sits once the undo has been applied — i.e. the cells the grid
 * should take the scheduler back to. Read from the rows AFTER the restore, not from the
 * event snapshots, so a move that's been reverted names the origin it went back to rather
 * than the destination it came from.
 *
 * An undone `create` leaves a soft-deleted row, and its unit/date still name the cell that
 * just emptied — which is exactly the cell worth looking at, so those are kept too.
 */
export type UndoTarget = { unitId: number; date: string };

export type UndoResult =
  | { ok: true; message: string; newBatchId: string; count: number; targets: UndoTarget[] }
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
  unitId: number;
  // Present on every real row (bookings.companyId/modalityId are NOT NULL) but never
  // written by the restore below — company/modality never change on an existing booking,
  // so they're already correct on the row untouched by phase 1's soft-delete or phase 2's
  // restore (docs/TMS_INTEGRATION_PLAN.md §4.3). Kept here for an accurate type only.
  companyId: number;
  modalityId: number;
  date: string;
  siteId: number;
  // A key into the admin-managed status catalogue (docs/DECISIONS.md #18) — free text,
  // not the old fixed enum.
  status: string;
  notes: string | null;
  // Generator tracking (docs/DECISIONS.md) — must round-trip through undo like every other
  // booking field, or undoing an unrelated later edit leaves a stale generator selection in
  // place instead of reverting to what this snapshot actually had.
  generatorProviderKey: string | null;
  generatorProviderOther: string | null;
  updatedAt: string;
  publishedAt: string | null;
  publishedBy: number | null;
  deletedAt: string | null;
  deletedBy: number | null;
};

export async function undoBatch(batchId: string): Promise<UndoResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to undo changes.", code: "PERMISSION" };

  const result = await db.transaction((tx) => undoBatchWithinTx(tx, batchId, actor));
  if (result.ok) revalidatePath("/");
  return result;
}

// The transaction body of `undoBatch`, factored out so `discardUnpublishedChanges`
// (lib/actions/discard-changes.ts) can call it repeatedly inside ONE surrounding
// transaction — role-checked and revalidated once by the caller, not per batch.
export async function undoBatchWithinTx(tx: Tx, batchId: string, actor: AuthedUser): Promise<UndoResult> {
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
  // Hard company scoping (docs/DECISIONS.md #22) — a batchId is opaque to the client, so
  // this is the one place undo can be probed cross-company; refuse if ANY row it touches
  // isn't in the actor's allowed company, same as "not found" everywhere else.
  const deniedRows = currentRows.filter((r) => !companyAllowed(actor.companyAccess, r.companyId));
  if (deniedRows.length > 0) {
    for (const r of deniedRows) {
      logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: r.companyId, resource: "undo_batch" });
    }
    return { ok: false, error: "Nothing to undo.", code: "NOT_FOUND" };
  }
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
  //
  // updated_at is restored from the snapshot too, NOT stamped with now() — undoing a row
  // that's been edited more than once has to put updated_at back to exactly what it was
  // right after the PREVIOUS action, because that's the value the conflict check above
  // will compare against when that previous action's batch is undone next. Stamping now()
  // here would permanently sever that chain: every undo after the first on the same row
  // would fail as a false CONFLICT ("changed since then"), even though nothing but this
  // same undo sequence touched it.
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
      SET unit_id = (CASE id ${col("unitId")} END)::int,
          date = (CASE id ${col("date")} END)::date,
          site_id = (CASE id ${col("siteId")} END)::int,
          status = CASE id ${col("status")} END,
          notes = CASE id ${col("notes")} END,
          generator_provider_key = CASE id ${col("generatorProviderKey")} END,
          generator_provider_other = CASE id ${col("generatorProviderOther")} END,
          published_at = (CASE id ${col("publishedAt")} END)::timestamptz,
          published_by = (CASE id ${col("publishedBy")} END)::int,
          deleted_at = (CASE id ${col("deletedAt")} END)::timestamptz,
          deleted_by = (CASE id ${col("deletedBy")} END)::int,
          updated_by = ${actor.id},
          updated_at = (CASE id ${col("updatedAt")} END)::timestamptz
      WHERE id IN (${sql.join(
        restorable.map((e) => sql`${snap(e).id}`),
        sql`, `,
      )})
    `);
  }

  const afterRows = await tx.select().from(bookings).where(sql`${bookings.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
  const afterById = new Map(afterRows.map((r) => [r.id, r]));
  // `e.bookingAfter` (reused below as the new event's "before") already carries whatever
  // unitRegistration the ORIGINAL action wrote — only the freshly-selected `afterRows`
  // need enriching here, since those are raw rows straight from the table.
  const registrationById = await getUnitRegistrations(tx, afterRows.map((r) => r.unitId));

  const newBatchId = randomUUID();
  await tx.insert(bookingEvents).values(
    events.map((e) => {
      const after = e.bookingAfter as Snapshot | null;
      const before = e.bookingBefore as Snapshot | null;
      const rowId = after?.id ?? before!.id;
      const newAfterRow = afterById.get(rowId);
      return {
        actorId: actor.id,
        action: inverseAction(e.action),
        batchId: newBatchId,
        bookingBefore: e.bookingAfter,
        bookingAfter: newAfterRow ? { ...newAfterRow, unitRegistration: registrationById.get(newAfterRow.unitId) } : null,
      };
    }),
  );

  const n = new Set(events.map((e) => (e.bookingAfter as Snapshot | null)?.id ?? (e.bookingBefore as Snapshot).id)).size;
  const targets: UndoTarget[] = afterRows.map((r) => ({ unitId: r.unitId, date: r.date }));
  return { ok: true, message: `Undone — ${n} booking${n > 1 ? "s" : ""} reverted`, newBatchId, count: n, targets };
}
