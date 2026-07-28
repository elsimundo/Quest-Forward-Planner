# Overlay model — implementation plan

Turns the design in `docs/TMS_WRITE_BACK.md` into an ordered build. Nothing here is built
yet.

**Guiding constraint: the planner must keep working at every step.** It currently runs off
1,368 TMS bookings copied into `bookings`. Those can't be removed until the live read path
replaces them, so the sequence below is deliberately additive first, destructive last.

**Stage A ships independently** — each item is useful on its own and touches nothing else.
Stages B onward are a chain.

---

## Stage A — additive groundwork

No behaviour change. Safe to ship in any order, individually.

### A1. `booking_statuses.publishable` — ✅ DONE (migration 0012)

Migration adds a boolean, defaulting false, seeded **true** for `confirmed`, `weekend`, and
`bankholiday` — exactly today's behaviour, so nothing changes on deploy.

Replace `PUBLISHABLE_STATUS_KEYS` (`lib/statuses.ts`) with a read of this column. Both
consumers must move together or they'll disagree: the server gate in
`lib/actions/publish.ts:63`, and the client-side eligibility counts in `planner-grid.tsx`
(`publishableSelected` / `eligibleInRange`). Add the toggle to `/admin/booking-statuses`.

*Client asked for this directly (`TMS_WRITE_BACK.md` §3.3). Makes publishability
admin-editable instead of a code change.*

### A2. `sites.tms_pad_id` — ✅ DONE (migration 0013)

Nullable, unique, dormant — TMS's `pads` table is empty and no booking anywhere sets
`pad_id`. Publish-time translation (a pad-site booking becomes `location_id` = parent's
`tms_location_id`, `pad_id` = the pad's `tms_pad_id`) comes in D2.

**Sync support was deliberately not built.** The original note here said "populated by the
sync if pads ever appear" — but writing that now would mean guessing at semantics with zero
data to test against, chiefly *does a TMS pad become a `sites` row, child of its location's
site?* That's a real modelling decision, not a mechanical one, and it changes how `syncSites`
behaves. Better answered when a company actually uses pads. The column is the part worth
having early, because backfilling a column is easy and reshaping a live model is not.

*Keeps `sites.parent_site_id` exactly as built — see `TMS_WRITE_BACK.md` §6.*

### A3. In-memory TMS booking cache — ✅ DONE (`lib/db/tms/booking-cache.ts`)

**No table.** A server-side module holding TMS bookings per company with a 5-minute TTL, plus
the timestamp of the last successful fetch. Nothing TMS-derived is written to Postgres
(`TMS_WRITE_BACK.md` §8) — our database stores only amendments and additions, literally.

Reuses the existing `listTmsBookings` (`lib/db/tms/queries.ts`), already correct on the two
hard parts: it reads dates via `DATE_FORMAT` to dodge the BST off-by-one, and skips multi-day
rows rather than guessing.

On a fetch failure the cache **surfaces the error** rather than serving what it last held —
the client asked for a connection error, not a stale grid. Expose `fetchedAt` so the UI can
show "last refreshed at HH:MM"; that's about the 5-minute cycle, not degraded mode.

Land it early and unread, so Stage B has real data to build against and we can watch its cost
against TMS before anything depends on it.

**Built with a stampede guard.** Concurrent callers arriving after a TTL expiry share one
in-flight fetch rather than each starting their own — without that, the moment the TTL lapses
every request in flight would hit TMS at once, which is the exact load the cache exists to
prevent. Verified: 8 concurrent callers produced a single fetch.

**Measured:** a cold fetch of InHealth's 1,368 bookings takes ~74ms (mostly connection
setup); warm reads are ~0ms. So the per-company cost of the 5-minute refresh is negligible,
and Stage B can rely on it.

`TMS_BOOKING_CACHE_TTL_MS` overrides the TTL — for tests only; see `.env.example`.

**Stage A is complete.** B1/B2 are next and land together.

---

## Stage B — the overlay read path

The core change. Everything here lands together.

### B1. Redefine `bookings` as the amendment layer — ✅ DONE

Semantics, not schema. A row in `bookings` now means *a change we're proposing*, never a
copy of TMS:

- `tms_booking_id` **not null** → amends an existing TMS booking (moved, restatused, renoted)
- `tms_booking_id` **null** → a booking that exists only here

An unmodified TMS booking has **no row at all**.

### B2. Merged read — ✅ DONE (`lib/db/tms/overlay.ts`)

Replace `getBookingsInRange` (`lib/db/queries.ts:122`) with a merge of two sources:

1. cache rows for the window (A3), mapped from TMS ids to local `unit_id` / `site_id`
2. amendment rows for the window

Rules: an amendment supersedes its cache row at the amendment's position; the superseded
cache row still renders **as a ghost at its original position**; cache rows with no
amendment render normally; amendments with no `tms_booking_id` render as new bookings.

`app/(planner)/page.tsx` and `PlannerGrid`'s props change shape — grid rows now carry
`isGhost` and `movedToKey` (the unit+date the ghost's real booking now sits at).

**The `RCT22` warning here was a misdiagnosis — resolved.** It said RCT22 has no
`tms_unit_id` yet carries live TMS bookings, so the mapping had to tolerate an unlinked unit.
Checking the data showed otherwise: RCT22 holds three *amendments*, bookings a scheduler
moved off CT23 (TMS unit 1344, which is linked). Amendments live in Postgres and are keyed by
local `unit_id`, so they need no TMS mapping at all. Verified across the live dataset: all
1,368 TMS bookings map to a local unit, site, and modality tag — **zero dropped**. The
`unplaced` counter on `OverlayResult` reports any that ever fail, rather than silently
showing less than TMS has.

### B3. Migrate the existing 1,368 rows — ✅ DONE (see `DECISIONS.md` #28)

**Done, but not by the rule written here.** The timestamp heuristic below selected 11 rows to
keep; comparing actual content against live TMS showed only **3** genuinely differ. The other
8 had been touched but were identical to TMS, making them duplicates rather than amendments.
1,365 were hard-deleted, `booking_events` was left intact, and the grid rendered identically
afterwards — 1,371 rows either side, from 1,368 local rows before and 3 after. Full reasoning
in `docs/DECISIONS.md` #28.

*Original plan, superseded:* keep any row whose `updated_at` is later than `tms_imported_at`
(11 rows), delete the other 1,357. Content comparison is the better test — it asks whether a
row actually says anything TMS doesn't, rather than whether someone once opened it.

### B4. Live conflict detection

Two kinds, both computed on read, no background job:

1. **Collision** — an amendment and a *different* TMS booking on the same unit and date.
2. **Superseded** — TMS has changed a booking we've amended (compare cache `tms_updated_at`
   against the value the amendment was made from). **TMS wins**; the amendment is flagged for
   review, never silently kept or dropped (`TMS_WRITE_BACK.md` §5).

Replaces the frozen-row `⇄` mechanism, which depended on the import.

---

## Stage C — interaction

### C1. Ghosts

Render superseded TMS bookings semi-transparent at their original slot, with a link that
scrolls to the booking's new position. New bookings with no TMS origin get neither. Grid is
virtualised (`useVirtualizer`), so "scroll to" means scrolling the virtualiser to that row,
not `scrollIntoView` on a node that may not be mounted.

### C2. Writes create amendments

`lib/actions/bookings.ts`, `booking-moves.ts`, `undo.ts` write amendments rather than editing
copies. Moving a TMS booking creates an amendment carrying its `tms_booking_id` at the new
position — the original position needs no storage, since TMS still holds it.

**One booking per unit per day moves into application code.** The Postgres partial unique
index can't see TMS rows any more (`TMS_WRITE_BACK.md` §9). Check against cache + amendments
inside the write transaction. This is a check, not a guarantee, and it is racy — see Risks.

`booking-moves.ts`'s two-pass sentinel trick still applies to amendment-vs-amendment
collisions; it does nothing about amendment-vs-TMS ones.

### C3. Supersede flagging in the UI

Surface B4's second case: a badge plus a way to accept TMS's version (discard the amendment)
or re-apply the change from TMS's new position.

---

## Stage D — publish

### D1. Pre-flight dialog

Before writing anything, gather: conflicts (B4), non-publishable statuses (A1), already
published, and stale cache (E1). Show *"28 of 30 will publish — 2 are in conflict"*, list the
exceptions with reasons, offer **Publish 28** or **Cancel and fix**.

Folds in today's silent skipping of non-confirmed bookings (`DECISIONS.md` #24), which
currently only surfaces afterwards.

### D2. Write path — stubbed

Quest builds the API *after* our proof of concept (`TMS_WRITE_BACK.md` §3.1), so this is an
interface with a fake implementation. Shape it now for what's agreed: `booking_ref` as the
idempotency key (§3.5), per-booking success/failure, error text passed through (§3.4), and
pad translation (A2).

**On success the amendment retires** — kept for audit, no longer rendered as an amendment,
booking thereafter read from TMS (§5). Getting this wrong renders the booking twice.

---

## Stage E — freshness and failure handling

### E1. Connection failure and refresh age

If TMS is unreachable, the planner **shows a connection error** — no fallback to the last
loaded data (`TMS_WRITE_BACK.md` §8, client-revised). Publishing needs no special handling in
this state: the page won't render, and the pre-flight needs live TMS anyway.

Separately, surface `fetchedAt` as "last refreshed at HH:MM" so the 5-minute cycle is visible.

### E2. Two clocks

Local amendments poll ~10s (our Postgres, cheap — already `SPEC.md` §11's design). TMS cache
refreshes every 5 min server-side, independent of client polling. Keeping these separate is
the point: a naive shared 10s refresh would hit TMS six times a minute per open screen.

---

## Stage F — retirement

Only once B–E are proven.

- Delete `lib/db/tms/booking-import.ts`, `lib/actions/admin/tms-booking-import.ts`,
  `components/admin/tms-booking-import-panel.tsx`, `app/api/tms-booking-import/`, and the
  admin page.
- Drop `tms_booking_import_runs`.
- Drop `bookings.tms_updated_at`, `tms_imported_at`, `tms_conflict_at` — all exist to answer
  "did both sides change since the last import?", which no longer has meaning. **Keep
  `tms_booking_id`**; it's what makes a row an amendment.
- `bookings.source` becomes redundant (`tms_booking_id` null/not-null carries it).

---

## Risks

1. **One-per-unit-per-day is no longer enforceable by the database** (C2). Two schedulers can
   race between the check and the write. Options, cheapest first: accept it and reconcile at
   publish (the pre-flight catches it before TMS sees it); a short advisory lock per
   unit+date on write; or an application-level reservation. Recommend the first, given team
   size — but it should be a decision, not an accident.
2. **B3 deletes 1,357 rows.** Verify the edited-row count immediately beforehand, and back up
   first — same discipline as `DECISIONS.md` #27.
3. **A TMS outage takes the planner fully offline**, by client decision — schedulers can't
   even review their own pending amendments, since the grid needs TMS's bookings underneath
   to render. Accepted (`TMS_WRITE_BACK.md` §8), but the one to revisit first if it bites.
4. **TMS read cost is unmeasured.** A3 runs early partly so we can watch it before Stage B
   depends on it.

## Open, not blocking

- Whether the merged read needs a date-range filter on the TMS side. `listTmsBookings` fetches
  a whole company (1,368 rows today) — fine now, worth revisiting as history grows.
- Whether ghosts persist after publish, or vanish with the retired amendment. Recommend they
  vanish: TMS then holds the booking at its new position, so there's nothing left to ghost.
