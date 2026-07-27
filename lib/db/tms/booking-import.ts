import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, bookingEvents, companies, units, unitModalities, sites, tmsBookingImportRuns, users } from "@/lib/db/schema";
import { getUnitRegistrations } from "@/lib/db/unit-labels";
import { nextBookingRef } from "@/lib/db/booking-ref";
import { listTmsBookingStatuses, listTmsBookings, type TmsBooking, type TmsBookingStatus } from "./queries";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// TMS's own per-company booking_statuses, mapped by NAME onto our catalogue's keys — this
// correspondence was confirmed against the real InHealth data (docs/TMS_INTEGRATION_PLAN.md
// §1.3: "our eight statuses ARE InHealth's TMS statuses") and is what lib/statuses.ts's
// SEED_STATUSES was itself seeded from. A TMS status name not in this map is a genuinely
// new one Quest has added since — imported as `tbc` (visible, needs a human look) rather
// than silently guessed, and counted separately in the summary so it doesn't go unnoticed.
const TMS_STATUS_NAME_TO_LOCAL_KEY: Record<string, string> = {
  Confirmed: "confirmed",
  "Bank Holiday": "bankholiday",
  "Weekend Confirmed": "weekend",
  "Waiting Final": "likely",
  Bidding: "bidding",
  "Corrective Works": "service",
  "Location to be Confirmed": "tbc",
  "Customer Cancelled": "cancelled",
};
const FALLBACK_STATUS_KEY = "tbc";

type SkipReason =
  | "unit not yet synced"
  | "site not yet synced"
  | "unit has no single modality tag"
  | "unmapped TMS status"
  | "target slot occupied by an unrelated local booking";

export type BookingImportConflict = { unitRegistration: string; date: string; siteName: string; reason: string };
export type BookingImportSummary = {
  created: number;
  refreshed: number;
  unchanged: number;
  removed: number;
  conflicts: BookingImportConflict[];
  skipped: Partial<Record<SkipReason, number>>;
};

function emptySummary(): BookingImportSummary {
  return { created: 0, refreshed: 0, unchanged: 0, removed: 0, conflicts: [], skipped: {} };
}

function skip(summary: BookingImportSummary, reason: SkipReason) {
  summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
}

// A system actor for booking_events entries the import writes — mirrors
// data/migrate-from-excel.ts's own system-user pattern, kept distinct ("TMS Import" vs
// "Data Migration") so the audit log shows which automated process made a change.
async function ensureImportSystemUser(tx: Tx): Promise<number> {
  const email = "tms-import@system.quest.local";
  const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing.id;
  const [created] = await tx
    .insert(users)
    .values({ name: "TMS Import", email, passwordHash: null, role: "admin" })
    .returning({ id: users.id });
  return created.id;
}

type BookingRow = typeof bookings.$inferSelect;

async function logEvent(
  tx: Tx,
  actorId: number,
  batchId: string,
  action: "create" | "update" | "delete",
  before: BookingRow | null,
  after: BookingRow | null,
  unitRegistration: string | undefined,
) {
  await tx.insert(bookingEvents).values({
    actorId,
    action,
    batchId,
    bookingBefore: before ? { ...before, unitRegistration } : null,
    bookingAfter: after ? { ...after, unitRegistration } : null,
  });
}

// The read-only TMS booking import (docs/TMS_INTEGRATION_PLAN.md §6B, docs/DECISIONS.md
// #21) — brings InHealth's confirmed TMS bookings into `bookings` as the baseline
// schedulers plan against, without ever letting a re-import silently clobber a scheduler's
// unpublished local edit (the conflict rule, locked with the client). Requires the
// reference sync (lib/db/tms/sync.ts) to have already run — units/sites are resolved
// purely from already-synced local rows, no TMS lookups beyond bookings/booking_statuses.
export async function runTmsBookingImport(triggeredBy: number | null): Promise<{ runId: number; summary: BookingImportSummary }> {
  const [run] = await db.insert(tmsBookingImportRuns).values({ status: "running", triggeredBy }).returning({ id: tmsBookingImportRuns.id });

  try {
    const summary = emptySummary();
    const batchId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      const now = new Date();
      const systemUserId = await ensureImportSystemUser(tx);

      // Every company the reference sync has already linked (docs/DECISIONS.md #11, #22) —
      // reusing that link rather than re-querying TMS's enable_scheduling flag here keeps
      // this step consistent with whatever the sync step actually established, and avoids a
      // second TMS round-trip. TMS's own booking_statuses.id / bookings.id are ordinary
      // MySQL auto-increment primary keys, globally unique across companies, so merging
      // multiple companies' rows into one flat list is safe — no cross-company id collision.
      const linkedCompanies = await tx.select({ id: companies.id, tmsCompanyId: companies.tmsCompanyId }).from(companies).where(isNotNull(companies.tmsCompanyId));
      const statusLists: TmsBookingStatus[][] = [];
      const bookingLists: TmsBooking[][] = [];
      for (const c of linkedCompanies) {
        const tmsCompanyId = c.tmsCompanyId as number;
        const [statuses, bkgs] = await Promise.all([listTmsBookingStatuses(tmsCompanyId), listTmsBookings(tmsCompanyId)]);
        statusLists.push(statuses);
        bookingLists.push(bkgs);
      }
      const tmsStatuses = statusLists.flat();
      const tmsBookings = bookingLists.flat();
      const statusNameById = new Map(tmsStatuses.map((s) => [s.id, s.name]));

      // Pre-load everything the resolution step needs, once, rather than a query per booking.
      const localUnits = await tx.select({ id: units.id, tmsUnitId: units.tmsUnitId, companyId: units.companyId, registration: units.registration }).from(units).where(isNotNull(units.tmsUnitId));
      const unitByTmsId = new Map(localUnits.map((u) => [u.tmsUnitId as number, u]));

      const localSites = await tx.select({ id: sites.id, tmsLocationId: sites.tmsLocationId, name: sites.name }).from(sites).where(isNotNull(sites.tmsLocationId));
      const siteIdByTmsLocationId = new Map(localSites.map((s) => [s.tmsLocationId as number, s.id]));
      const siteNameById = new Map(localSites.map((s) => [s.id, s.name]));

      const tagRows = await tx.select({ unitId: unitModalities.unitId, modalityId: unitModalities.modalityId }).from(unitModalities);
      const modalityIdsByUnit = new Map<number, number[]>();
      for (const t of tagRows) {
        const arr = modalityIdsByUnit.get(t.unitId) ?? [];
        arr.push(t.modalityId);
        modalityIdsByUnit.set(t.unitId, arr);
      }

      const existingByTmsBookingId = new Map(
        (await tx.select().from(bookings).where(isNotNull(bookings.tmsBookingId))).map((b) => [b.tmsBookingId as number, b]),
      );

      const seenTmsBookingIds = new Set<number>();

      for (const tb of tmsBookings) {
        seenTmsBookingIds.add(tb.id);

        const unit = unitByTmsId.get(tb.unitId);
        if (!unit) {
          skip(summary, "unit not yet synced");
          continue;
        }
        const siteId = siteIdByTmsLocationId.get(tb.locationId);
        if (!siteId) {
          skip(summary, "site not yet synced");
          continue;
        }
        const unitModalityIds = modalityIdsByUnit.get(unit.id) ?? [];
        if (unitModalityIds.length !== 1) {
          skip(summary, "unit has no single modality tag");
          continue;
        }
        const modalityId = unitModalityIds[0];

        const tmsStatusName = statusNameById.get(tb.statusId);
        const statusKey = (tmsStatusName && TMS_STATUS_NAME_TO_LOCAL_KEY[tmsStatusName]) || null;
        if (!statusKey) skip(summary, "unmapped TMS status");
        const resolvedStatusKey = statusKey ?? FALLBACK_STATUS_KEY;

        const desired = { unitId: unit.id, companyId: unit.companyId, modalityId, date: tb.date, siteId, status: resolvedStatusKey, notes: tb.notes };

        const existing = existingByTmsBookingId.get(tb.id);

        if (existing) {
          // A conflicted row is FROZEN — the import never touches it again (not even to
          // refresh tmsUpdatedAt/tmsImportedAt) until a scheduler resolves it by editing
          // or moving it (which clears tms_conflict_at and resets tms_imported_at — see
          // lib/actions/bookings.ts, lib/actions/booking-moves.ts). Re-evaluating a frozen
          // row against a stale comparison point here is exactly what silently reverted a
          // scheduler's resolution back to TMS's version in testing: clearing the flag
          // alone, without freezing in between, let the very next import either re-flag
          // immediately or — worse — treat the resolved edit as "unchanged since import"
          // and overwrite it on the next refresh. Reporting it every run (not just once)
          // is deliberate too, so an outstanding conflict doesn't quietly drop off the
          // admin's radar between runs.
          if (existing.tmsConflictAt) {
            summary.conflicts.push({ unitRegistration: unit.registration, date: existing.date, siteName: siteNameById.get(existing.siteId) ?? "?", reason: "Still unresolved — a scheduler needs to edit or move this booking" });
            continue;
          }

          const localEditedSinceImport = !existing.tmsImportedAt || existing.updatedAt > existing.tmsImportedAt;
          const tmsChangedSinceImport = !existing.tmsUpdatedAt || tb.updatedAt.getTime() !== existing.tmsUpdatedAt.getTime();

          if (!tmsChangedSinceImport) {
            summary.unchanged++;
            continue;
          }
          if (localEditedSinceImport) {
            // Advance tmsUpdatedAt to TMS's CURRENT value even though we're not applying
            // it — this is what makes resolution actually stick. Once a scheduler resolves
            // the conflict (clears tmsConflictAt, resets tmsImportedAt), the NEXT import's
            // "has TMS changed" check needs to compare against "the TMS version the
            // scheduler already saw and rejected," not the version from BEFORE the
            // conflict — otherwise every future run would see the same permanent
            // disagreement and re-overwrite the resolution the moment localEditedSinceImport
            // next reads false. Confirmed by testing: leaving tmsUpdatedAt stale here is
            // exactly what let a resolved booking get silently reverted on the next run.
            await tx.update(bookings).set({ tmsConflictAt: now, tmsUpdatedAt: tb.updatedAt }).where(eq(bookings.id, existing.id));
            summary.conflicts.push({ unitRegistration: unit.registration, date: tb.date, siteName: siteNameById.get(siteId) ?? "?", reason: "TMS and a local edit both changed this booking" });
            continue;
          }

          // Safe to refresh: only the import has touched this row since it was created.
          // The desired slot might have moved (TMS can reassign a booking's unit/date) —
          // check for a collision with some OTHER live row exactly like a fresh create.
          const [occupant] = await tx
            .select({ id: bookings.id })
            .from(bookings)
            .where(and(eq(bookings.unitId, desired.unitId), eq(bookings.date, desired.date), isNull(bookings.deletedAt)))
            .limit(1);
          if (occupant && occupant.id !== existing.id) {
            await tx.update(bookings).set({ tmsConflictAt: now, tmsUpdatedAt: tb.updatedAt }).where(eq(bookings.id, existing.id));
            summary.conflicts.push({ unitRegistration: unit.registration, date: tb.date, siteName: siteNameById.get(siteId) ?? "?", reason: "TMS moved this booking onto a slot another local booking already occupies" });
            continue;
          }

          const [updated] = await tx
            .update(bookings)
            .set({ ...desired, updatedAt: now, updatedBy: systemUserId, tmsUpdatedAt: tb.updatedAt, tmsImportedAt: now })
            .where(eq(bookings.id, existing.id))
            .returning();
          await logEvent(tx, systemUserId, batchId, "update", existing, updated, unit.registration);
          summary.refreshed++;
          continue;
        }

        // First time seeing this TMS booking — check the target slot before creating.
        const [occupant] = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(and(eq(bookings.unitId, desired.unitId), eq(bookings.date, desired.date), isNull(bookings.deletedAt)))
          .limit(1);
        if (occupant) {
          skip(summary, "target slot occupied by an unrelated local booking");
          continue;
        }

        const [created] = await tx
          .insert(bookings)
          .values({
            bookingRef: await nextBookingRef(tx),
            ...desired,
            source: "tms",
            tmsBookingId: tb.id,
            tmsUpdatedAt: tb.updatedAt,
            tmsImportedAt: now,
            createdBy: systemUserId,
            updatedBy: systemUserId,
          })
          .returning();
        await logEvent(tx, systemUserId, batchId, "create", null, created, unit.registration);
        summary.created++;
      }

      // Propagate TMS-side removal — but never over an unpublished local edit made since
      // the last import (same conflict rule as everything else here).
      const goneFromTms = [...existingByTmsBookingId.values()].filter(
        (b) => !b.deletedAt && b.tmsBookingId !== null && !seenTmsBookingIds.has(b.tmsBookingId),
      );
      if (goneFromTms.length) {
        const registrationById = await getUnitRegistrations(tx, goneFromTms.map((b) => b.unitId));
        for (const b of goneFromTms) {
          // Frozen — same reasoning as the main loop above.
          if (b.tmsConflictAt) {
            summary.conflicts.push({ unitRegistration: registrationById.get(b.unitId) ?? "?", date: b.date, siteName: siteNameById.get(b.siteId) ?? "?", reason: "Still unresolved — a scheduler needs to edit or move this booking" });
            continue;
          }
          const localEditedSinceImport = !b.tmsImportedAt || b.updatedAt > b.tmsImportedAt;
          if (localEditedSinceImport) {
            await tx.update(bookings).set({ tmsConflictAt: now }).where(eq(bookings.id, b.id));
            summary.conflicts.push({
              unitRegistration: registrationById.get(b.unitId) ?? "?",
              date: b.date,
              siteName: siteNameById.get(b.siteId) ?? "?",
              reason: "TMS removed this booking, but it has an unpublished local edit since the last import",
            });
            continue;
          }
          await tx
            .update(bookings)
            .set({ deletedAt: now, deletedBy: systemUserId, updatedAt: now, updatedBy: systemUserId })
            .where(eq(bookings.id, b.id));
          await logEvent(tx, systemUserId, batchId, "delete", b, null, registrationById.get(b.unitId));
          summary.removed++;
        }
      }
    });

    await db.update(tmsBookingImportRuns).set({ status: "success", finishedAt: new Date(), summary }).where(eq(tmsBookingImportRuns.id, run.id));
    return { runId: run.id, summary };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(tmsBookingImportRuns).set({ status: "error", finishedAt: new Date(), error: message }).where(eq(tmsBookingImportRuns.id, run.id));
    throw err;
  }
}
