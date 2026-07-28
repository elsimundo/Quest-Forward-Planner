import { listTmsBookings, type TmsBooking } from "./queries";

// A short-lived, in-process cache of TMS bookings — Stage A3 of docs/OVERLAY_BUILD_PLAN.md.
//
// WHY THIS EXISTS: under the overlay model (docs/TMS_WRITE_BACK.md §1) we no longer copy TMS
// bookings into Postgres; the grid reads them live. Without a cache, every screen load — and
// every ~10s client poll, from every open screen — would hit TMS's production MySQL. This
// caps that at one query per company per TTL, no matter how many people are using the
// planner.
//
// WHY IT'S IN MEMORY AND NOT A TABLE: the client's rule is that our database stores only
// amendments and additions (§1). An earlier design persisted this to survive restarts, but
// that was only needed for a stale-data fallback the client has since rejected (§8) — so the
// cache holds nothing that matters if it's lost, and keeping it out of Postgres means there
// is no table of TMS bookings for anyone to later mistake for the booking import we removed.
// Don't "improve" this by persisting it; that would quietly recreate the rejected import.
//
// FAILURE IS LOUD, NEVER STALE: if TMS can't be reached, this throws. It does not fall back
// to whatever it last held. The client asked for a connection error rather than a silently
// out-of-date grid (§8), so a caller's only options are to show the error or to fail.
//
// PROCESS-LOCAL: this is module state, so each app instance keeps its own copy and a restart
// or deploy starts cold (one extra TMS query). Both are accounted for in §8. It relies on a
// long-lived server process — true for the Docker/Coolify deployment; it would not hold on a
// serverless platform, where this would need rethinking rather than tuning.

const DEFAULT_TTL_MS = 5 * 60 * 1000;

// Overridable mainly so tests can collapse the TTL; 5 minutes is the client's own figure
// ("a reload of the TMS bookings data every 5 minutes", docs/TMS_WRITE_BACK.md §7).
const TTL_MS = parseInt(process.env.TMS_BOOKING_CACHE_TTL_MS ?? String(DEFAULT_TTL_MS), 10);

export type CachedTmsBookings = {
  bookings: TmsBooking[];
  /** When this data was actually read from TMS — drives "last refreshed at HH:MM" in the UI. */
  fetchedAt: Date;
};

type Entry = {
  value: CachedTmsBookings | null;
  /**
   * The in-flight fetch, if one is running. Concurrent callers await this same promise rather
   * than each starting their own query — without it, the moment a TTL expires every request
   * that arrives together would stampede TMS simultaneously, which is the exact load this
   * cache exists to prevent.
   */
  inFlight: Promise<CachedTmsBookings> | null;
};

const cache = new Map<number, Entry>();

function entryFor(tmsCompanyId: number): Entry {
  let e = cache.get(tmsCompanyId);
  if (!e) {
    e = { value: null, inFlight: null };
    cache.set(tmsCompanyId, e);
  }
  return e;
}

function isFresh(value: CachedTmsBookings | null, now: number): value is CachedTmsBookings {
  return value !== null && now - value.fetchedAt.getTime() < TTL_MS;
}

/**
 * TMS bookings for a company, from cache when fresh and from TMS when not.
 *
 * Throws if TMS is unreachable — deliberately, see the note at the top of this file. Keyed on
 * the *TMS* company id (what the query needs), not our local `companies.id`.
 */
export async function getTmsBookings(tmsCompanyId: number): Promise<CachedTmsBookings> {
  const entry = entryFor(tmsCompanyId);

  if (isFresh(entry.value, Date.now())) return entry.value;
  if (entry.inFlight) return entry.inFlight;

  const fetch = (async (): Promise<CachedTmsBookings> => {
    try {
      const bookings = await listTmsBookings(tmsCompanyId);
      const value: CachedTmsBookings = { bookings, fetchedAt: new Date() };
      entry.value = value;
      return value;
    } catch (err) {
      // Drop whatever we were holding. It's already past its TTL (that's why we're here), and
      // keeping it invites a later "just serve the old one" change that would reintroduce the
      // stale-grid behaviour the client rejected.
      entry.value = null;
      throw err;
    } finally {
      entry.inFlight = null;
    }
  })();

  entry.inFlight = fetch;
  return fetch;
}

/**
 * Force the next `getTmsBookings` to re-read TMS. For an explicit "refresh now" control, and
 * for tests. Omit the id to clear every company.
 */
export function invalidateTmsBookingCache(tmsCompanyId?: number): void {
  if (tmsCompanyId === undefined) {
    cache.clear();
    return;
  }
  cache.delete(tmsCompanyId);
}

/**
 * Cache state without triggering a fetch — for diagnostics and admin display only. Null when
 * nothing is held for that company (never fetched, expired-and-failed, or invalidated).
 */
export function peekTmsBookingCache(
  tmsCompanyId: number,
): { fetchedAt: Date; count: number; fresh: boolean } | null {
  const value = cache.get(tmsCompanyId)?.value;
  if (!value) return null;
  return {
    fetchedAt: value.fetchedAt,
    count: value.bookings.length,
    fresh: isFresh(value, Date.now()),
  };
}

/** The configured TTL, so callers and tests don't hardcode a second copy of it. */
export const TMS_BOOKING_CACHE_TTL_MS = TTL_MS;
