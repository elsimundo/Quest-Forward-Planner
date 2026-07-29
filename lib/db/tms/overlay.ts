import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, companies, sites, units, unitModalities } from "@/lib/db/schema";
import { getTmsBookings } from "./booking-cache";
import { localStatusKeyForTmsStatus } from "./status-map";
import type { BookingOrigin } from "@/lib/planner-changes";

// The overlay read — Stage B2 of docs/OVERLAY_BUILD_PLAN.md.
//
// The planner does not hold a copy of TMS's bookings (docs/TMS_WRITE_BACK.md §1). The grid is
// assembled per request from two sources:
//
//   1. TMS bookings, read live (via the 5-minute cache) — the confirmed schedule.
//   2. Our `bookings` rows, which under the overlay model mean *amendments*: a change a
//      scheduler is proposing, not a copy of anything.
//
// An amendment carrying `tmsBookingId` modifies that TMS booking. If it sits at the same
// unit+date as TMS has it, it simply replaces it on the grid. If it sits somewhere else, the
// scheduler has MOVED it, and both halves render: a **ghost** at the TMS position (faded,
// linking to where it went) and the amendment at its new position. An amendment with no
// `tmsBookingId` is a booking that exists only here.
//
// This is the client's own model, in their words: "If we drag a TMS booking to a new
// day/unit then I'd like for that original TMS booking to stay where it is, but be made
// slightly transparent. A link would also be added to that faded out TMS booking that would
// scroll the user to where that new booking is now located."

export type OverlayBooking = {
  unitId: number;
  date: string;
  siteId: number;
  siteName: string;
  status: string;
  notes: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  tmsConflictAt: Date | null;
  /** TMS's own booking id, when this row corresponds to one. Null for a local-only booking. */
  tmsBookingId: number | null;
  /**
   * Whether TMS already has this cell as shown, and if not, how it differs. `tmsBookingId`
   * can't answer that on its own — it's set on untouched TMS rows *and* on amendments of
   * them. Drives the "not yet in TMS" marker and the changes view
   * (lib/planner-changes.ts, docs/DECISIONS.md #29).
   */
  origin: BookingOrigin;
  /**
   * True for the faded original showing where TMS still has a booking the planner has changed.
   * A ghost is NOT editable and NOT selectable — it's a rendering of TMS's current truth, not
   * one of our rows.
   */
  isGhost: boolean;
  /** Why a ghost is there: the booking was moved elsewhere, or cleared outright. */
  ghostReason: "moved" | "cleared" | null;
  /** Where its real counterpart now sits. Null for a `cleared` ghost — there isn't one. */
  movedTo: { unitId: number; date: string } | null;
  /** On a moved amendment: where TMS still has it. Mirrors `movedTo` for the return link. */
  movedFrom: { unitId: number; date: string } | null;
  /**
   * TMS has changed this booking since we last amended it (`tms_updated_at` in the amendment
   * differs from the live value in TMS). Stage C3: surface this so the scheduler can accept
   * TMS's version or re-apply their change. Null for new bookings (no `tms_booking_id`).
   */
  tmsSupersedes: boolean;
};

export type OverlayResult = {
  bookings: OverlayBooking[];
  /** When the TMS half was last read — for the "last refreshed" indicator. */
  fetchedAt: Date;
  /**
   * TMS rows the grid could not place, by reason. Should be empty; a non-zero count means
   * reference data is out of step (a unit or site TMS knows about that our sync hasn't linked
   * yet) and the grid is showing less than TMS does. Surfaced rather than swallowed.
   */
  unplaced: Record<string, number>;
};

const slot = (unitId: number, date: string) => `${unitId}:${date}`;

/**
 * Build the grid for one company + modality over a date window.
 *
 * Throws if TMS is unreachable — deliberately. The client chose a connection error over a
 * stale grid (docs/TMS_WRITE_BACK.md §8), and there is no local copy to fall back to.
 */
export async function getOverlayBookings(
  companyId: number,
  modalityId: number,
  from: string,
  to: string,
): Promise<OverlayResult> {
  const [company] = await db
    .select({ tmsCompanyId: companies.tmsCompanyId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  // A company the reference sync has never linked has no TMS side at all. That's a real
  // state (a locally-created company), not an error — it just means the grid is amendments
  // only. `fetchedAt` is now because there was nothing to fetch.
  if (!company?.tmsCompanyId) {
    const amendmentsOnly = await loadAmendments(companyId, modalityId);
    return {
      bookings: amendmentsOnly
        .filter((a) => a.date >= from && a.date <= to)
        .map((a) => toOverlay(a, null, null, false)),
      fetchedAt: new Date(),
      unplaced: {},
    };
  }

  const { bookings: tmsBookings, statusNameById, fetchedAt } = await getTmsBookings(company.tmsCompanyId);

  // Reference data, loaded once per request rather than per booking.
  const localUnits = await db
    .select({ id: units.id, tmsUnitId: units.tmsUnitId, companyId: units.companyId })
    .from(units)
    .where(and(eq(units.companyId, companyId), isNull(units.deletedAt), isNotNull(units.tmsUnitId)));
  const unitIdByTmsUnitId = new Map(localUnits.map((u) => [u.tmsUnitId as number, u.id]));

  const localSites = await db
    .select({ id: sites.id, name: sites.name, tmsLocationId: sites.tmsLocationId })
    .from(sites)
    .where(and(eq(sites.companyId, companyId), isNull(sites.deletedAt), isNotNull(sites.tmsLocationId)));
  const siteIdByTmsLocationId = new Map(localSites.map((s) => [s.tmsLocationId as number, s.id]));

  const siteNameById = new Map(
    (await db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.companyId, companyId))).map(
      (s) => [s.id, s.name],
    ),
  );

  // Which units belong to THIS modality — a unit can carry several (docs/DECISIONS.md #19),
  // and a TMS booking belongs on whichever sheet its unit is tagged for.
  const taggedUnitIds = new Set(
    (
      await db
        .select({ unitId: unitModalities.unitId })
        .from(unitModalities)
        .where(eq(unitModalities.modalityId, modalityId))
    ).map((t) => t.unitId),
  );

  // Every live amendment for this company+modality, NOT limited to the window: an amendment
  // can move a booking from inside the window to outside it (or vice versa), and both the
  // ghost and its counterpart have to be resolvable. The live amendment set is small by
  // design — a published amendment retires (docs/TMS_WRITE_BACK.md §5) — so this stays cheap.
  const amendments = await loadAmendments(companyId, modalityId);
  // A cleared TMS booking is represented by a SOFT-DELETED amendment carrying its
  // tms_booking_id — "we propose removing this". Those rows are invisible to loadAmendments
  // (it filters deletedAt), so they're loaded separately: without them a cleared booking
  // would keep rendering from TMS and the clear would look like it did nothing.
  const suppressedTmsIds = await loadSuppressedTmsBookingIds(companyId, modalityId);
  const amendmentByTmsBookingId = new Map(
    amendments.filter((a) => a.tmsBookingId !== null).map((a) => [a.tmsBookingId as number, a]),
  );

  const out: OverlayBooking[] = [];
  const unplaced: Record<string, number> = {};
  const note = (reason: string) => {
    unplaced[reason] = (unplaced[reason] ?? 0) + 1;
  };

  for (const tb of tmsBookings) {
    const unitId = unitIdByTmsUnitId.get(tb.unitId);
    if (unitId === undefined) {
      // Only count it as unplaced if it would have been on screen — a booking for another
      // modality's unit isn't missing, it's just not this sheet.
      if (tb.date >= from && tb.date <= to) note("unit not linked to TMS");
      continue;
    }
    if (!taggedUnitIds.has(unitId)) continue; // another modality's sheet
    const siteId = siteIdByTmsLocationId.get(tb.locationId);
    if (siteId === undefined) {
      if (tb.date >= from && tb.date <= to) note("site not linked to TMS");
      continue;
    }

    // Cleared in the planner. TMS still has it, so it stays visible as a ghost rather than
    // vanishing — an empty cell would hide the fact that the planner and TMS disagree, which
    // is the whole thing ghosts exist to prevent. Unlike a moved ghost it links nowhere,
    // because there is no counterpart to link to.
    if (suppressedTmsIds.has(tb.id)) {
      if (tb.date >= from && tb.date <= to) {
        const { key } = localStatusKeyForTmsStatus(tb.statusId, statusNameById);
        out.push({
          unitId,
          date: tb.date,
          siteId,
          siteName: siteNameById.get(siteId) ?? "?",
          status: key,
          notes: tb.notes,
          publishedAt: null,
          updatedAt: tb.updatedAt,
          tmsConflictAt: null,
          tmsBookingId: tb.id,
          // A ghost renders TMS's own truth, so its origin is `tms` however much the planner
          // disagrees with it. The disagreement is carried by `ghostReason`, not by origin.
          origin: "tms",
          isGhost: true,
          ghostReason: "cleared",
          movedTo: null,
          movedFrom: null,
          tmsSupersedes: false,
        });
      }
      continue;
    }

    const amendment = amendmentByTmsBookingId.get(tb.id);

    if (!amendment) {
      // Untouched TMS booking — render it as-is, if it's in the window.
      if (tb.date < from || tb.date > to) continue;
      const { key } = localStatusKeyForTmsStatus(tb.statusId, statusNameById);
      out.push({
        unitId,
        date: tb.date,
        siteId,
        siteName: siteNameById.get(siteId) ?? "?",
        status: key,
        notes: tb.notes,
        publishedAt: null,
        // TMS's own updated_at — the grid uses this for optimistic-lock display only; a TMS
        // row isn't ours to lock.
        updatedAt: tb.updatedAt,
        tmsConflictAt: null,
        tmsBookingId: tb.id,
        origin: "tms",
        isGhost: false,
        ghostReason: null,
        movedTo: null,
        movedFrom: null,
        tmsSupersedes: false,
      });
      continue;
    }

    // Amended. If it's still in TMS's slot, the amendment simply replaces it there and the
    // amendment loop below emits it. If it has moved, leave a ghost behind at TMS's slot.
    const moved = amendment.unitId !== unitId || amendment.date !== tb.date;
    if (moved && tb.date >= from && tb.date <= to) {
      const { key } = localStatusKeyForTmsStatus(tb.statusId, statusNameById);
      out.push({
        unitId,
        date: tb.date,
        siteId,
        siteName: siteNameById.get(siteId) ?? "?",
        status: key,
        notes: tb.notes,
        publishedAt: null,
        updatedAt: tb.updatedAt,
        tmsConflictAt: null,
        tmsBookingId: tb.id,
        origin: "tms",
        isGhost: true,
        ghostReason: "moved",
        movedTo: { unitId: amendment.unitId, date: amendment.date },
        movedFrom: null,
        tmsSupersedes: false,
      });
    }
  }

  // TMS positions, for drawing a moved amendment's link back to where TMS still has it.
  const tmsSlotByBookingId = new Map<number, { unitId: number; date: string }>();
  for (const tb of tmsBookings) {
    const unitId = unitIdByTmsUnitId.get(tb.unitId);
    if (unitId !== undefined) tmsSlotByBookingId.set(tb.id, { unitId, date: tb.date });
  }

  for (const a of amendments) {
    if (a.date < from || a.date > to) continue;
    const tmsSlot = a.tmsBookingId !== null ? tmsSlotByBookingId.get(a.tmsBookingId) ?? null : null;
    const moved = tmsSlot !== null && (tmsSlot.unitId !== a.unitId || tmsSlot.date !== a.date);

    // Stage C3: has TMS changed this booking since we amended it? Compared by TMS's own
    // updated_at, not content — a status/site/notes edit and a TMS-side move both bump it.
    const tmsBooking = a.tmsBookingId !== null ? tmsBookings.find((b) => b.id === a.tmsBookingId) : undefined;
    const tmsSupersedes = !!(tmsBooking && a.tmsUpdatedAt && tmsBooking.updatedAt.getTime() !== a.tmsUpdatedAt.getTime());

    out.push(toOverlay(a, a.tmsBookingId, moved ? tmsSlot : null, tmsSupersedes));
  }

  // A ghost and a real booking can't legitimately share a slot — a ghost only exists where the
  // amendment moved away. If they ever do, something upstream is wrong; drop the ghost rather
  // than render two chips in one cell.
  const realSlots = new Set(out.filter((b) => !b.isGhost).map((b) => slot(b.unitId, b.date)));
  const deduped = out.filter((b) => !b.isGhost || !realSlots.has(slot(b.unitId, b.date)));

  return { bookings: deduped, fetchedAt, unplaced };
}

/**
 * The TMS booking sitting at a given unit + date, if any.
 *
 * The write paths need this because, under the overlay, a scheduler can act on a booking that
 * has **no local row at all** — an untouched TMS booking. Editing or clearing one has to
 * create an amendment carrying its `tms_booking_id`, not a free-standing local booking, or
 * the merge would render both the TMS original and the new row in the same cell.
 *
 * Reads through the same 5-minute cache the grid uses, so this costs nothing on the hot path.
 */
export type TmsCell = {
  tmsBookingId: number;
  tmsUpdatedAt: Date;
  siteId: number;
  status: string;
  notes: string | null;
};

export const tmsCellKey = (unitId: number, date: string) => `${unitId}|${date}`;

/**
 * Batch form: resolve many unit+date slots at once.
 *
 * Used by the move path, which needs every source AND every target slot resolved. Doing it
 * one slot at a time would re-read the same reference tables per booking — a 30-booking
 * multi-select would issue 60 rounds of the same three queries.
 */
export async function resolveTmsCells(
  companyId: number,
  slots: { unitId: number; date: string }[],
): Promise<Map<string, TmsCell>> {
  const out = new Map<string, TmsCell>();
  if (!slots.length) return out;

  const [company] = await db
    .select({ tmsCompanyId: companies.tmsCompanyId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company?.tmsCompanyId) return out;

  const localUnits = await db
    .select({ id: units.id, tmsUnitId: units.tmsUnitId })
    .from(units)
    .where(and(eq(units.companyId, companyId), isNull(units.deletedAt), isNotNull(units.tmsUnitId)));
  const tmsUnitIdByLocal = new Map(localUnits.map((u) => [u.id, u.tmsUnitId as number]));

  const localSites = await db
    .select({ id: sites.id, tmsLocationId: sites.tmsLocationId })
    .from(sites)
    .where(and(eq(sites.companyId, companyId), isNull(sites.deletedAt), isNotNull(sites.tmsLocationId)));
  const siteIdByTmsLocationId = new Map(localSites.map((s) => [s.tmsLocationId as number, s.id]));

  const { bookings: tmsBookings, statusNameById } = await getTmsBookings(company.tmsCompanyId);
  const byTmsSlot = new Map(tmsBookings.map((b) => [`${b.unitId}|${b.date}`, b]));

  for (const s of slots) {
    const tmsUnitId = tmsUnitIdByLocal.get(s.unitId);
    if (tmsUnitId === undefined) continue;
    const hit = byTmsSlot.get(`${tmsUnitId}|${s.date}`);
    if (!hit) continue;
    const siteId = siteIdByTmsLocationId.get(hit.locationId);
    if (siteId === undefined) continue; // unmappable site — treat the slot as not resolvable
    out.set(tmsCellKey(s.unitId, s.date), {
      tmsBookingId: hit.id,
      tmsUpdatedAt: hit.updatedAt,
      siteId,
      status: localStatusKeyForTmsStatus(hit.statusId, statusNameById).key,
      notes: hit.notes,
    });
  }
  return out;
}

/** Single-slot convenience wrapper over {@link resolveTmsCells}. */
export async function resolveTmsBookingAt(
  companyId: number,
  unitId: number,
  date: string,
): Promise<TmsCell | null> {
  const cells = await resolveTmsCells(companyId, [{ unitId, date }]);
  return cells.get(tmsCellKey(unitId, date)) ?? null;
}

/**
 * The date span the grid should cover, across BOTH sources.
 *
 * Replaces `getBookingDateRange`, which reads only our own `bookings`. That was fine while we
 * held a copy of TMS's schedule, but under the overlay it would collapse to almost nothing —
 * once the copies are purged (Stage B3) the local table holds only amendments, so a
 * local-only range would hide the very TMS bookings the grid exists to show.
 *
 * Null when neither side has anything, leaving the caller to pick a default window.
 */
export async function getOverlayDateRange(
  companyId: number,
  modalityId: number,
): Promise<{ from: string; to: string } | null> {
  const [company] = await db
    .select({ tmsCompanyId: companies.tmsCompanyId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const dates: string[] = [];

  if (company?.tmsCompanyId) {
    const { bookings: tmsBookings } = await getTmsBookings(company.tmsCompanyId);
    const unitIds = new Set(
      (
        await db
          .select({ id: units.id, tmsUnitId: units.tmsUnitId })
          .from(units)
          .where(and(eq(units.companyId, companyId), isNull(units.deletedAt), isNotNull(units.tmsUnitId)))
      ).map((u) => u.tmsUnitId as number),
    );
    const tagged = new Set(
      (
        await db
          .select({ unitId: unitModalities.unitId })
          .from(unitModalities)
          .where(eq(unitModalities.modalityId, modalityId))
      ).map((t) => t.unitId),
    );
    const localIdByTms = new Map(
      (
        await db
          .select({ id: units.id, tmsUnitId: units.tmsUnitId })
          .from(units)
          .where(and(eq(units.companyId, companyId), isNull(units.deletedAt), isNotNull(units.tmsUnitId)))
      ).map((u) => [u.tmsUnitId as number, u.id]),
    );
    for (const b of tmsBookings) {
      if (!unitIds.has(b.unitId)) continue;
      const localId = localIdByTms.get(b.unitId);
      if (localId === undefined || !tagged.has(localId)) continue;
      dates.push(b.date);
    }
  }

  for (const a of await loadAmendments(companyId, modalityId)) dates.push(a.date);

  if (!dates.length) return null;
  let from = dates[0];
  let to = dates[0];
  for (const d of dates) {
    if (d < from) from = d;
    if (d > to) to = d;
  }
  return { from, to };
}

type AmendmentRow = {
  unitId: number;
  date: string;
  siteId: number;
  siteName: string;
  status: string;
  notes: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  tmsConflictAt: Date | null;
  tmsBookingId: number | null;
  tmsUpdatedAt: Date | null;
};

// tms_booking_id is UNIQUE on `bookings`, so a TMS booking has at most one amendment row
// ever — live or soft-deleted. That invariant is what makes "is this one suppressed?" a
// simple set membership rather than a per-row history question.
async function loadSuppressedTmsBookingIds(companyId: number, modalityId: number): Promise<Set<number>> {
  const rows = await db
    .select({ tmsBookingId: bookings.tmsBookingId })
    .from(bookings)
    .where(
      and(
        eq(bookings.companyId, companyId),
        eq(bookings.modalityId, modalityId),
        isNotNull(bookings.tmsBookingId),
        isNotNull(bookings.deletedAt),
      ),
    );
  return new Set(rows.map((r) => r.tmsBookingId as number));
}

async function loadAmendments(companyId: number, modalityId: number): Promise<AmendmentRow[]> {
  return db
    .select({
      unitId: bookings.unitId,
      date: bookings.date,
      siteId: bookings.siteId,
      siteName: sites.name,
      status: bookings.status,
      notes: bookings.notes,
      publishedAt: bookings.publishedAt,
      updatedAt: bookings.updatedAt,
      tmsConflictAt: bookings.tmsConflictAt,
      tmsBookingId: bookings.tmsBookingId,
      tmsUpdatedAt: bookings.tmsUpdatedAt,
    })
    .from(bookings)
    .innerJoin(sites, eq(sites.id, bookings.siteId))
    .where(
      and(eq(bookings.companyId, companyId), eq(bookings.modalityId, modalityId), isNull(bookings.deletedAt)),
    );
}

function toOverlay(
  a: AmendmentRow,
  tmsBookingId: number | null,
  movedFrom: { unitId: number; date: string } | null,
  tmsSupersedes: boolean,
): OverlayBooking {
  return {
    unitId: a.unitId,
    date: a.date,
    siteId: a.siteId,
    siteName: a.siteName,
    status: a.status,
    notes: a.notes,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    tmsConflictAt: a.tmsConflictAt,
    tmsBookingId,
    // Derived from the id we're actually emitting, not from `a.tmsBookingId`, so `origin`
    // and `tmsBookingId` can never contradict each other in the object the grid receives.
    // They differ in the no-TMS-company branch above, which passes null deliberately.
    origin: tmsBookingId === null ? "local" : "amended",
    isGhost: false,
    ghostReason: null,
    movedTo: null,
    movedFrom,
    tmsSupersedes,
  };
}
