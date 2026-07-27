// One-off migration: CT_Forward_Planner_23012025.xlsx -> modalities/units/unit_specs/
// sites/bookings/booking_events. Re-runnable (idempotent upserts) but meant to run once
// against a fresh CT modality. See docs/DATABASE.md "Migration & seeding" and SPEC.md §13.
//
// SUPERSEDED as a source of truth by the TMS integration (docs/TMS_INTEGRATION_PLAN.md §8)
// — real units/locations/bookings come from TMS, not this workbook. Kept runnable purely
// as a local-dev seeding convenience.
//
// Colour-to-status mapping and the day-of-week weekend override were derived by scanning
// every fill colour in the real workbook against real day-rows (see chat history / PR
// description, not reproduced here) rather than guessed from SPEC's legend alone:
//   - The four colours SPEC §13 Q5 flagged as undocumented (F8CBAD, B4C6E7, E2EFDA, E08B8B)
//     plus 808080 never appear on a real booking cell — they only decorate a recurring
//     "AVAILABLE IN MONTH / NOT AVAILABLE / RD / OR / EMPTY" summary block that reuses the
//     month's first date as a label. Those rows are excluded below, not mapped to a status.
//   - `weekend` has three real fill variants (one explicit RGB grey, two Excel theme+tint
//     greys) that all correlate with Sat/Sun; day-of-week is used as the actual signal,
//     with any explicit status colour (e.g. bidding-red on a Saturday) taking precedence.
import "dotenv/config";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  companies,
  modalities,
  units,
  unitModalities,
  unitSpecs,
  sites,
  bookings,
  bookingEvents,
  users,
  type Status,
} from "../lib/db/schema";
import { nextBookingRef } from "../lib/db/booking-ref";

const XLSX_PATH = process.argv[2] ?? "data/CT_Forward_Planner_23012025.xlsx";
const UNIT_COL_START = 4; // col D — CT15
const UNIT_COL_END = 34; // col AH — CT45
const DOW = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const WEEKEND_DOW = new Set(["Sat", "Sun"]);

// Only the confirmed cancelled/chargeable pattern is stripped — every other dash-suffix
// in the sheet ("- Canon PM", "- 6 monthly", "- unstaffed", "- ENT"...) is meaningful site
// text, not a status suffix, and is left alone.
const CANCELLED_SUFFIX = /\s*[-–—]\s*cancelled(?:\s+by\s+customer)?\s*(?:[-–—]\s*)?chargeable\.?\s*$/i;

type FillKey = string;

function fillKey(cell: ExcelJS.Cell): FillKey {
  const fill = cell.fill as ExcelJS.FillPattern | undefined;
  if (!fill || fill.type !== "pattern") return "BLANK";
  const fg = fill.fgColor as (ExcelJS.Color & { tint?: number }) | undefined;
  if (!fg) return "BLANK";
  if (fg.argb) return `rgb:${fg.argb.length === 8 ? fg.argb.slice(2).toUpperCase() : fg.argb.toUpperCase()}`;
  if (fg.theme !== undefined) return `theme:${fg.theme}:${(fg.tint ?? 0).toFixed(4)}`;
  return "BLANK";
}

// Base status per fill colour, before the weekend/day-of-week override is applied.
const FILL_STATUS: Record<FillKey, Status> = {
  "BLANK": "confirmed",
  "rgb:FFFFFF": "confirmed",
  "theme:0:0.0000": "confirmed",
  "rgb:FFFF00": "bankholiday",
  "rgb:92D050": "likely",
  "rgb:FF0000": "bidding",
  "rgb:00B0F0": "service",
  "rgb:0070C0": "service", // one-off near-duplicate of the documented service blue
  "rgb:FFC000": "tbc",
  "rgb:FA82EE": "cancelled",
  "rgb:A6A6A6": "weekend",
  "theme:0:-0.3500": "weekend",
  "theme:0:-0.2500": "weekend",
};

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value as unknown;
  if (v instanceof Date) return "";
  if (v && typeof v === "object" && "richText" in (v as object)) {
    return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  if (v && typeof v === "object" && "text" in (v as object)) {
    return String((v as { text: unknown }).text);
  }
  return v == null ? "" : String(v);
}

function cleanWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function decodeStatus(cell: ExcelJS.Cell, dow: string): Status {
  const key = fillKey(cell);
  const base = FILL_STATUS[key] ?? "confirmed";
  if (WEEKEND_DOW.has(dow) && base === "confirmed") return "weekend";
  return base;
}

function splitSiteAndNotes(raw: string): { site: string; notes: string | null; forceCancelled: boolean } {
  const cleaned = cleanWhitespace(raw);
  const match = cleaned.match(CANCELLED_SUFFIX);
  if (!match) return { site: cleaned, notes: null, forceCancelled: false };
  return {
    site: cleanWhitespace(cleaned.slice(0, match.index)),
    notes: "Cancelled by customer — chargeable",
    forceCancelled: true,
  };
}

function parseUnitId(header: string): { id: string; description: string } | null {
  const match = header.match(/^(R?CT\s*\d+)/i);
  if (!match) return null;
  const id = match[1].replace(/\s+/g, "").toUpperCase();
  const description = cleanWhitespace(header.slice(match[0].length));
  return { id, description };
}

async function ensureSystemUser(): Promise<number> {
  const email = "migration@system.quest.local";
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const [created] = await db
    .insert(users)
    .values({ name: "Data Migration", email, passwordHash, role: "admin" })
    .returning({ id: users.id });
  return created.id;
}

async function ensureCtModality(): Promise<number> {
  const [existing] = await db.select().from(modalities).where(eq(modalities.name, "CT")).limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(modalities)
    .values({ name: "CT", displayOrder: 0 })
    .returning({ id: modalities.id });
  return created.id;
}

// The only company this workbook (and this app) handles today
// (docs/TMS_INTEGRATION_PLAN.md §2: "InHealth company_id = 3 ONLY" in TMS terms — this is
// just the local placeholder row units/sites/bookings hang off until the real sync exists).
async function ensureInHealthCompany(): Promise<number> {
  const [existing] = await db.select().from(companies).where(eq(companies.name, "InHealth")).limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(companies).values({ name: "InHealth" }).returning({ id: companies.id });
  return created.id;
}

async function main() {
  console.log(`Reading ${XLSX_PATH}...`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  const modalityId = await ensureCtModality();
  const companyId = await ensureInHealthCompany();
  const systemUserId = await ensureSystemUser();
  const batchId = randomUUID();

  // ── Units, from CT FP's row-1 header (unit ID + full description) ──
  const fpSheet = workbook.getWorksheet("CT FP")!;
  const header1 = fpSheet.getRow(1);
  const unitList: { id: string; description: string; displayOrder: number; col: number }[] = [];
  for (let c = UNIT_COL_START; c <= UNIT_COL_END; c++) {
    const text = cellText(header1.getCell(c)).trim();
    if (!text) continue;
    const parsed = parseUnitId(text);
    if (!parsed) {
      console.warn(`  ! Unit column ${c} header doesn't look like a unit ID: "${text}" — skipped`);
      continue;
    }
    unitList.push({ ...parsed, displayOrder: unitList.length, col: c });
  }
  console.log(`Found ${unitList.length} units in CT FP header.`);

  // registration ("CT17") -> surrogate units.id — units.id is a numeric surrogate key now,
  // not the registration itself (docs/TMS_INTEGRATION_PLAN.md §4.1), so every downstream
  // insert (unit_specs, bookings) needs this map to resolve the real FK value.
  const unitIdByRegistration = new Map<string, number>();
  for (const u of unitList) {
    const [row] = await db
      .insert(units)
      .values({
        companyId,
        registration: u.id,
        displayOrder: u.displayOrder,
        description: u.description,
        active: true,
      })
      .onConflictDoUpdate({
        target: [units.companyId, units.registration],
        targetWhere: sql`${units.deletedAt} is null`,
        set: { description: u.description, displayOrder: u.displayOrder },
      })
      .returning({ id: units.id });
    unitIdByRegistration.set(u.id, row.id);
    await db
      .insert(unitModalities)
      .values({ unitId: row.id, modalityId })
      .onConflictDoNothing({ target: [unitModalities.unitId, unitModalities.modalityId] });
  }

  // ── Unit specs, from CT inventory checklist — exact unit-ID match only ──
  const invSheet = workbook.getWorksheet("CT inventory checklist");
  if (invSheet) {
    const knownIds = new Set(unitList.map((u) => u.id));
    const invHeader = invSheet.getRow(1);
    const invCols: { col: number; id: string }[] = [];
    const unmatchedInvIds: string[] = [];
    for (let c = 2; c <= invSheet.columnCount; c++) {
      const raw = cellText(invHeader.getCell(c)).trim();
      if (!raw) continue;
      const id = raw.replace(/\s+/g, "").toUpperCase();
      if (knownIds.has(id)) invCols.push({ col: c, id });
      else unmatchedInvIds.push(raw);
    }
    const matchedIds = new Set(invCols.map((c) => c.id));
    const missingSpecs = unitList.filter((u) => !matchedIds.has(u.id)).map((u) => u.id);

    let specCount = 0;
    for (let r = 1; r <= invSheet.rowCount; r++) {
      const row = invSheet.getRow(r);
      const key = cellText(row.getCell(1)).trim();
      if (!key) continue;
      for (const { col, id } of invCols) {
        const value = cellText(row.getCell(col)).trim();
        if (!value) continue;
        const unitId = unitIdByRegistration.get(id)!;
        await db
          .insert(unitSpecs)
          .values({ unitId, key, value })
          .onConflictDoUpdate({ target: [unitSpecs.unitId, unitSpecs.key], set: { value } });
        specCount++;
      }
    }
    console.log(`Imported ${specCount} unit_specs rows for ${invCols.length} matched units.`);
    if (unmatchedInvIds.length) {
      console.warn(
        `  ! Inventory checklist has ${unmatchedInvIds.length} column(s) with no matching CT FP unit — specs skipped: ${unmatchedInvIds.join(", ")}`,
      );
    }
    if (missingSpecs.length) {
      console.warn(
        `  ! ${missingSpecs.length} CT FP unit(s) have no inventory-checklist row at all — no specs imported: ${missingSpecs.join(", ")}`,
      );
    }
  } else {
    console.warn('  ! "CT inventory checklist" sheet not found — no unit_specs imported.');
  }

  // ── Bookings + sites, from CT FP data rows ──
  type RowData = { rowNumber: number; date: Date; dow: string; populatedCount: number };
  const dateRows = new Map<string, RowData>(); // iso date -> best row (most populated), dedup

  for (let r = 3; r <= fpSheet.rowCount; r++) {
    const row = fpSheet.getRow(r);
    const dateVal = row.getCell(1).value;
    const dow = cellText(row.getCell(2)).trim();
    if (!(dateVal instanceof Date) || !DOW.has(dow)) continue; // skips monthly summary blocks

    let populatedCount = 0;
    for (const u of unitList) if (cellText(row.getCell(u.col)).trim()) populatedCount++;

    const iso = dateVal.toISOString().slice(0, 10);
    const existing = dateRows.get(iso);
    if (!existing || populatedCount > existing.populatedCount) {
      dateRows.set(iso, { rowNumber: r, date: dateVal, dow, populatedCount });
    }
  }
  const duplicateDates = [...dateRows.values()].length;
  console.log(`${duplicateDates} distinct real day-rows found (duplicates resolved by "fullest row wins").`);

  const siteIdByName = new Map<string, number>();
  async function ensureSite(name: string): Promise<number> {
    const existing = siteIdByName.get(name);
    if (existing) return existing;
    const [inserted] = await db
      .insert(sites)
      .values({ name, companyId })
      .onConflictDoNothing({
        // sites.name is unique per-company, not globally (docs/DECISIONS.md #23) — matches
        // the partial index exactly, same pattern as the bookings insert below.
        target: [sites.companyId, sites.name],
        where: sql`${sites.deletedAt} is null`,
      })
      .returning({ id: sites.id });
    const row =
      inserted ?? (await db.select({ id: sites.id }).from(sites).where(and(eq(sites.name, name), eq(sites.companyId, companyId))).limit(1))[0];
    siteIdByName.set(name, row.id);
    return row.id;
  }

  // Inverse of unitIdByRegistration, for enriching booking_events snapshots with a human
  // label the same way every other write path in the app does (docs/TMS_INTEGRATION_PLAN.md
  // §4.1) — bookings.unit_id is a numeric surrogate, not something worth showing raw.
  const registrationByUnitId = new Map([...unitIdByRegistration].map(([reg, id]) => [id, reg]));

  let candidateCount = 0;
  let insertedCount = 0;
  const BATCH_SIZE = 500;
  let pendingBookings: (typeof bookings.$inferInsert)[] = [];

  async function flush() {
    if (!pendingBookings.length) return;
    // Every write to bookings writes a matching booking_events row in the same
    // transaction (docs/DATABASE.md query conventions) — including bulk migration writes.
    await db.transaction(async (tx) => {
      // bookings' uniqueness is a partial index (WHERE deleted_at IS NULL) — the ON
      // CONFLICT target inference must repeat that predicate or Postgres won't match it.
      const inserted = await tx
        .insert(bookings)
        .values(pendingBookings)
        .onConflictDoNothing({
          target: [bookings.unitId, bookings.date],
          where: sql`${bookings.deletedAt} is null`,
        })
        .returning();
      insertedCount += inserted.length;
      if (inserted.length) {
        await tx.insert(bookingEvents).values(
          inserted.map((row) => ({
            actorId: systemUserId,
            action: "create" as const,
            batchId,
            bookingBefore: null,
            bookingAfter: { ...row, unitRegistration: registrationByUnitId.get(row.unitId) },
          })),
        );
      }
    });
    pendingBookings = [];
  }

  for (const { rowNumber, dow } of dateRows.values()) {
    const row = fpSheet.getRow(rowNumber);
    const iso = (row.getCell(1).value as Date).toISOString().slice(0, 10);

    for (const u of unitList) {
      const cell = row.getCell(u.col);
      const rawText = cellText(cell).trim();
      if (!rawText) continue;

      const { site, notes, forceCancelled } = splitSiteAndNotes(rawText);
      if (!site) continue;
      const status: Status = forceCancelled ? "cancelled" : decodeStatus(cell, dow);
      const siteId = await ensureSite(site);

      pendingBookings.push({
        bookingRef: await nextBookingRef(db),
        unitId: unitIdByRegistration.get(u.id)!,
        companyId,
        modalityId,
        date: iso,
        siteId,
        status,
        notes,
        createdBy: systemUserId,
        updatedBy: systemUserId,
      });
      candidateCount++;
      if (pendingBookings.length >= BATCH_SIZE) await flush();
    }
  }
  await flush();

  console.log(
    `Imported ${insertedCount} new bookings (${candidateCount} candidate cells, ${candidateCount - insertedCount} already existed) across ${siteIdByName.size} distinct sites.`,
  );
  console.log("Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
