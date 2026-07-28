"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents, bookingStatuses, units } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { getUnitRegistrations } from "@/lib/db/unit-labels";

// Publishing (forwarding to TMS) is day-to-day scheduling work — scheduler and up.
const PUBLISH_ROLES = ["scheduler", "admin", "super_admin"] as const;
// Unlocking a forwarded booking is the admin-only safety valve (SPEC.md §2b).
const UNLOCK_ROLES = ["admin", "super_admin"] as const;

type BookingRow = typeof bookings.$inferSelect;

export type PublishTarget = { unitId: number; date: string };

export type PublishResult =
  | { ok: true; count: number; batchId: string | null; message: string }
  | { ok: false; error: string; code: "PERMISSION" | "VALIDATION" };

// Publish a set of bookings (from a multi-select or a date-range sweep). Already-published
// and empty cells in the target list are silently skipped — publishing is idempotent, you
// can re-sweep a week without disturbing what's already locked (SPEC.md §2b). Returns a
// batchId only when something actually changed, so the client can push it onto the undo
// stack (publish is undoable — its inverse is the unlock).
export async function publishBookings(targets: PublishTarget[]): Promise<PublishResult> {
  const actor = await requireRole([...PUBLISH_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to publish bookings.", code: "PERMISSION" };
  if (!targets.length) return { ok: true, count: 0, batchId: null, message: "Nothing to publish." };

  return db.transaction(async (tx) => {
    // Publishability is admin-managed data (booking_statuses.publishable, migration 0012),
    // not a hardcoded list — read it once per call rather than per target. A status key
    // missing from the catalogue is treated as NOT publishable: forwarding to TMS is the
    // consequential direction, so an unknown key fails closed.
    const publishableKeys = new Set(
      (
        await tx
          .select({ key: bookingStatuses.key })
          .from(bookingStatuses)
          .where(and(eq(bookingStatuses.publishable, true), isNull(bookingStatuses.deletedAt)))
      ).map((r) => r.key),
    );

    const rows: BookingRow[] = [];
    let conflictedSkipped = 0;
    let notConfirmedSkipped = 0;
    for (const t of targets) {
      const [row] = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.unitId, t.unitId), eq(bookings.date, t.date), isNull(bookings.deletedAt)))
        .limit(1);
      if (!row || row.publishedAt) continue;
      // Hard company scoping (docs/DECISIONS.md #22) — silently skip, same as any other
      // ineligible target, rather than a distinct error that would confirm cross-company
      // data exists at that unit/date.
      if (!companyAllowed(actor.companyAccess, row.companyId)) continue;
      // A booking with an outstanding TMS conflict (docs/DECISIONS.md #21) shouldn't be
      // forwarded as final until a scheduler has actually looked at it — publishing past
      // a known TMS disagreement would just forward whichever side happened to win the
      // race, silently. Resolve it (edit or move it) first.
      if (row.tmsConflictAt) {
        conflictedSkipped++;
        continue;
      }
      // Only a status an admin has marked publishable is final enough to forward —
      // client-confirmed (docs/DECISIONS.md #24), now admin-editable (docs/TMS_WRITE_BACK.md
      // §3.3). Out of the box that's `confirmed` and its weekend/bank-holiday calendar forms;
      // everything still "in discussion" stays sandbox-only until a scheduler moves it on.
      if (!publishableKeys.has(row.status)) {
        notConfirmedSkipped++;
        continue;
      }
      rows.push(row);
    }

    if (!rows.length) {
      const message = conflictedSkipped
        ? `Nothing published — ${conflictedSkipped} booking${conflictedSkipped > 1 ? "s" : ""} still ${conflictedSkipped > 1 ? "have" : "has"} an unresolved TMS conflict.`
        : notConfirmedSkipped
          ? `Nothing published — ${notConfirmedSkipped} booking${notConfirmedSkipped > 1 ? "s" : ""} still ${notConfirmedSkipped > 1 ? "need" : "needs"} to be Confirmed first.`
          : "Nothing to publish — those bookings are already published.";
      return { ok: true, count: 0, batchId: null, message };
    }

    const now = new Date();
    const ids = rows.map((r) => r.id);
    const updated = await tx
      .update(bookings)
      .set({ publishedAt: now, publishedBy: actor.id, updatedAt: now, updatedBy: actor.id })
      .where(sql`${bookings.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
      .returning();
    const updatedById = new Map(updated.map((r) => [r.id, r]));

    // Publish never changes which unit a booking is on, so before/after share a registration.
    const registrationById = await getUnitRegistrations(tx, rows.map((r) => r.unitId));

    const batchId = randomUUID();
    await tx.insert(bookingEvents).values(
      rows.map((before) => {
        const after = updatedById.get(before.id) ?? null;
        const unitRegistration = registrationById.get(before.unitId);
        return {
          actorId: actor.id,
          action: "publish" as const,
          batchId,
          bookingBefore: { ...before, unitRegistration },
          bookingAfter: after ? { ...after, unitRegistration } : null,
        };
      }),
    );

    revalidatePath("/");
    const n = rows.length;
    return { ok: true, count: n, batchId, message: `Published ${n} booking${n > 1 ? "s" : ""} to TMS` };
  });
}

export type UnpublishResult =
  | { ok: true; batchId: string; message: string }
  | { ok: false; error: string; code: "PERMISSION" | "NOT_FOUND" | "VALIDATION" };

// Unlock a single published booking — the admin override for "TMS already has the old
// version, we need to fix a mistake" (SPEC.md §2b). Clears published_at/by and logs an
// `unpublish` event; it does NOT notify TMS (that's the separate write-integration, §13.1).
export async function unpublishBooking(target: PublishTarget): Promise<UnpublishResult> {
  const actor = await requireRole([...UNLOCK_ROLES]);
  if (!actor) return { ok: false, error: "Only an admin can unlock a published booking.", code: "PERMISSION" };

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.unitId, target.unitId), eq(bookings.date, target.date), isNull(bookings.deletedAt)))
      .limit(1);

    if (!existing) return { ok: false, error: "Booking not found.", code: "NOT_FOUND" };
    if (!companyAllowed(actor.companyAccess, existing.companyId)) {
      return { ok: false, error: "Booking not found.", code: "NOT_FOUND" };
    }
    if (!existing.publishedAt) return { ok: false, error: "That booking isn't published.", code: "VALIDATION" };

    const now = new Date();
    const [updated] = await tx
      .update(bookings)
      .set({ publishedAt: null, publishedBy: null, updatedAt: now, updatedBy: actor.id })
      .where(eq(bookings.id, existing.id))
      .returning();

    const [unit] = await tx.select({ registration: units.registration }).from(units).where(eq(units.id, existing.unitId)).limit(1);

    const batchId = randomUUID();
    await tx.insert(bookingEvents).values({
      actorId: actor.id,
      action: "unpublish",
      batchId,
      bookingBefore: { ...existing, unitRegistration: unit?.registration },
      bookingAfter: { ...updated, unitRegistration: unit?.registration },
    });

    revalidatePath("/");
    return { ok: true, batchId, message: `Unlocked — ${unit?.registration ?? "unit"} on ${target.date} is editable again` };
  });
}
