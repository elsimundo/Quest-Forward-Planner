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

### A1. `booking_statuses.publishable`

Migration adds a boolean, defaulting false, seeded **true** for `confirmed`, `weekend`, and
`bankholiday` — exactly today's behaviour, so nothing changes on deploy.

Replace `PUBLISHABLE_STATUS_KEYS` (`lib/statuses.ts`) with a read of this column. Both
consumers must move together or they'll disagree: the server gate in
`lib/actions/publish.ts:63`, and the client-side eligibility counts in `planner-grid.tsx`
(`publishableSelected` / `eligibleInRange`). Add the toggle to `/admin/booking-statuses`.

*Client asked for this directly (`TMS_WRITE_BACK.md` §3.3). Makes publishability
admin-editable instead of a code change.*

### A2. `sites.tms_pad_id`

Nullable column, dormant for now — TMS's `pads` table is empty and no booking anywhere sets
`pad_id`. Populated by the sync if pads ever appear. Publish-time translation (a pad-site
booking becomes `location_id` = parent's `tms_location_id`, `pad_id` = the pad's
`tms_pad_id`) comes in D2.

*Keeps `sites.parent_site_id` exactly as built — see `TMS_WRITE_BACK.md` §6.*

### A3. `tms_booking_cache` + refresh job

New table, columns roughly: `tms_booking_id` (unique), `tms_company_id`, `tms_unit_id`,
`tms_location_id`, `date`, `tms_status_id`, `notes`, `tms_updated_at`, `fetched_at`.

Refresh reuses the existing `listTmsBookings` (`lib/db/tms/queries.ts`) — already correct on
the two hard parts: it reads dates via `DATE_FORMAT` to dodge the BST off-by-one, and skips
multi-day rows rather than guessing. **Replace wholesale, never upsert** (rule 4,
`TMS_WRITE_BACK.md` §8).

Nothing reads this yet. Getting it landed and running early means Stage B has real data to
build against, and we can watch its cost against TMS for a while before depending on it.

---

## Stage B — the overlay read path

The core change. Everything here lands together.

### B1. Redefine `bookings` as the amendment layer

Semantics, not schema. A row in `bookings` now means *a change we're proposing*, never a
copy of TMS:

- `tms_booking_id` **not null** → amends an existing TMS booking (moved, restatused, renoted)
- `tms_booking_id` **null** → a booking that exists only here

An unmodified TMS booking has **no row at all**.

### B2. Merged read

Replace `getBookingsInRange` (`lib/db/queries.ts:122`) with a merge of two sources:

1. cache rows for the window (A3), mapped from TMS ids to local `unit_id` / `site_id`
2. amendment rows for the window

Rules: an amendment supersedes its cache row at the amendment's position; the superseded
cache row still renders **as a ghost at its original position**; cache rows with no
amendment render normally; amendments with no `tms_booking_id` render as new bookings.

`app/(planner)/page.tsx` and `PlannerGrid`'s props change shape — grid rows now carry
`isGhost` and `movedToKey` (the unit+date the ghost's real booking now sits at).

**Watch:** mapping TMS ids → local ids needs `units.tms_unit_id` and `sites.tms_location_id`.
`RCT22` has **no** `tms_unit_id` yet carries live bookings (`DECISIONS.md` #24, #27), so the
mapping must handle an unmapped unit without dropping its bookings off the grid.

### B3. Migrate the existing 1,368 rows — convert, don't delete

**This step destroys data if done carelessly.** As of 2026-07-28, **11 of 1,368 carry local
edits** (`updated_at` later than `tms_imported_at`); the other 1,357 are untouched copies.

- **1,357 untouched** → delete. They're copies, exactly what §1 rules out.
- **11 edited** → keep, as amendments. They already have `tms_booking_id` set, so under B1's
  rule they *are* amendments — no conversion needed beyond leaving them alone.

Re-run the count immediately before migrating rather than trusting this number; it moves
every time someone edits an imported booking. Anything published or conflict-flagged needs
resolving by hand first (both were zero at time of writing).

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

## Stage E — freshness and degraded mode

### E1. Staleness and degraded mode

`fetched_at` drives a visible age indicator. If TMS is unreachable, show the last cache
clearly marked out of date, **with publishing disabled** — the pre-flight check needs live
TMS, so publishing while stale means writing blind (§8).

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
3. **The cache can quietly become the rejected import** if §8's five rules erode. Worth a
   comment on the table itself pointing at that section.
4. **TMS read cost is unmeasured.** A3 runs early partly so we can watch it before Stage B
   depends on it.

## Open, not blocking

- Whether the merged read needs a date-range filter on the TMS side. `listTmsBookings` fetches
  a whole company (1,368 rows today) — fine now, worth revisiting as history grows.
- Whether ghosts persist after publish, or vanish with the retired amendment. Recommend they
  vanish: TMS then holds the booking at its new position, so there's nothing left to ghost.
