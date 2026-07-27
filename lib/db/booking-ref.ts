import { sql } from "drizzle-orm";
import { db } from "./index";

// Accepts either `db` or a `tx` from db.transaction(...) — a sequence's nextval() isn't
// transactional anyway (it advances even if the surrounding transaction rolls back), so
// there's no correctness reason to require a transaction here.
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// "FP-000123" — a single global, never-reset sequence (bookingRefSeq in schema.ts;
// docs/TMS_INTEGRATION_PLAN.md §4.3). Every booking gets one at creation time, whether
// made locally or imported from TMS, so every row the app shows has one consistent handle
// distinct from TMS's own "BK:A…" numbers.
export async function nextBookingRef(executor: Executor): Promise<string> {
  const [row] = await executor.execute<{ n: string }>(sql`select nextval('booking_ref_seq') as n`);
  return `FP-${row.n.padStart(6, "0")}`;
}
