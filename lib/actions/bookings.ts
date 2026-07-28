"use server";

import { randomUUID } from "node:crypto";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  bookings,
  bookingEvents,
  bookingStatuses,
  units,
  unitModalities,
  sites,
  unitSpecs,
  siteCapabilityRequirements,
  users,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { computeCapabilityWarnings, type CapabilityWarning } from "@/lib/capability-matching";
import { nextBookingRef } from "@/lib/db/booking-ref";
import { resolveTmsBookingAt } from "@/lib/db/tms/overlay";

const EDITOR_ROLES = ["scheduler", "admin", "super_admin"] as const;

// A status is settable from the drawer only if it's an active, user-pickable (non
// calendar-derived) row in the admin-managed catalogue (docs/DECISIONS.md #18). Checked
// server-side against the live table, never a hardcoded list — UI gating isn't the boundary.
async function isSettableStatus(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  key: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ key: bookingStatuses.key })
    .from(bookingStatuses)
    .where(
      and(
        eq(bookingStatuses.key, key),
        eq(bookingStatuses.editable, true),
        eq(bookingStatuses.active, true),
        isNull(bookingStatuses.deletedAt),
      ),
    )
    .limit(1);
  return !!row;
}

// SPEC.md §11: the conflict toast should name who got there first ("changed by [name]"),
// not just say "someone else" — worth the extra lookup since it's the whole point of
// telling the user what happened instead of silently rejecting the save.
async function nameOfEditor(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: number): Promise<string> {
  const [row] = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.name ?? "someone else";
}

export type SaveBookingInput = {
  unitId: number;
  date: string;
  site: { id: number } | { name: string };
  // A status key from the admin-managed catalogue — validated server-side against the live
  // table inside the transaction, not a fixed enum.
  status: string;
  notes: string;
  // The active sheet's modality — only load-bearing when CREATING a booking (it stamps
  // bookings.modalityId, docs/TMS_INTEGRATION_PLAN.md §4.3). Always validated server-side
  // against the unit's actual unit_modalities tags, never trusted as-is — a unit can carry
  // more than one modality, so this confirms the unit really belongs on the sheet it was
  // booked from rather than accepting whatever the client claims.
  modalityId: number;
  // ISO string of the booking's updated_at as loaded in the drawer — null when creating
  // a new booking. Used for the optimistic-lock check (SPEC.md §11).
  expectedUpdatedAt: string | null;
};

export type SaveBookingResult =
  | { ok: true; message: string; warnings: CapabilityWarning[]; batchId: string }
  | { ok: false; error: string; code: "PERMISSION" | "CONFLICT" | "LOCKED" | "VALIDATION" };

export async function saveBooking(input: SaveBookingInput): Promise<SaveBookingResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };

  return db.transaction(async (tx) => {
    if (!(await isSettableStatus(tx, input.status))) {
      return { ok: false, error: "Invalid status.", code: "VALIDATION" };
    }

    const [unit] = await tx
      .select({ id: units.id, registration: units.registration, companyId: units.companyId })
      .from(units)
      .where(and(eq(units.id, input.unitId), isNull(units.deletedAt)))
      .limit(1);
    if (!unit) return { ok: false, error: "Unit not found.", code: "VALIDATION" };
    // Hard company scoping (docs/DECISIONS.md #22) — a non-super_admin can only ever act
    // on their own company's units, regardless of what unitId the client sends.
    if (!companyAllowed(actor.companyAccess, unit.companyId)) {
      return { ok: false, error: "Unit not found.", code: "VALIDATION" };
    }

    // The unit must actually be tagged for the modality it's being booked on — defense in
    // depth against a stale or spoofed client-supplied modalityId, not just a UX signal
    // (docs/TMS_INTEGRATION_PLAN.md §4.3).
    const [tag] = await tx
      .select({ id: unitModalities.id })
      .from(unitModalities)
      .where(and(eq(unitModalities.unitId, input.unitId), eq(unitModalities.modalityId, input.modalityId)))
      .limit(1);
    if (!tag) return { ok: false, error: "This unit isn't tagged for that modality.", code: "VALIDATION" };

    // Resolve the site — existing by id, or free-text (exact case-insensitive match
    // reused, otherwise a new pending-review site is created — SPEC.md §5).
    let site: { id: number; name: string };
    if ("id" in input.site) {
      // Company-scoped (docs/DECISIONS.md #22, #11) — without this, a client-supplied site
      // id from a DIFFERENT company would silently attach the booking to it. Harmless while
      // only one company existed; a real cross-company leak now that more than one does.
      const [row] = await tx
        .select({ id: sites.id, name: sites.name })
        .from(sites)
        .where(and(eq(sites.id, input.site.id), eq(sites.companyId, unit.companyId), isNull(sites.deletedAt)))
        .limit(1);
      if (!row) return { ok: false, error: "Selected site not found.", code: "VALIDATION" };
      site = row;
    } else {
      const trimmed = input.site.name.trim();
      if (!trimmed) return { ok: false, error: "Site is required.", code: "VALIDATION" };
      // Company-scoped for the same reason as above — `sites.name` is only unique within a
      // company (docs/DECISIONS.md #11), so two companies can share a name (confirmed live:
      // "LCS Tesco Harrow" exists under both InHealth and Quest Power). Without this filter,
      // typing a name that happens to match another company's site would silently attach
      // this booking to THAT site instead of creating (or finding) this company's own.
      const [existingSite] = await tx
        .select({ id: sites.id, name: sites.name })
        .from(sites)
        .where(and(isNull(sites.deletedAt), eq(sites.companyId, unit.companyId), ilike(sites.name, trimmed)))
        .limit(1);
      if (existingSite) {
        site = existingSite;
      } else {
        const [created] = await tx
          .insert(sites)
          .values({ name: trimmed, companyId: unit.companyId, pendingReview: true })
          .returning({ id: sites.id, name: sites.name });
        site = created;
      }
    }

    const [existingBooking] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.unitId, input.unitId), eq(bookings.date, input.date), isNull(bookings.deletedAt)))
      .limit(1);

    // Under the overlay, the cell may be occupied by a TMS booking we hold no row for
    // (docs/OVERLAY_BUILD_PLAN.md C2). Saving over it must create an AMENDMENT carrying that
    // booking's tms_booking_id — a free-standing local row would leave the TMS original
    // unclaimed, and the merge would then render both in the same cell.
    const tmsAtSlot = existingBooking
      ? null
      : await resolveTmsBookingAt(unit.companyId, input.unitId, input.date);

    // A previously CLEARED TMS booking is a soft-deleted row still holding that
    // tms_booking_id, which is UNIQUE — so re-booking that slot has to revive the existing
    // row rather than insert a second one, which would violate the constraint.
    const [suppressed] = tmsAtSlot
      ? await tx
          .select()
          .from(bookings)
          .where(eq(bookings.tmsBookingId, tmsAtSlot.tmsBookingId))
          .limit(1)
      : [];

    if (existingBooking?.publishedAt) {
      return { ok: false, error: "This booking is published and locked. Unlock it first.", code: "LOCKED" };
    }

    if (existingBooking && input.expectedUpdatedAt !== existingBooking.updatedAt.toISOString()) {
      const name = await nameOfEditor(tx, existingBooking.updatedBy);
      return {
        ok: false,
        error: `This booking was changed by ${name} — refresh to see the latest.`,
        code: "CONFLICT",
      };
    }

    // §2a capability check — logged alongside the audit snapshot, never blocking.
    const [specRows, reqRows] = await Promise.all([
      tx
        .select({ key: unitSpecs.key, value: unitSpecs.value })
        .from(unitSpecs)
        .where(eq(unitSpecs.unitId, input.unitId)),
      tx
        .select({
          requirementKey: siteCapabilityRequirements.requirementKey,
          required: siteCapabilityRequirements.required,
        })
        .from(siteCapabilityRequirements)
        .where(eq(siteCapabilityRequirements.siteId, site.id)),
    ]);
    const specMap: Record<string, string> = {};
    for (const r of specRows) specMap[r.key] = r.value ?? "";
    const warnings = computeCapabilityWarnings(reqRows, specMap, unit.registration, site.name);

    const batchId = randomUUID();
    const notes = input.notes.trim() || null;

    if (existingBooking) {
      // Editing and re-saving a booking is the scheduler's "I've reviewed this" signal —
      // clears any TMS import conflict flag (docs/DECISIONS.md #21), even if this save
      // didn't specifically address whatever TMS wanted to change. tmsImportedAt is reset
      // to this SAME instant as updatedAt (not two separate `new Date()` calls, which could
      // differ by a millisecond) so the import's "has this been locally edited since we
      // last looked" check starts clean from the resolution point, rather than the import
      // immediately re-flagging — or worse, silently reverting the resolution — on its
      // next run. See the "frozen while conflicted" note in lib/db/tms/booking-import.ts.
      const now = new Date();
      const [updated] = await tx
        .update(bookings)
        .set({ siteId: site.id, status: input.status, notes, updatedBy: actor.id, updatedAt: now, tmsConflictAt: null, tmsImportedAt: existingBooking.tmsConflictAt ? now : existingBooking.tmsImportedAt })
        .where(eq(bookings.id, existingBooking.id))
        .returning();
      await tx.insert(bookingEvents).values({
        actorId: actor.id,
        action: "update",
        batchId,
        // Same unit throughout — an edit never changes which unit a booking is on (that's
        // booking-moves.ts's job) — so both snapshots share the one registration.
        bookingBefore: { ...existingBooking, unitRegistration: unit.registration },
        bookingAfter: { ...updated, unitRegistration: unit.registration, capabilityWarnings: warnings },
      });
    } else if (suppressed) {
      // Revive the cleared amendment in place, at the slot being booked.
      const now = new Date();
      const [revived] = await tx
        .update(bookings)
        .set({
          unitId: input.unitId,
          date: input.date,
          siteId: site.id,
          status: input.status,
          notes,
          deletedAt: null,
          deletedBy: null,
          updatedBy: actor.id,
          updatedAt: now,
          tmsConflictAt: null,
        })
        .where(eq(bookings.id, suppressed.id))
        .returning();
      await tx.insert(bookingEvents).values({
        actorId: actor.id,
        action: "create",
        batchId,
        bookingBefore: { ...suppressed, unitRegistration: unit.registration },
        bookingAfter: { ...revived, unitRegistration: unit.registration, capabilityWarnings: warnings },
      });
    } else {
      const [created] = await tx
        .insert(bookings)
        .values({
          bookingRef: await nextBookingRef(tx),
          unitId: input.unitId,
          companyId: unit.companyId,
          modalityId: input.modalityId,
          date: input.date,
          siteId: site.id,
          status: input.status,
          notes,
          createdBy: actor.id,
          updatedBy: actor.id,
          // Claims the TMS booking this cell is showing, when there is one — see above.
          tmsBookingId: tmsAtSlot?.tmsBookingId ?? null,
          tmsUpdatedAt: tmsAtSlot?.tmsUpdatedAt ?? null,
        })
        .returning();
      await tx.insert(bookingEvents).values({
        actorId: actor.id,
        action: "create",
        batchId,
        bookingBefore: null,
        bookingAfter: { ...created, unitRegistration: unit.registration, capabilityWarnings: warnings },
      });
    }

    revalidatePath("/");
    return { ok: true, message: `Saved — ${unit.registration} · ${site.name}`, warnings, batchId };
  });
}

export type ClearBookingInput = { unitId: number; date: string; expectedUpdatedAt: string };
export type ClearBookingResult =
  | { ok: true; message: string; batchId: string }
  | { ok: false; error: string; code: "PERMISSION" | "CONFLICT" | "LOCKED" | "NOT_FOUND" };

export async function clearBooking(input: ClearBookingInput): Promise<ClearBookingResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.unitId, input.unitId), eq(bookings.date, input.date), isNull(bookings.deletedAt)))
      .limit(1);

    // No local row doesn't mean nothing is there — the cell may be showing an untouched TMS
    // booking. Clearing one records a SUPPRESSION: an amendment carrying its tms_booking_id,
    // created already soft-deleted, meaning "we propose removing this". The merge reads those
    // and stops rendering the TMS original (lib/db/tms/overlay.ts).
    if (!existing) {
      const [unitRow] = await tx
        .select({ id: units.id, registration: units.registration, companyId: units.companyId, })
        .from(units)
        .where(and(eq(units.id, input.unitId), isNull(units.deletedAt)))
        .limit(1);
      if (!unitRow || !companyAllowed(actor.companyAccess, unitRow.companyId)) {
        return { ok: false, error: "Nothing to clear.", code: "NOT_FOUND" };
      }
      const tms = await resolveTmsBookingAt(unitRow.companyId, input.unitId, input.date);
      if (!tms) return { ok: false, error: "Nothing to clear.", code: "NOT_FOUND" };

      const [tag] = await tx
        .select({ modalityId: unitModalities.modalityId })
        .from(unitModalities)
        .where(eq(unitModalities.unitId, input.unitId))
        .limit(1);
      if (!tag) return { ok: false, error: "Nothing to clear.", code: "NOT_FOUND" };

      const now = new Date();
      const [created] = await tx
        .insert(bookings)
        .values({
          bookingRef: await nextBookingRef(tx),
          unitId: input.unitId,
          companyId: unitRow.companyId,
          modalityId: tag.modalityId,
          date: input.date,
          // A suppression still needs a site to satisfy the NOT NULL FK; the TMS original's
          // own site is the honest choice, and it's what the audit snapshot should show.
          siteId: (
            await tx
              .select({ id: sites.id })
              .from(sites)
              .where(and(eq(sites.companyId, unitRow.companyId), isNull(sites.deletedAt)))
              .limit(1)
          )[0].id,
          status: "confirmed",
          createdBy: actor.id,
          updatedBy: actor.id,
          deletedAt: now,
          deletedBy: actor.id,
          updatedAt: now,
          tmsBookingId: tms.tmsBookingId,
          tmsUpdatedAt: tms.tmsUpdatedAt,
        })
        .returning();

      const batchId = randomUUID();
      await tx.insert(bookingEvents).values({
        actorId: actor.id,
        action: "delete",
        batchId,
        bookingBefore: { ...created, deletedAt: null, unitRegistration: unitRow.registration },
        bookingAfter: null,
      });

      revalidatePath("/");
      return { ok: true, message: `Cleared — ${unitRow.registration} on ${input.date}`, batchId };
    }

    if (!companyAllowed(actor.companyAccess, existing.companyId)) {
      return { ok: false, error: "Nothing to clear.", code: "NOT_FOUND" };
    }
    if (existing.publishedAt) {
      return { ok: false, error: "This booking is published and locked. Unlock it first.", code: "LOCKED" };
    }
    if (input.expectedUpdatedAt !== existing.updatedAt.toISOString()) {
      const name = await nameOfEditor(tx, existing.updatedBy);
      return {
        ok: false,
        error: `This booking was changed by ${name} — refresh to see the latest.`,
        code: "CONFLICT",
      };
    }

    await tx
      .update(bookings)
      .set({ deletedAt: new Date(), deletedBy: actor.id, updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(bookings.id, existing.id));

    const [unit] = await tx.select({ registration: units.registration }).from(units).where(eq(units.id, existing.unitId)).limit(1);

    const batchId = randomUUID();
    await tx.insert(bookingEvents).values({
      actorId: actor.id,
      action: "delete",
      batchId,
      bookingBefore: { ...existing, unitRegistration: unit?.registration },
      bookingAfter: null,
    });

    revalidatePath("/");
    return { ok: true, message: `Cleared — ${unit?.registration ?? "unit"} on ${input.date}`, batchId };
  });
}
