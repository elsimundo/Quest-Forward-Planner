"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, bookingEvents, units, sites, companies } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { logCompanyAccessDenied } from "@/lib/audit/security-log";
import { getTmsBookings } from "@/lib/db/tms/booking-cache";
import { localStatusKeyForTmsStatus } from "@/lib/db/tms/status-map";

const EDITOR_ROLES = ["scheduler", "admin", "super_admin"] as const;

// Stage C3 of docs/OVERLAY_BUILD_PLAN.md — resolving OverlayBooking.tmsSupersedes (computed
// in lib/db/tms/overlay.ts by comparing the amendment's recorded tmsUpdatedAt against TMS's
// live value). TMS changed a booking a scheduler had already amended; someone has to decide
// which version wins, because the merge can't (docs/TMS_WRITE_BACK.md §5: "TMS wins" is the
// FALLBACK when nobody looks — this is what looking does).
export type ResolveTmsSupersedeInput = {
  unitId: number;
  date: string;
  // "keep" — the scheduler's edit stands; just acknowledge TMS's change so the flag clears
  // until TMS changes again. "accept-tms" — drop the scheduler's edit and adopt TMS's
  // current site/status/notes/position instead.
  resolution: "keep" | "accept-tms";
  expectedUpdatedAt: string;
};

export type ResolveTmsSupersedeResult =
  | { ok: true; message: string; batchId: string }
  | { ok: false; error: string; code: "PERMISSION" | "VALIDATION" | "CONFLICT" | "NOT_FOUND" };

export async function resolveTmsSupersede(input: ResolveTmsSupersedeInput): Promise<ResolveTmsSupersedeResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.unitId, input.unitId), eq(bookings.date, input.date), isNull(bookings.deletedAt)))
      .limit(1);

    // No amendment, or an amendment with nothing to compare against TMS — there's nothing
    // here for this action to resolve.
    if (!existing || existing.tmsBookingId === null) {
      return { ok: false, error: "Nothing to resolve here.", code: "NOT_FOUND" };
    }
    if (!companyAllowed(actor.companyAccess, existing.companyId)) {
      logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: existing.companyId, resource: "tms_resolve" });
      return { ok: false, error: "Nothing to resolve here.", code: "NOT_FOUND" };
    }
    if (input.expectedUpdatedAt !== existing.updatedAt.toISOString()) {
      return {
        ok: false,
        error: "This booking changed since you opened it — refresh and try again.",
        code: "CONFLICT",
      };
    }

    const [company] = await tx
      .select({ tmsCompanyId: companies.tmsCompanyId })
      .from(companies)
      .where(eq(companies.id, existing.companyId))
      .limit(1);
    if (!company?.tmsCompanyId) return { ok: false, error: "Nothing to resolve here.", code: "NOT_FOUND" };

    const { bookings: tmsBookings, statusNameById } = await getTmsBookings(company.tmsCompanyId);
    const tmsBooking = tmsBookings.find((b) => b.id === existing.tmsBookingId);
    if (!tmsBooking) {
      return { ok: false, error: "That TMS booking no longer exists — refresh and try again.", code: "CONFLICT" };
    }

    // Someone else resolved it (or TMS's change was itself reverted) between page load and
    // this click — the flag the user was reacting to no longer applies.
    if (existing.tmsUpdatedAt && existing.tmsUpdatedAt.getTime() === tmsBooking.updatedAt.getTime()) {
      return { ok: false, error: "Already up to date — nothing to resolve.", code: "VALIDATION" };
    }

    const [unit] = await tx
      .select({ registration: units.registration })
      .from(units)
      .where(eq(units.id, existing.unitId))
      .limit(1);

    const batchId = randomUUID();
    const now = new Date();

    if (input.resolution === "keep") {
      // Nothing about the booking itself changes — only the watermark, so this stops being
      // flagged until TMS changes it again. This IS the scheduler's decision, so it's still
      // an audited "update", not a no-op.
      const [updated] = await tx
        .update(bookings)
        .set({ tmsUpdatedAt: tmsBooking.updatedAt, updatedBy: actor.id, updatedAt: now })
        .where(eq(bookings.id, existing.id))
        .returning();
      await tx.insert(bookingEvents).values({
        actorId: actor.id,
        action: "update",
        batchId,
        bookingBefore: { ...existing, unitRegistration: unit?.registration },
        bookingAfter: { ...updated, unitRegistration: unit?.registration },
      });
      revalidatePath("/");
      return { ok: true, message: "Kept your version.", batchId };
    }

    // accept-tms — adopt TMS's current site, status, notes, tags, and position wholesale.
    const [tmsUnitLocal] = await tx
      .select({ id: units.id, registration: units.registration })
      .from(units)
      .where(and(eq(units.companyId, existing.companyId), eq(units.tmsUnitId, tmsBooking.unitId), isNull(units.deletedAt)))
      .limit(1);
    if (!tmsUnitLocal) {
      return { ok: false, error: "Can't resolve — TMS's unit for this booking isn't linked yet.", code: "VALIDATION" };
    }
    const [site] = await tx
      .select({ id: sites.id })
      .from(sites)
      .where(and(eq(sites.companyId, existing.companyId), eq(sites.tmsLocationId, tmsBooking.locationId), isNull(sites.deletedAt)))
      .limit(1);
    if (!site) {
      return { ok: false, error: "Can't resolve — TMS's site for this booking isn't linked yet.", code: "VALIDATION" };
    }

    // TMS's current position can differ from where the amendment currently sits (TMS moved
    // its own booking to a different unit/date since we amended it). If that slot is already
    // occupied by a DIFFERENT live local row, adopting TMS's position here would collide —
    // hand it back rather than silently overwriting or auto-resolving someone else's booking.
    const positionChanged = tmsUnitLocal.id !== existing.unitId || tmsBooking.date !== existing.date;
    if (positionChanged) {
      const [occupant] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.unitId, tmsUnitLocal.id), eq(bookings.date, tmsBooking.date), isNull(bookings.deletedAt)))
        .limit(1);
      if (occupant && occupant.id !== existing.id) {
        return {
          ok: false,
          error: `TMS's current slot for this booking (${tmsUnitLocal.registration} · ${tmsBooking.date}) is already occupied here — resolve that clash first.`,
          code: "CONFLICT",
        };
      }
    }

    const { key: statusKey } = localStatusKeyForTmsStatus(tmsBooking.statusId, statusNameById);

    const [updated] = await tx
      .update(bookings)
      .set({
        unitId: tmsUnitLocal.id,
        date: tmsBooking.date,
        siteId: site.id,
        status: statusKey,
        notes: tmsBooking.notes,
        tagIds: tmsBooking.tagIds,
        tmsUpdatedAt: tmsBooking.updatedAt,
        updatedBy: actor.id,
        updatedAt: now,
        tmsConflictAt: null,
      })
      .where(eq(bookings.id, existing.id))
      .returning();

    await tx.insert(bookingEvents).values({
      actorId: actor.id,
      action: "update",
      batchId,
      bookingBefore: { ...existing, unitRegistration: unit?.registration },
      bookingAfter: { ...updated, unitRegistration: tmsUnitLocal.registration },
    });

    revalidatePath("/");
    return { ok: true, message: "Updated to TMS's version.", batchId };
  });
}
