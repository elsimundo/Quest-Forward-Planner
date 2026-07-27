import { inArray } from "drizzle-orm";
import { db } from "./index";
import { units } from "./schema";

type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];

// bookings.unit_id is now a numeric surrogate key, not the registration
// (docs/TMS_INTEGRATION_PLAN.md §4.1) — but the audit log's whole point is staying
// readable ("who moved CT38 off the Gloucester run", CLAUDE.md), so every write site that
// logs a booking_events snapshot enriches it with `unitRegistration` via this lookup rather
// than letting the raw numeric id leak into what's shown to a human.
export async function getUnitRegistrations(tx: Executor, unitIds: number[]): Promise<Map<number, string>> {
  const ids = [...new Set(unitIds)];
  if (!ids.length) return new Map();
  const rows = await tx.select({ id: units.id, registration: units.registration }).from(units).where(inArray(units.id, ids));
  return new Map(rows.map((r) => [r.id, r.registration]));
}
