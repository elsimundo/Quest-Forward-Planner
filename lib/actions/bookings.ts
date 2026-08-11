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
import { logCompanyAccessDenied } from "@/lib/audit/security-log";
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SiteInput = { id: number } | { name: string };

// Resolve the drawer's site field to a real row: an existing id (company-scoped), or free
// text — reusing an exact case-insensitive match, otherwise creating a new pending-review
// site (SPEC.md §5). Shared by the single-cell save and the bulk create, which resolves it
// ONCE for the whole batch: typing a new site name and booking five cells with it must
// produce one new site, not five.
async function resolveSite(
  tx: Tx,
  companyId: number,
  input: SiteInput,
): Promise<{ ok: true; site: { id: number; name: string } } | { ok: false; error: string }> {
  if ("id" in input) {
    // Company-scoped (docs/DECISIONS.md #22, #11) — without this, a client-supplied site
    // id from a DIFFERENT company would silently attach the booking to it. Harmless while
    // only one company existed; a real cross-company leak now that more than one does.
    const [row] = await tx
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(and(eq(sites.id, input.id), eq(sites.companyId, companyId), isNull(sites.deletedAt)))
      .limit(1);
    if (!row) return { ok: false, error: "Selected site not found." };
    return { ok: true, site: row };
  }

  const trimmed = input.name.trim();
  if (!trimmed) return { ok: false, error: "Site is required." };
  // Company-scoped for the same reason as above — `sites.name` is only unique within a
  // company (docs/DECISIONS.md #11), so two companies can share a name (confirmed live:
  // "LCS Tesco Harrow" exists under both InHealth and Quest Power). Without this filter,
  // typing a name that happens to match another company's site would silently attach
  // this booking to THAT site instead of creating (or finding) this company's own.
  const [existingSite] = await tx
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(isNull(sites.deletedAt), eq(sites.companyId, companyId), ilike(sites.name, trimmed)))
    .limit(1);
  if (existingSite) return { ok: true, site: existingSite };

  const [created] = await tx
    .insert(sites)
    .values({ name: trimmed, companyId, pendingReview: true })
    .returning({ id: sites.id, name: sites.name });
  return { ok: true, site: created };
}

// §2a capability check — logged alongside the audit snapshot, never blocking.
async function warningsFor(
  tx: Tx,
  unit: { id: number; registration: string },
  site: { id: number; name: string },
): Promise<CapabilityWarning[]> {
  const [specRows, reqRows] = await Promise.all([
    tx.select({ key: unitSpecs.key, value: unitSpecs.value }).from(unitSpecs).where(eq(unitSpecs.unitId, unit.id)),
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
  return computeCapabilityWarnings(reqRows, specMap, unit.registration, site.name);
}

type SlotWriteResult = { ok: true } | { ok: false; error: string; code: "CONFLICT" | "LOCKED" };

/**
 * Write one unit+date slot, and log the matching audit event under `batchId`.
 *
 * Every caller that puts a booking into a cell goes through here — the single-cell drawer
 * save, the bulk create, and drag-to-extend — because the overlay rules this encodes are
 * subtle enough that a second copy would drift from this one within a release:
 *
 *  - a write over a slot where TMS holds a booking we have no row for must become an
 *    AMENDMENT carrying that `tms_booking_id`, or the merge renders the TMS original and
 *    our new row in the same cell;
 *  - a previously-CLEARED TMS booking is a soft-deleted row still holding that
 *    `tms_booking_id`, which is UNIQUE — so re-booking that slot has to revive the existing
 *    row rather than insert a second one, which would violate the constraint.
 *
 * `expectedUpdatedAt` is the optimistic lock (SPEC.md §11) and doubles as the caller's
 * statement of what it expects to find: `null` means "this cell was empty when I read it",
 * so a row appearing there since is a CONFLICT rather than a silent overwrite. That's what
 * makes the bulk paths safe without a separate mode flag.
 */
async function writeBookingAtSlot(
  tx: Tx,
  opts: {
    unit: { id: number; registration: string; companyId: number };
    date: string;
    site: { id: number; name: string };
    status: string;
    notes: string | null;
    modalityId: number;
    actor: { id: number };
    batchId: string;
    warnings: CapabilityWarning[];
    expectedUpdatedAt: string | null;
  },
): Promise<SlotWriteResult> {
  const { unit, date, site, status, notes, modalityId, actor, batchId, warnings } = opts;

  const [existingBooking] = await tx
    .select()
    .from(bookings)
    .where(and(eq(bookings.unitId, unit.id), eq(bookings.date, date), isNull(bookings.deletedAt)))
    .limit(1);

  const tmsAtSlot = existingBooking ? null : await resolveTmsBookingAt(unit.companyId, unit.id, date);

  const [suppressed] = tmsAtSlot
    ? await tx.select().from(bookings).where(eq(bookings.tmsBookingId, tmsAtSlot.tmsBookingId)).limit(1)
    : [];

  if (existingBooking?.publishedAt) {
    return { ok: false, error: "This booking is published and locked. Unlock it first.", code: "LOCKED" };
  }

  if (existingBooking && opts.expectedUpdatedAt !== existingBooking.updatedAt.toISOString()) {
    const name = await nameOfEditor(tx, existingBooking.updatedBy);
    return {
      ok: false,
      error: `This booking was changed by ${name} — refresh to see the latest.`,
      code: "CONFLICT",
    };
  }

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
      .set({ siteId: site.id, status, notes, updatedBy: actor.id, updatedAt: now, tmsConflictAt: null, tmsImportedAt: existingBooking.tmsConflictAt ? now : existingBooking.tmsImportedAt })
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
        unitId: unit.id,
        date,
        siteId: site.id,
        status,
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
        unitId: unit.id,
        companyId: unit.companyId,
        modalityId,
        date,
        siteId: site.id,
        status,
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

  return { ok: true };
}

// Unit lookup shared by every write path: exists, is in the actor's company, and is actually
// tagged for the modality it's being booked on. The modality check is defense in depth
// against a stale or spoofed client-supplied modalityId, not just a UX signal
// (docs/TMS_INTEGRATION_PLAN.md §4.3) — a unit can carry more than one modality, so this
// confirms the unit really belongs on the sheet it was booked from.
async function resolveUnitForWrite(
  tx: Tx,
  unitId: number,
  modalityId: number,
  actor: { id: number; companyAccess: Parameters<typeof companyAllowed>[0] },
): Promise<{ ok: true; unit: { id: number; registration: string; companyId: number } } | { ok: false; error: string }> {
  const [unit] = await tx
    .select({ id: units.id, registration: units.registration, companyId: units.companyId })
    .from(units)
    .where(and(eq(units.id, unitId), isNull(units.deletedAt)))
    .limit(1);
  if (!unit) return { ok: false, error: "Unit not found." };
  // Hard company scoping (docs/DECISIONS.md #22) — a non-super_admin can only ever act
  // on their own company's units, regardless of what unitId the client sends.
  if (!companyAllowed(actor.companyAccess, unit.companyId)) {
    logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: unit.companyId, resource: "booking_unit" });
    return { ok: false, error: "Unit not found." };
  }

  const [tag] = await tx
    .select({ id: unitModalities.id })
    .from(unitModalities)
    .where(and(eq(unitModalities.unitId, unitId), eq(unitModalities.modalityId, modalityId)))
    .limit(1);
  if (!tag) return { ok: false, error: "This unit isn't tagged for that modality." };

  return { ok: true, unit };
}

export type SaveBookingInput = {
  unitId: number;
  date: string;
  site: SiteInput;
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

    const unitResult = await resolveUnitForWrite(tx, input.unitId, input.modalityId, actor);
    if (!unitResult.ok) return { ok: false, error: unitResult.error, code: "VALIDATION" };
    const { unit } = unitResult;

    const siteResult = await resolveSite(tx, unit.companyId, input.site);
    if (!siteResult.ok) return { ok: false, error: siteResult.error, code: "VALIDATION" };
    const { site } = siteResult;

    const warnings = await warningsFor(tx, unit, site);
    const batchId = randomUUID();

    const written = await writeBookingAtSlot(tx, {
      unit,
      date: input.date,
      site,
      status: input.status,
      notes: input.notes.trim() || null,
      modalityId: input.modalityId,
      actor,
      batchId,
      warnings,
      expectedUpdatedAt: input.expectedUpdatedAt,
    });
    if (!written.ok) return written;

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
        if (unitRow) logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: unitRow.companyId, resource: "booking_clear_unit" });
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
      logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: existing.companyId, resource: "booking_clear" });
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

// ── bulk writes ───────────────────────────────────────────────────────────────────────────
//
// Two actions, one shape: a set of unit+date slots, one `batch_id`, all-or-nothing. They back
// both of the client's asks that need more than one cell written at a time — booking a
// multi-cell selection in one go, and dragging a run's top/bottom edge to lengthen or shorten
// it — because underneath, those are the same operation. A booking is one row per unit per
// day (`bookings.date` is a single date column, guarded by the partial unique index
// `bookings_unit_date_live_unique`), so a five-day site visit IS five rows and "extend by
// three days" IS "create three rows". There is no duration to edit.
//
// All-or-nothing matters here more than it looks: a half-applied extend leaves a run that
// stops in a place the scheduler never chose, and — worse — leaves them with no single thing
// to undo. Every rejection below throws so the transaction rolls back, and success writes one
// batch id, so one Ctrl+Z reverses the whole gesture.

export type BookingSlot = { unitId: number; date: string };

export type BulkWriteResult =
  | { ok: true; message: string; batchId: string; warnings: CapabilityWarning[] }
  | { ok: false; error: string; code: "PERMISSION" | "VALIDATION" | "CONFLICT" | "LOCKED" };

// Rejecting by RETURNING from inside db.transaction commits whatever has already been written
// — and these loops write row by row. Throwing is what rolls that back. Same pattern, and the
// same reasoning, as MoveRejected in lib/actions/booking-moves.ts.
class BulkRejected extends Error {
  constructor(public result: Extract<BulkWriteResult, { ok: false }>) {
    super("bulk write rejected");
  }
}

export type CreateBookingsInput = {
  slots: BookingSlot[];
  site: SiteInput;
  status: string;
  notes: string;
  modalityId: number;
};

/**
 * Book a set of empty cells with one set of field values.
 *
 * Every slot must be free. `expectedUpdatedAt: null` on each write says so, and a row that
 * has appeared since the client read the grid comes back as CONFLICT for the whole batch
 * rather than being silently overwritten — these slots were chosen *because* they were empty,
 * so finding a booking in one is a reason to stop and re-look, not to clobber it.
 */
export async function createBookings(input: CreateBookingsInput): Promise<BulkWriteResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };
  if (!input.slots.length) return { ok: false, error: "Nothing to book.", code: "VALIDATION" };

  try {
    return await db.transaction(async (tx) => {
      if (!(await isSettableStatus(tx, input.status))) {
        throw new BulkRejected({ ok: false, error: "Invalid status.", code: "VALIDATION" });
      }

      // Resolve each distinct unit once, not once per slot — a 14-day run is 14 slots on one
      // unit, and re-running the company and modality checks for each would be 28 needless
      // round trips inside the transaction.
      const unitIds = [...new Set(input.slots.map((s) => s.unitId))];
      const unitById = new Map<number, { id: number; registration: string; companyId: number }>();
      for (const unitId of unitIds) {
        const result = await resolveUnitForWrite(tx, unitId, input.modalityId, actor);
        if (!result.ok) throw new BulkRejected({ ok: false, error: result.error, code: "VALIDATION" });
        unitById.set(unitId, result.unit);
      }

      // A selection spanning two companies can't be booked as one batch: `sites` are scoped
      // per company (docs/DECISIONS.md #11), so there is no single site row the whole set
      // could point at. The grid is always scoped to one company, so this is a guard against
      // a malformed request rather than something a scheduler can do by hand.
      const companyIds = new Set([...unitById.values()].map((u) => u.companyId));
      if (companyIds.size > 1) {
        throw new BulkRejected({ ok: false, error: "Those units belong to different companies.", code: "VALIDATION" });
      }
      const companyId = [...companyIds][0];

      // Once for the batch — see resolveSite. Typing a brand-new site name and booking five
      // cells with it must create one site, not five.
      const siteResult = await resolveSite(tx, companyId, input.site);
      if (!siteResult.ok) throw new BulkRejected({ ok: false, error: siteResult.error, code: "VALIDATION" });
      const { site } = siteResult;

      const batchId = randomUUID();
      const notes = input.notes.trim() || null;

      // Capability warnings depend on the unit and the site, so they're per distinct unit,
      // not per slot. The union is what the caller reports.
      const warningsByUnit = new Map<number, CapabilityWarning[]>();
      for (const unit of unitById.values()) {
        warningsByUnit.set(unit.id, await warningsFor(tx, unit, site));
      }

      for (const slot of input.slots) {
        const unit = unitById.get(slot.unitId)!;
        const written = await writeBookingAtSlot(tx, {
          unit,
          date: slot.date,
          site,
          status: input.status,
          notes,
          modalityId: input.modalityId,
          actor,
          batchId,
          warnings: warningsByUnit.get(unit.id)!,
          expectedUpdatedAt: null,
        });
        if (!written.ok) {
          throw new BulkRejected({
            ok: false,
            // Name the slot: with a dozen cells in flight, "one of these is taken" leaves the
            // scheduler hunting for which.
            error: `${unit.registration} on ${slot.date}: ${written.error}`,
            code: written.code,
          });
        }
      }

      revalidatePath("/");
      const n = input.slots.length;
      return {
        ok: true,
        message: `Booked ${n} day${n > 1 ? "s" : ""} — ${site.name}`,
        batchId,
        warnings: [...new Set([...warningsByUnit.values()].flat())],
      };
    });
  } catch (err) {
    if (err instanceof BulkRejected) return err.result;
    throw err;
  }
}

export type BulkEditTarget = { unitId: number; date: string; expectedUpdatedAt: string };

export type BulkEditInput = {
  targets: BulkEditTarget[];
  /** `undefined` on any of these three means "leave unchanged" — only the fields the
   * scheduler explicitly opted into (via the Bulk edit drawer's per-field toggles) are
   * written; the rest keep whatever each individual booking already had. */
  site?: SiteInput;
  status?: string;
  notes?: string;
};

/**
 * Change one or more fields across a set of ALREADY-BOOKED cells in one go — the bulk
 * counterpart to the single-cell drawer's "Save booking", for a multi-select. Unlike
 * `createBookings`, every target must already hold a live, unpublished, unlocked local
 * booking: this only ever edits existing rows, never creates or revives one, and a
 * published booking in the set is rejected for the whole batch (same "unlock it first"
 * rule the single-cell drawer enforces) rather than silently skipped.
 */
export async function updateBookings(input: BulkEditInput): Promise<BulkWriteResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };
  if (!input.targets.length) return { ok: false, error: "Nothing to edit.", code: "VALIDATION" };
  if (input.site === undefined && input.status === undefined && input.notes === undefined) {
    return { ok: false, error: "Choose at least one field to change.", code: "VALIDATION" };
  }

  try {
    return await db.transaction(async (tx) => {
      if (input.status !== undefined && !(await isSettableStatus(tx, input.status))) {
        throw new BulkRejected({ ok: false, error: "Invalid status.", code: "VALIDATION" });
      }

      const batchId = randomUUID();
      const notes = input.notes !== undefined ? input.notes.trim() || null : undefined;

      const unitCache = new Map<number, { id: number; registration: string; companyId: number }>();
      async function unitFor(unitId: number) {
        const cached = unitCache.get(unitId);
        if (cached) return cached;
        const [row] = await tx
          .select({ id: units.id, registration: units.registration, companyId: units.companyId })
          .from(units)
          .where(eq(units.id, unitId))
          .limit(1);
        if (!row) throw new BulkRejected({ ok: false, error: "Unit not found.", code: "VALIDATION" });
        unitCache.set(unitId, row);
        return row;
      }

      // Resolved once for the whole batch, same reasoning as createBookings — typing a
      // new site name and editing five bookings with it must create one new site, not
      // five. The grid only ever selects cells from one company, so the first target's
      // company is the one every site lookup is scoped to.
      let resolvedSite: { id: number; name: string } | null = null;
      const warningsAll: CapabilityWarning[] = [];

      for (const target of input.targets) {
        const [existing] = await tx
          .select()
          .from(bookings)
          .where(and(eq(bookings.unitId, target.unitId), eq(bookings.date, target.date), isNull(bookings.deletedAt)))
          .limit(1);
        if (!existing) {
          throw new BulkRejected({ ok: false, error: "One of those bookings no longer exists — refresh and try again.", code: "CONFLICT" });
        }
        if (!companyAllowed(actor.companyAccess, existing.companyId)) {
          logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: existing.companyId, resource: "booking_bulk_edit" });
          throw new BulkRejected({ ok: false, error: "One of those bookings no longer exists — refresh and try again.", code: "CONFLICT" });
        }
        if (existing.publishedAt) {
          throw new BulkRejected({ ok: false, error: "One of those bookings is published and locked. Unlock it first.", code: "LOCKED" });
        }
        if (target.expectedUpdatedAt !== existing.updatedAt.toISOString()) {
          const name = await nameOfEditor(tx, existing.updatedBy);
          throw new BulkRejected({
            ok: false,
            error: `One of those bookings was changed by ${name} — refresh to see the latest.`,
            code: "CONFLICT",
          });
        }

        const unit = await unitFor(existing.unitId);

        const patch: Partial<{
          siteId: number;
          status: string;
          notes: string | null;
          updatedBy: number;
          updatedAt: Date;
          tmsConflictAt: Date | null;
          tmsImportedAt: Date | null;
        }> = {};

        if (input.site !== undefined) {
          if (!resolvedSite) {
            const siteResult = await resolveSite(tx, unit.companyId, input.site);
            if (!siteResult.ok) throw new BulkRejected({ ok: false, error: siteResult.error, code: "VALIDATION" });
            resolvedSite = siteResult.site;
          }
          patch.siteId = resolvedSite.id;
          warningsAll.push(...(await warningsFor(tx, unit, resolvedSite)));
        }
        if (input.status !== undefined) patch.status = input.status;
        if (notes !== undefined) patch.notes = notes;

        const now = new Date();
        patch.updatedBy = actor.id;
        patch.updatedAt = now;
        // Same "editing and re-saving is the review signal" rule as the single-cell save.
        patch.tmsConflictAt = null;
        patch.tmsImportedAt = existing.tmsConflictAt ? now : existing.tmsImportedAt;

        const [updated] = await tx.update(bookings).set(patch).where(eq(bookings.id, existing.id)).returning();

        await tx.insert(bookingEvents).values({
          actorId: actor.id,
          action: "update",
          batchId,
          bookingBefore: { ...existing, unitRegistration: unit.registration },
          bookingAfter: { ...updated, unitRegistration: unit.registration, capabilityWarnings: warningsAll },
        });
      }

      revalidatePath("/");
      const n = input.targets.length;
      return {
        ok: true,
        message: `Updated ${n} booking${n > 1 ? "s" : ""}${resolvedSite ? ` — ${resolvedSite.name}` : ""}`,
        batchId,
        warnings: [...new Set(warningsAll)],
      };
    });
  } catch (err) {
    if (err instanceof BulkRejected) return err.result;
    throw err;
  }
}

export type ClearBookingsInput = {
  slots: (BookingSlot & { expectedUpdatedAt: string })[];
};

/**
 * Soft-delete a set of bookings as one batch — what dragging a run's edge inward does.
 *
 * Only touches slots that already hold a local row. Unlike `clearBooking`, this does NOT fall
 * back to writing a suppression for an untouched TMS booking: shrinking a run can only ever
 * remove days the planner itself put there, and the run-edge detection on the client works
 * off local bookings, so a TMS-only slot reaching here would mean the client and server
 * disagree about what's in the cell — which is a CONFLICT to report, not a clear to perform.
 */
export async function clearBookings(input: ClearBookingsInput): Promise<BulkWriteResult> {
  const actor = await requireRole([...EDITOR_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit bookings.", code: "PERMISSION" };
  if (!input.slots.length) return { ok: false, error: "Nothing to clear.", code: "VALIDATION" };

  try {
    return await db.transaction(async (tx) => {
      const batchId = randomUUID();

      for (const slot of input.slots) {
        const [existing] = await tx
          .select()
          .from(bookings)
          .where(and(eq(bookings.unitId, slot.unitId), eq(bookings.date, slot.date), isNull(bookings.deletedAt)))
          .limit(1);
        if (!existing) {
          throw new BulkRejected({ ok: false, error: "One of those bookings no longer exists — refresh and try again.", code: "CONFLICT" });
        }
        // Hard company scoping (docs/DECISIONS.md #22).
        if (!companyAllowed(actor.companyAccess, existing.companyId)) {
          logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: existing.companyId, resource: "booking_clear_bulk" });
          throw new BulkRejected({ ok: false, error: "One of those bookings no longer exists — refresh and try again.", code: "CONFLICT" });
        }
        if (existing.publishedAt) {
          throw new BulkRejected({ ok: false, error: "One of those bookings is published and locked. Unlock it first.", code: "LOCKED" });
        }
        if (slot.expectedUpdatedAt !== existing.updatedAt.toISOString()) {
          const name = await nameOfEditor(tx, existing.updatedBy);
          throw new BulkRejected({
            ok: false,
            error: `One of those bookings was changed by ${name} — refresh to see the latest.`,
            code: "CONFLICT",
          });
        }

        const now = new Date();
        await tx
          .update(bookings)
          .set({ deletedAt: now, deletedBy: actor.id, updatedAt: now, updatedBy: actor.id })
          .where(eq(bookings.id, existing.id));

        const [unit] = await tx
          .select({ registration: units.registration })
          .from(units)
          .where(eq(units.id, existing.unitId))
          .limit(1);

        await tx.insert(bookingEvents).values({
          actorId: actor.id,
          action: "delete",
          batchId,
          bookingBefore: { ...existing, unitRegistration: unit?.registration },
          bookingAfter: null,
        });
      }

      revalidatePath("/");
      const n = input.slots.length;
      return { ok: true, message: `Cleared ${n} day${n > 1 ? "s" : ""}`, batchId, warnings: [] };
    });
  } catch (err) {
    if (err instanceof BulkRejected) return err.result;
    throw err;
  }
}
