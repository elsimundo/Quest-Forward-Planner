"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents, units, type BookingAction } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { getUnitRegistrations } from "@/lib/db/unit-labels";

const EDITOR_ROLES = ["scheduler", "admin", "super_admin"] as const;

export type MoveSpec = { fromUnitId: number; fromDate: string; toUnitId: number; toDate: string };
export type MoveMode = "move" | "swap" | "overwrite";

export type MoveBookingsResult =
  | { ok: true; message: string; batchId: string }
  | { ok: false; error: string; code: "PERMISSION" | "VALIDATION" | "LOCKED" | "CONFLICT" };

type BookingRow = typeof bookings.$inferSelect;

// Repositioning has to survive swaps and day-shift chains where a row's target is
// still occupied by another row that hasn't been repositioned yet. Postgres enforces a
// unique index *per row* as an UPDATE scans, not against the statement's final state —
// and `bookings_unit_date_live_unique` is a *partial* index (WHERE deleted_at IS NULL),
// which can't be made DEFERRABLE. So a single one-shot UPDATE collides. We instead park
// every moving row in a collision-free sentinel range first (each date shifted far into
// the future, preserving distinctness), which vacates every original slot; then place
// each row at its final (unit_id, date), all now guaranteed empty. No transient clash in
// either pass. Both statements run inside the caller's transaction.
const SENTINEL_DAY_OFFSET = 365000; // ~999 years — no real booking lives out there

async function bulkReposition(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  updates: { id: number; unitId: number; date: string; wasConflicted: boolean }[],
  actorId: number,
) {
  if (!updates.length) return;
  const ids = sql.join(
    updates.map((u) => sql`${u.id}`),
    sql`, `,
  );

  // Pass 1 — park each row far in the future, freeing its original slot. The uniform
  // offset keeps the moving rows distinct from each other, and nothing lives out there.
  await tx.execute(sql`
    UPDATE bookings
    SET date = date + ${SENTINEL_DAY_OFFSET}::integer
    WHERE id IN (${ids})
  `);

  // Pass 2 — drop each row into its final slot (every target is empty after pass 1).
  const unitCases = sql.join(
    updates.map((u) => sql`WHEN ${u.id} THEN ${u.unitId}::integer`),
    sql` `,
  );
  const dateCases = sql.join(
    updates.map((u) => sql`WHEN ${u.id} THEN ${u.date}::date`),
    sql` `,
  );
  // Moving a booking counts as a scheduler resolving any outstanding TMS conflict on it
  // (docs/DECISIONS.md #21) — but tms_imported_at only resets for rows that WERE
  // conflicted. Resetting it unconditionally on every move would make the import's "has
  // this been locally edited since we last looked" check always say "no" right after a
  // routine move, letting the next import silently snap the booking back to wherever TMS
  // still thinks it is. Same reasoning as lib/actions/bookings.ts's saveBooking.
  const wasConflictedIds = updates.filter((u) => u.wasConflicted).map((u) => u.id);
  const tmsImportedAtSet = wasConflictedIds.length
    ? sql`tms_imported_at = CASE WHEN id IN (${sql.join(wasConflictedIds.map((id) => sql`${id}`), sql`, `)}) THEN now() ELSE tms_imported_at END,`
    : sql``;
  await tx.execute(sql`
    UPDATE bookings
    SET unit_id = CASE id ${unitCases} END,
        date = (CASE id ${dateCases} END),
        updated_by = ${actorId},
        updated_at = now(),
        ${tmsImportedAtSet}
        tms_conflict_at = null
    WHERE id IN (${ids})
  `);
}

async function logEvents(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  batchId: string,
  actorId: number,
  entries: { action: BookingAction; before: BookingRow; after: BookingRow | null }[],
) {
  if (!entries.length) return;
  // A move/swap can change WHICH unit a row is on, so before/after can legitimately name
  // different units for the same row — resolve each snapshot's registration from its own
  // unitId, not a single row-level label (docs/TMS_INTEGRATION_PLAN.md §4.1).
  const registrationById = await getUnitRegistrations(
    tx,
    entries.flatMap((e) => [e.before.unitId, e.after?.unitId]).filter((id): id is number => typeof id === "number"),
  );
  await tx.insert(bookingEvents).values(
    entries.map((e) => ({
      actorId,
      action: e.action,
      batchId,
      bookingBefore: { ...e.before, unitRegistration: registrationById.get(e.before.unitId) },
      bookingAfter: e.after ? { ...e.after, unitRegistration: registrationById.get(e.after.unitId) } : null,
    })),
  );
}

export async function moveBookings(moves: MoveSpec[], mode: MoveMode): Promise<MoveBookingsResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to move bookings.", code: "PERMISSION" };
  if (!moves.length) return { ok: false, error: "Nothing to move.", code: "VALIDATION" };

  return db.transaction(async (tx) => {
    const sourceKey = (m: MoveSpec) => `${m.fromUnitId}|${m.fromDate}`;
    const sourceKeys = new Set(moves.map(sourceKey));

    const sources = await Promise.all(
      moves.map(async (m) => {
        const [row] = await tx
          .select()
          .from(bookings)
          .where(and(eq(bookings.unitId, m.fromUnitId), eq(bookings.date, m.fromDate), isNull(bookings.deletedAt)))
          .limit(1);
        return row;
      }),
    );
    if (sources.some((s) => !s)) {
      return { ok: false, error: "One of the selected bookings no longer exists — refresh and try again.", code: "CONFLICT" };
    }
    // Hard company scoping (docs/DECISIONS.md #22) — every source booking, and every
    // target unit a move lands on, must belong to the actor's allowed company. A move
    // can't cross companies either way: that's not just an access check, it'd also leave
    // a booking's denormalised company_id pointing at the wrong company (§4.3).
    const sourceRows = sources as BookingRow[];
    if (sourceRows.some((s) => !companyAllowed(actor.companyAccess, s.companyId))) {
      return { ok: false, error: "One of the selected bookings no longer exists — refresh and try again.", code: "CONFLICT" };
    }
    const targetUnitIds = [...new Set(moves.map((m) => m.toUnitId))];
    const targetUnits = await tx.select({ id: units.id, companyId: units.companyId }).from(units).where(inArray(units.id, targetUnitIds));
    const targetCompanyById = new Map(targetUnits.map((u) => [u.id, u.companyId]));
    const crossesCompany = moves.some((m, i) => {
      const targetCompanyId = targetCompanyById.get(m.toUnitId);
      return targetCompanyId === undefined || targetCompanyId !== sourceRows[i].companyId;
    });
    if (crossesCompany) {
      return { ok: false, error: "Can't move a booking to a different company's unit.", code: "VALIDATION" };
    }
    if (sources.some((s) => s!.publishedAt)) {
      return { ok: false, error: "Can't move a published/locked booking. Unlock it first.", code: "LOCKED" };
    }

    // Targets that are occupied by something *outside* the moving set are real clashes
    // — a target that coincides with another move's own source isn't a clash, it's just
    // the rigid-offset shift vacating that slot in the same operation.
    const targets = await Promise.all(
      moves.map(async (m) => {
        if (sourceKeys.has(`${m.toUnitId}|${m.toDate}`)) return null;
        const [row] = await tx
          .select()
          .from(bookings)
          .where(and(eq(bookings.unitId, m.toUnitId), eq(bookings.date, m.toDate), isNull(bookings.deletedAt)))
          .limit(1);
        return row ?? null;
      }),
    );
    const clashes = targets.filter((t): t is BookingRow => !!t);

    if (clashes.length && mode === "move") {
      return {
        ok: false,
        error: "Those slots are no longer free — someone else may have booked them. Refresh and try again.",
        code: "CONFLICT",
      };
    }

    const batchId = randomUUID();
    const repositions: { id: number; unitId: number; date: string; wasConflicted: boolean }[] = [];
    const events: { action: BookingAction; before: BookingRow; after: BookingRow | null }[] = [];

    moves.forEach((m, i) => {
      const source = sources[i]!;
      repositions.push({ id: source.id, unitId: m.toUnitId, date: m.toDate, wasConflicted: source.tmsConflictAt !== null });
      events.push({
        action: mode === "swap" ? "swap" : mode === "overwrite" ? "move" : "move",
        before: source,
        after: null, // filled in after the bulk update, below
      });
    });

    if (mode === "overwrite") {
      const ids = clashes.map((c) => c.id);
      if (ids.length) {
        await tx
          .update(bookings)
          .set({ deletedAt: new Date(), deletedBy: actor.id, updatedAt: new Date(), updatedBy: actor.id })
          .where(sql`${bookings.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
        for (const c of clashes) events.push({ action: "overwrite", before: c, after: null });
      }
    } else if (mode === "swap") {
      // Each clash moves into the vacated origin of the move whose target it occupied.
      moves.forEach((m, i) => {
        const clash = targets[i];
        if (!clash) return;
        repositions.push({ id: clash.id, unitId: m.fromUnitId, date: m.fromDate, wasConflicted: clash.tmsConflictAt !== null });
        events.push({ action: "swap", before: clash, after: null });
      });
    }

    await bulkReposition(tx, repositions, actor.id);

    // Re-select the moved/swapped rows for accurate "after" snapshots in the audit log.
    const movedIds = repositions.map((r) => r.id);
    const afterRows = movedIds.length
      ? await tx.select().from(bookings).where(sql`${bookings.id} IN (${sql.join(movedIds.map((id) => sql`${id}`), sql`, `)})`)
      : [];
    const afterById = new Map(afterRows.map((r) => [r.id, r]));
    for (const e of events) {
      if (e.after === null && afterById.has(e.before.id)) e.after = afterById.get(e.before.id)!;
    }

    await logEvents(tx, batchId, actor.id, events);

    revalidatePath("/");
    const n = moves.length;
    const label =
      mode === "swap"
        ? `Swapped ${n} booking${n > 1 ? "s" : ""}`
        : mode === "overwrite"
          ? `Overwritten — moved ${n} booking${n > 1 ? "s" : ""}`
          : `Moved ${n} booking${n > 1 ? "s" : ""}`;
    return { ok: true, message: label, batchId };
  });
}
