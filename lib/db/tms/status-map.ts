// TMS status NAME → our own status key.
//
// Matched on the name rather than TMS's `booking_statuses.id` because the id is per-company
// (TMS keeps a separate catalogue per company), whereas the names are the client's own
// shared vocabulary. Confirmed against TMS company 3's live catalogue, which holds exactly
// these eight (docs/DECISIONS.md #18) — six of them deactivated in TMS's scheduler, but our
// planner still tracks all eight because it holds provisional work TMS no longer models
// (docs/TMS_WRITE_BACK.md §3.3).
//
// Lives here, rather than inside the booking import that first needed it, so the import and
// the overlay read (lib/db/tms/overlay.ts) can't drift apart while both exist. The import is
// retired in Stage F of docs/OVERLAY_BUILD_PLAN.md; this map outlives it.
export const TMS_STATUS_NAME_TO_LOCAL_KEY: Record<string, string> = {
  Confirmed: "confirmed",
  "Bank Holiday": "bankholiday",
  "Weekend Confirmed": "weekend",
  "Waiting Final": "likely",
  Bidding: "bidding",
  "Corrective Works": "service",
  "Location to be Confirmed": "tbc",
  "Customer Cancelled": "cancelled",
};

// Used when TMS reports a status we have no mapping for. `tbc` ("Site to be confirmed") is
// deliberately the fallback: it's visibly provisional and NOT publishable, so an unrecognised
// TMS status can never be mistaken for confirmed work or forwarded back to TMS by accident.
export const FALLBACK_STATUS_KEY = "tbc";

/** TMS status id → our status key, via the name. Falls back rather than throwing. */
export function localStatusKeyForTmsStatus(
  tmsStatusId: number,
  statusNameById: Map<number, string>,
): { key: string; mapped: boolean } {
  const name = statusNameById.get(tmsStatusId);
  const key = name ? TMS_STATUS_NAME_TO_LOCAL_KEY[name] : undefined;
  return key ? { key, mapped: true } : { key: FALLBACK_STATUS_KEY, mapped: false };
}
