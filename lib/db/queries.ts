import { and, asc, eq, gte, ilike, isNull, lte, sql } from "drizzle-orm";
import { db } from "./index";
import {
  modalities,
  companies,
  units,
  unitModalities,
  unitSpecs,
  bookings,
  bookingStatuses,
  sites,
  siteCapabilityRequirements,
} from "./schema";
import type { StatusView } from "@/lib/statuses";

// The admin-managed status catalogue (docs/DECISIONS.md #18), display-ordered. Includes
// inactive-but-not-deleted rows so a booking still carrying a retired status renders; the
// drawer/toolbar filter to active+editable themselves.
export async function getBookingStatuses(): Promise<StatusView[]> {
  const rows = await db
    .select({
      key: bookingStatuses.key,
      label: bookingStatuses.label,
      bg: bookingStatuses.colorBg,
      bar: bookingStatuses.colorBar,
      text: bookingStatuses.colorText,
      border: bookingStatuses.colorBorder,
      editable: bookingStatuses.editable,
      calendarDerived: bookingStatuses.calendarDerived,
      displayOrder: bookingStatuses.displayOrder,
      active: bookingStatuses.active,
    })
    .from(bookingStatuses)
    .where(isNull(bookingStatuses.deletedAt))
    .orderBy(asc(bookingStatuses.displayOrder));
  return rows;
}

export async function getActiveModalities() {
  return db
    .select({ id: modalities.id, name: modalities.name, displayOrder: modalities.displayOrder })
    .from(modalities)
    .where(isNull(modalities.deletedAt))
    .orderBy(asc(modalities.displayOrder));
}

// The modality tab strip only ever shows sheets this company actually has active units
// for (docs/DECISIONS.md #9's "modality-switcher tab control") — not every modality that
// exists globally, most of which would just be an empty grid for a single-company deployment.
export async function getModalitiesForCompany(companyId: number) {
  return db
    .selectDistinct({ id: modalities.id, name: modalities.name, displayOrder: modalities.displayOrder })
    .from(modalities)
    .innerJoin(unitModalities, eq(unitModalities.modalityId, modalities.id))
    .innerJoin(units, eq(units.id, unitModalities.unitId))
    .where(and(eq(units.companyId, companyId), eq(units.active, true), isNull(units.deletedAt), isNull(modalities.deletedAt)))
    .orderBy(asc(modalities.displayOrder));
}

// Every company this planner has any local data for — only ever shown to a super_admin
// (docs/DECISIONS.md #22's company picker); everyone else is hard-locked to their own.
export async function listCompaniesForPicker() {
  return db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(asc(companies.name));
}

// Units belong to a modality via unit_modalities now, not a direct column — a unit can
// carry more than one modality and appear on more than one sheet (docs/TMS_INTEGRATION_PLAN.md
// §4.2). companyId comes from the caller's resolved company access
// (lib/auth/company-access.ts, docs/DECISIONS.md #22) — never a client-supplied value.
export async function getActiveUnits(companyId: number, modalityId: number) {
  return db
    .select({
      id: units.id,
      registration: units.registration,
      description: units.description,
      displayOrder: units.displayOrder,
    })
    .from(units)
    .innerJoin(unitModalities, eq(unitModalities.unitId, units.id))
    .where(
      and(
        eq(units.companyId, companyId),
        eq(unitModalities.modalityId, modalityId),
        eq(units.active, true),
        isNull(units.deletedAt),
      ),
    )
    .orderBy(asc(units.displayOrder));
}

// The grid's date range is bounded by what data actually exists for the modality —
// see the note in app/(planner)/page.tsx for why this isn't a truly unbounded calendar yet.
export async function getBookingDateRange(companyId: number, modalityId: number): Promise<{ from: string; to: string } | null> {
  const [row] = await db
    .select({
      min: sql<string | null>`min(${bookings.date})`,
      max: sql<string | null>`max(${bookings.date})`,
    })
    .from(bookings)
    .where(and(eq(bookings.companyId, companyId), eq(bookings.modalityId, modalityId), isNull(bookings.deletedAt)));
  if (!row?.min || !row?.max) return null;
  return { from: row.min, to: row.max };
}

export type GridBooking = {
  unitId: number;
  date: string;
  siteId: number;
  siteName: string;
  // A key into the admin-managed status catalogue — resolved to colours/label at render
  // time via the status context, not a fixed enum.
  status: string;
  notes: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  // Set by the TMS booking import when TMS and a local edit both changed this booking
  // since the last import (docs/DECISIONS.md #21) — surfaced in the grid as a badge;
  // cleared the next time a scheduler edits and re-saves the booking.
  tmsConflictAt: Date | null;
};

export async function getBookingsInRange(companyId: number, modalityId: number, from: string, to: string): Promise<GridBooking[]> {
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
    })
    .from(bookings)
    .innerJoin(sites, eq(sites.id, bookings.siteId))
    .where(
      and(
        eq(bookings.companyId, companyId),
        eq(bookings.modalityId, modalityId),
        isNull(bookings.deletedAt),
        gte(bookings.date, from),
        lte(bookings.date, to),
      ),
    );
}

// Unit specs grouped by unit — small dataset (a few hundred rows total), fetched once
// alongside the grid rather than per-drawer-open. Drives the drawer's spec card and the
// §2a capability-mismatch check. Scoped via a join through units — unit_specs has no
// company_id of its own.
export async function getAllUnitSpecs(companyId: number): Promise<Record<number, Record<string, string>>> {
  const rows = await db
    .select({ unitId: unitSpecs.unitId, key: unitSpecs.key, value: unitSpecs.value })
    .from(unitSpecs)
    .innerJoin(units, eq(units.id, unitSpecs.unitId))
    .where(eq(units.companyId, companyId));
  const byUnit: Record<number, Record<string, string>> = {};
  for (const row of rows) {
    (byUnit[row.unitId] ??= {})[row.key] = row.value ?? "";
  }
  return byUnit;
}

// Same reasoning — empty today (SPEC §2a: requirements are set on the admin page, not
// yet built), but cheap to fetch once and keep the grid/drawer ready for when it isn't.
// Scoped via a join through sites — site_capability_requirements has no company_id of its own.
export async function getAllSiteCapabilityRequirements(
  companyId: number,
): Promise<Record<number, { requirementKey: string; required: boolean }[]>> {
  const rows = await db
    .select({
      siteId: siteCapabilityRequirements.siteId,
      requirementKey: siteCapabilityRequirements.requirementKey,
      required: siteCapabilityRequirements.required,
    })
    .from(siteCapabilityRequirements)
    .innerJoin(sites, eq(sites.id, siteCapabilityRequirements.siteId))
    .where(eq(sites.companyId, companyId));
  const bySite: Record<number, { requirementKey: string; required: boolean }[]> = {};
  for (const row of rows) {
    (bySite[row.siteId] ??= []).push({ requirementKey: row.requirementKey, required: row.required });
  }
  return bySite;
}

export type SiteMatch = { id: number; name: string };

// SPEC §5: combobox with type-ahead over sites, ≥2 chars, top 6 — extended so an EMPTY
// query (the field on focus, before typing) browses the company's full site list instead
// of showing nothing, per the client's ask for "search or a dropdown list of locations".
export async function searchSites(companyId: number, query: string): Promise<SiteMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(and(eq(sites.companyId, companyId), isNull(sites.deletedAt)))
      .orderBy(asc(sites.name));
  }
  if (trimmed.length < 2) return [];
  return db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(eq(sites.companyId, companyId), isNull(sites.deletedAt), ilike(sites.name, `%${trimmed}%`)))
    .orderBy(asc(sites.name))
    .limit(6);
}
