"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents, bookingStatuses, companies, units } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { getUnitRegistrations } from "@/lib/db/unit-labels";
import { getTmsBookings } from "@/lib/db/tms/booking-cache";
import { classifyForPublish, type PublishExclusionReason } from "@/lib/publish-eligibility";

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

    const candidateRows: BookingRow[] = [];
    for (const t of targets) {
      const [row] = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.unitId, t.unitId), eq(bookings.date, t.date), isNull(bookings.deletedAt)))
        .limit(1);
      if (!row) continue;
      // Hard company scoping (docs/DECISIONS.md #22) — silently drop, same as any other
      // ineligible target, rather than a distinct error that would confirm cross-company
      // data exists at that unit/date.
      if (!companyAllowed(actor.companyAccess, row.companyId)) continue;
      candidateRows.push(row);
    }

    // TMS-supersede check (docs/OVERLAY_BUILD_PLAN.md C3/D1) — a booking TMS has changed
    // since it was amended must not be forwarded until a scheduler has looked at it
    // (lib/db/tms/overlay.ts computes the same comparison for the ↻ badge; this is the
    // server re-deriving it fresh at publish time rather than trusting a client-sent flag).
    // Grouped by company so each company's TMS cache is read at most once per call.
    const companyIds = [...new Set(candidateRows.map((r) => r.companyId))];
    const tmsCompanyIdByLocal = new Map(
      companyIds.length
        ? (
            await tx
              .select({ id: companies.id, tmsCompanyId: companies.tmsCompanyId })
              .from(companies)
              .where(inArray(companies.id, companyIds))
          ).map((c) => [c.id, c.tmsCompanyId])
        : [],
    );
    const tmsSupersedesById = new Map<number, boolean>();
    // Stage B4 — re-derived fresh here for the same reason tmsSupersedes is: the grid's flag
    // is a client-sent value computed against whatever the 5-minute cache held on THAT
    // request, and could be stale relative to what's true right now. A row is a collision
    // when TMS holds a DIFFERENT, unlinked booking on this exact unit+date — including a
    // booking that showed up in TMS after this row was created, which is exactly the gap the
    // client hit: a booking added straight into TMS, bypassing the planner entirely.
    const tmsCollisionById = new Map<number, boolean>();
    for (const companyId of companyIds) {
      const tmsCompanyId = tmsCompanyIdByLocal.get(companyId);
      if (!tmsCompanyId) continue;
      const rowsForCompany = candidateRows.filter((r) => r.companyId === companyId);
      if (!rowsForCompany.length) continue;
      const { bookings: tmsBookings } = await getTmsBookings(tmsCompanyId);
      const tmsById = new Map(tmsBookings.map((b) => [b.id, b]));
      const unitIdByTmsUnitId = new Map(
        (
          await tx
            .select({ id: units.id, tmsUnitId: units.tmsUnitId })
            .from(units)
            .where(and(eq(units.companyId, companyId), isNull(units.deletedAt), isNotNull(units.tmsUnitId)))
        ).map((u) => [u.tmsUnitId as number, u.id]),
      );
      const tmsBookingsBySlot = new Map<string, (typeof tmsBookings)[number][]>();
      for (const tb of tmsBookings) {
        const localUnitId = unitIdByTmsUnitId.get(tb.unitId);
        if (localUnitId === undefined) continue;
        const key = `${localUnitId}|${tb.date}`;
        const existing = tmsBookingsBySlot.get(key);
        if (existing) existing.push(tb);
        else tmsBookingsBySlot.set(key, [tb]);
      }
      for (const row of rowsForCompany) {
        if (row.tmsBookingId !== null) {
          const tmsBooking = tmsById.get(row.tmsBookingId);
          const supersedes = !!(tmsBooking && row.tmsUpdatedAt && tmsBooking.updatedAt.getTime() !== row.tmsUpdatedAt.getTime());
          tmsSupersedesById.set(row.id, supersedes);
        }
        const atSlot = tmsBookingsBySlot.get(`${row.unitId}|${row.date}`) ?? [];
        const collides = atSlot.some((tb) => tb.id !== row.tmsBookingId);
        tmsCollisionById.set(row.id, collides);
      }
    }

    const rows: BookingRow[] = [];
    const skippedByReason: Partial<Record<PublishExclusionReason, number>> = {};
    for (const row of candidateRows) {
      const result = classifyForPublish(
        {
          status: row.status,
          publishedAt: row.publishedAt,
          tmsConflictAt: row.tmsConflictAt,
          tmsSupersedes: tmsSupersedesById.get(row.id) ?? false,
          tmsCollision: tmsCollisionById.get(row.id) ?? false,
        },
        publishableKeys,
      );
      if (result.eligible) {
        rows.push(row);
      } else if (result.reason !== "already-published") {
        // Already-published is routine (re-sweeping a range that includes locked bookings is
        // expected, SPEC.md §2b) and never counted as an exception. The other three reasons
        // are genuine "something needs resolving" cases — surfaced in the message.
        skippedByReason[result.reason] = (skippedByReason[result.reason] ?? 0) + 1;
      }
    }

    if (!rows.length) {
      const parts: string[] = [];
      if (skippedByReason["tms-supersedes"]) parts.push(`${skippedByReason["tms-supersedes"]} need a TMS update resolved`);
      if (skippedByReason["tms-collision"]) parts.push(`${skippedByReason["tms-collision"]} clash with a different TMS booking`);
      if (skippedByReason["tms-conflict"]) parts.push(`${skippedByReason["tms-conflict"]} have an unresolved TMS conflict`);
      if (skippedByReason["not-publishable-status"]) parts.push(`${skippedByReason["not-publishable-status"]} still need to be Confirmed`);
      const message = parts.length ? `Nothing published — ${parts.join(", ")}.` : "Nothing to publish — those bookings are already published.";
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
