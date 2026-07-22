import { and, asc, eq, gte, ilike, isNull, lte, sql } from "drizzle-orm";
import { db } from "./index";
import {
  modalities,
  units,
  unitSpecs,
  bookings,
  sites,
  siteCapabilityRequirements,
  type Status,
} from "./schema";

export async function getActiveModalities() {
  return db
    .select({ id: modalities.id, name: modalities.name, displayOrder: modalities.displayOrder })
    .from(modalities)
    .where(isNull(modalities.deletedAt))
    .orderBy(asc(modalities.displayOrder));
}

export async function getActiveUnits(modalityId: number) {
  return db
    .select({
      id: units.id,
      description: units.description,
      displayOrder: units.displayOrder,
    })
    .from(units)
    .where(and(eq(units.modalityId, modalityId), eq(units.active, true), isNull(units.deletedAt)))
    .orderBy(asc(units.displayOrder));
}

// The grid's date range is bounded by what data actually exists for the modality —
// see the note in app/(planner)/page.tsx for why this isn't a truly unbounded calendar yet.
export async function getBookingDateRange(modalityId: number): Promise<{ from: string; to: string } | null> {
  const [row] = await db
    .select({
      min: sql<string | null>`min(${bookings.date})`,
      max: sql<string | null>`max(${bookings.date})`,
    })
    .from(bookings)
    .innerJoin(units, eq(units.id, bookings.unitId))
    .where(and(eq(units.modalityId, modalityId), isNull(bookings.deletedAt)));
  if (!row?.min || !row?.max) return null;
  return { from: row.min, to: row.max };
}

export type GridBooking = {
  unitId: string;
  date: string;
  siteId: number;
  siteName: string;
  status: Status;
  notes: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

export async function getBookingsInRange(modalityId: number, from: string, to: string): Promise<GridBooking[]> {
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
    })
    .from(bookings)
    .innerJoin(units, eq(units.id, bookings.unitId))
    .innerJoin(sites, eq(sites.id, bookings.siteId))
    .where(
      and(
        eq(units.modalityId, modalityId),
        isNull(bookings.deletedAt),
        gte(bookings.date, from),
        lte(bookings.date, to),
      ),
    );
}

// Unit specs grouped by unit — small dataset (a few hundred rows total), fetched once
// alongside the grid rather than per-drawer-open. Drives the drawer's spec card and the
// §2a capability-mismatch check.
export async function getAllUnitSpecs(): Promise<Record<string, Record<string, string>>> {
  const rows = await db.select({ unitId: unitSpecs.unitId, key: unitSpecs.key, value: unitSpecs.value }).from(unitSpecs);
  const byUnit: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    (byUnit[row.unitId] ??= {})[row.key] = row.value ?? "";
  }
  return byUnit;
}

// Same reasoning — empty today (SPEC §2a: requirements are set on the admin page, not
// yet built), but cheap to fetch once and keep the grid/drawer ready for when it isn't.
export async function getAllSiteCapabilityRequirements(): Promise<
  Record<number, { requirementKey: string; required: boolean }[]>
> {
  const rows = await db
    .select({
      siteId: siteCapabilityRequirements.siteId,
      requirementKey: siteCapabilityRequirements.requirementKey,
      required: siteCapabilityRequirements.required,
    })
    .from(siteCapabilityRequirements);
  const bySite: Record<number, { requirementKey: string; required: boolean }[]> = {};
  for (const row of rows) {
    (bySite[row.siteId] ??= []).push({ requirementKey: row.requirementKey, required: row.required });
  }
  return bySite;
}

export type SiteMatch = { id: number; name: string };

// SPEC §5: combobox with type-ahead over sites, ≥2 chars, top 6.
export async function searchSites(query: string): Promise<SiteMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(isNull(sites.deletedAt), ilike(sites.name, `%${trimmed}%`)))
    .orderBy(asc(sites.name))
    .limit(6);
}
