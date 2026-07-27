import mysql from "mysql2/promise";
import { getTmsPool } from "./pool";

export type TmsCompany = { id: number; name: string };

// Every company the sync is allowed to pull, per docs/TMS_INTEGRATION_PLAN.md §11: never
// a blended view across companies (each request/sync-target stays scoped to exactly one),
// but no longer hard-locked to InHealth alone — any company TMS itself has scheduling
// switched on for is in scope, and Quest can enable more over time without an app change.
export async function listSchedulingEnabledTmsCompanies(): Promise<TmsCompany[]> {
  const pool = getTmsPool();
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT id, company_name FROM companies WHERE enable_scheduling = 1 AND deleted_at IS NULL ORDER BY id ASC",
  );
  return rows.map((r) => ({ id: r.id, name: String(r.company_name).trim() }));
}

export type TmsLocation = {
  id: number;
  name: string;
  town: string | null;
  postcode: string | null;
  nominalCode: string | null;
};

export async function listTmsLocations(tmsCompanyId: number): Promise<TmsLocation[]> {
  const pool = getTmsPool();
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT id, name, town, postcode, nominal_code FROM locations WHERE company_id = ? AND deleted_at IS NULL ORDER BY id ASC",
    [tmsCompanyId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: String(r.name).trim(),
    town: r.town?.trim() || null,
    postcode: r.postcode?.trim() || null,
    nominalCode: r.nominal_code?.trim() || null,
  }));
}

export type TmsUnit = {
  id: number;
  registration: string;
  // Global TMS modality names this unit is tagged for, e.g. ["CT", "MRI"] — see
  // unit_modalities in docs/TMS_INTEGRATION_PLAN.md §4.2. Empty if untagged in TMS.
  modalityNames: string[];
};

export async function listTmsUnits(tmsCompanyId: number): Promise<TmsUnit[]> {
  const pool = getTmsPool();
  // MySQL's GROUP_CONCAT SEPARATOR clause only accepts a literal, not a bound parameter —
  // safe to rely on the default comma separator here since none of TMS's 8 modality names
  // (CT, MRI, PET-CT, Cardiac, Cath Labs, Endoscopy, Mammography, Support Units) contain one.
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT u.id, u.registration, GROUP_CONCAT(m.name) AS modality_names " +
      "FROM units u " +
      "LEFT JOIN unit_modalities um ON um.unit_id = u.id " +
      "LEFT JOIN modalities m ON m.id = um.modality_id " +
      "WHERE u.company_id = ? AND u.deleted_at IS NULL " +
      "GROUP BY u.id, u.registration " +
      "ORDER BY u.id ASC",
    [tmsCompanyId],
  );
  return rows.map((r) => ({
    id: r.id,
    registration: String(r.registration).trim(),
    modalityNames: r.modality_names ? String(r.modality_names).split(",") : [],
  }));
}

export type TmsBookingStatus = { id: number; name: string };

// booking_statuses is TMS's OWN, per-company status table — "obsolete" only in the sense
// that we don't manage our own catalogue from it going forward (docs/DECISIONS.md #18,
// TMS_INTEGRATION_PLAN.md §3). A live TMS booking still references one of these ids, so
// the import needs read access to translate that id into a name we can map onto our own
// catalogue — this is a one-time-per-import lookup, not an ongoing sync of the table itself.
export async function listTmsBookingStatuses(tmsCompanyId: number): Promise<TmsBookingStatus[]> {
  const pool = getTmsPool();
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT id, name FROM booking_statuses WHERE company_id = ?",
    [tmsCompanyId],
  );
  return rows.map((r) => ({ id: r.id, name: String(r.name).trim() }));
}

export type TmsBooking = {
  id: number;
  unitId: number;
  locationId: number;
  date: string; // ISO yyyy-mm-dd — first_day, which always equals last_day (verified per-company)
  statusId: number;
  notes: string | null;
  updatedAt: Date;
};

export async function listTmsBookings(tmsCompanyId: number): Promise<TmsBooking[]> {
  const pool = getTmsPool();
  // first_day/last_day are pulled via DATE_FORMAT, not as DATETIME — a calendar date has
  // no timezone, so letting the driver round-trip it through a JS Date (which necessarily
  // reinterprets it against the connection's timezone) is a category error, not just an
  // edge case. Confirmed for real: the MySQL server's SYSTEM timezone is Europe/London;
  // during BST (UTC+1) a naive `new Date(first_day).toISOString().slice(0,10)` shifts
  // every affected date back by one day — e.g. a booking truly on 2026-03-30 round-tripped
  // as "2026-03-29T23:00:00.000Z", which silently collided with the real 2026-03-29
  // booking for the same unit on import. DATE_FORMAT returns the stored calendar date as
  // a plain string, sidestepping timezone interpretation entirely. updated_at is a real
  // instant, not a calendar date, so it's left as a normal DATETIME/JS Date on purpose.
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT id, unit_id, location_id, DATE_FORMAT(first_day, '%Y-%m-%d') AS first_day, " +
      "DATE_FORMAT(last_day, '%Y-%m-%d') AS last_day, status, notes, updated_at " +
      "FROM bookings " +
      "WHERE company_id = ? AND deleted_at IS NULL AND unit_id IS NOT NULL AND location_id IS NOT NULL " +
      "ORDER BY id ASC",
    [tmsCompanyId],
  );
  const out: TmsBooking[] = [];
  for (const r of rows) {
    // The app's whole model is one booking = one day — a multi-day TMS row doesn't fit
    // without splitting it, which is a real design decision, not something to guess at
    // silently. None exist for InHealth today (verified); skip rather than mis-import if
    // one ever appears in this or any other synced company.
    const first: string = r.first_day;
    const last: string = r.last_day;
    if (first !== last) continue;
    out.push({
      id: r.id,
      unitId: r.unit_id,
      locationId: r.location_id,
      date: first,
      statusId: r.status,
      notes: r.notes?.trim() || null,
      updatedAt: r.updated_at,
    });
  }
  return out;
}
