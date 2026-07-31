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

1. **Collision — ✅ DONE.** An amendment and a *different* TMS booking on the same unit and
   date. `OverlayBooking.tmsCollision` (`lib/db/tms/overlay.ts`), a `⨯` badge in the shared
   `⇄`/`↻` corner, a drawer banner, and a `tms-collision` publish exclusion re-derived fresh
   at commit time (`lib/actions/publish.ts`) — same pattern as C3/D1's `tmsSupersedes`. Full
   writeup in `docs/DECISIONS.md` #36, including the bug this closed: without it, two real
   rows could land in one slot and the client-side merge silently kept only one, with nothing
   on screen to say so.

   **Built reactively, not proactively.** This surfaces the next time anyone opens or
   refreshes the grid for that date — bounded by the 5-minute TMS cache TTL plus however long
   until someone looks. It does not push an alert the moment the colliding row appears in TMS.
   That's a separate, larger feature, planned but not built: `docs/COLLISION_ALERTS_PLAN.md`.
2. **Superseded — ✅ DONE (Stage C3 above).** TMS has changed a booking we've amended (compare
   cache `tms_updated_at` against the value the amendment was made from). **TMS wins**; the
   amendment is flagged for review, never silently kept or dropped (`TMS_WRITE_BACK.md` §5).

Replaces the frozen-row `⇄` mechanism, which depended on the import.

---

## Stage C — interaction

### C1. Ghosts — ✅ DONE (interaction revised — see `docs/CELL_STATES.md`)

Superseded TMS bookings render semi-transparent, dashed and italic at their original slot,
with a `↷` affordance. Clicking jumps to where the booking now sits. New bookings with no TMS
origin get neither.

Three things the naive implementation gets wrong, all handled:

- **Rows are virtualised**, so `scrollIntoView` on a DOM node is useless — the destination row
  may not be mounted. Uses `virtualizer.scrollToIndex` instead.
- **Columns scroll horizontally behind a sticky date column**, so centring means centring in
  the space to the *right* of `DATE_COL_WIDTH`, not in the viewport.
- **A search filter can be hiding the destination column.** Jumping to a column that isn't
  rendered silently does nothing, which reads as a broken link — so the search is cleared
  first, and the scroll deferred a frame so the column exists before it's measured.

The destination cell flashes amber for 2s on arrival, so the eye lands on the booking rather
than on "some row that scrolled past". The ghost is a `<button>` because it is a link — it
still never drags, selects, opens the drawer, or counts toward publishing.

### C2. Writes create amendments — 🟡 PARTLY DONE (drawer only)

**Done:** `saveBooking` and `clearBooking` (`lib/actions/bookings.ts`).

Editing a cell showing an untouched TMS booking now creates an amendment carrying its
`tms_booking_id`, rather than a free-standing local row — which would have left the TMS
original unclaimed and rendered *both* in the same cell. Clearing one records a
**suppression**: an amendment created already soft-deleted, meaning "we propose removing
this". The merge reads suppressions and stops rendering the TMS original, leaving a
struck-through `cleared` ghost so the disagreement with TMS stays visible rather than the
booking silently vanishing.

`resolveTmsBookingAt` (`lib/db/tms/overlay.ts`) is what lets a write path tell "empty cell"
from "cell showing a TMS booking we hold no row for". It reads through the same 5-minute
cache, so it costs nothing on the hot path.

Because `bookings.tms_booking_id` is UNIQUE, a TMS booking has at most one amendment row
ever, live or suppressed. Re-booking a cleared slot therefore has to **revive** that row
rather than insert a second one, which would violate the constraint — handled in
`saveBooking`.

**Resolved (was an open question for the client).** A cleared TMS booking originally rendered
as a struck-through ghost chip. It now renders as an **available cell with a small `⌫` mark**
— free, bookable, still visibly at odds with TMS. The old rendering broke the rule that a
cell's appearance must match what you can do with it: a chip-shaped thing reads as "occupied"
when scanning for free units (while the availability bar counted the same cell free, so the
grid contradicted itself), and it blocked the click that would book a slot the database would
have accepted. Full reasoning in `docs/CELL_STATES.md`. No longer needs putting to Dave; the
move ghost he did ask for is unchanged.

**Still to do:** the move path below, and the uniqueness check.

### C2 (remainder). Moves — ✅ DONE

Before moving, materialise any TMS bookings sitting at source or target slots: `materialiseTmsSlots`
creates a local amendment for each one, identical to what TMS says. After that every source and
target is an ordinary row and the existing swap/overwrite/sentinel logic works unchanged.

This also restores the one-booking-per-unit-per-day guarantee for moves. Once a TMS-occupied
target exists as a row, the Postgres partial index sees it. The index can't span two databases,
but by this point it doesn't have to.

**Rejections roll back materialised rows.** A normal `return` from a transaction commits it; so
rejections must throw (`MoveRejected`) instead. Verified: materialised rows are invisible after
a rejected move.

The existing sentinel (rigid offset + swap/overwrite) continues to handle amendment-vs-amendment
collisions. TMS collisions are visible to clash detection because both sides are now rows.

### C3. Supersede flagging in the UI — ✅ DONE

`OverlayBooking.tmsSupersedes` (lib/db/tms/overlay.ts) — true when TMS's `updated_at` for a
booking has moved past the value recorded on the amendment (`bookings.tms_updated_at`),
computed for every live amendment on every read, not just ghosts. A `↻` badge (purple,
distinct from the retiring import's `⇄`) appears on the cell; opening the drawer shows a
banner with two actions, resolved by `lib/actions/tms-resolve.ts`:

- **Keep my version** — the scheduler's edit stands. Only the watermark (`tms_updated_at`)
  advances, silencing the flag until TMS changes again. Content untouched.
- **Use TMS's version** — the amendment's site/status/notes/position are overwritten with
  TMS's current values. If TMS moved the booking to a slot another local row now occupies,
  this is rejected with a CONFLICT rather than silently overwriting that row.

Both are audited `update` events with proper before/after snapshots, gated by the same
optimistic lock (`expectedUpdatedAt`) as every other write, and company-scoped.

**A bug this stage caught, in code that had already shipped and been marked done:** an
earlier automated edit to B2 had silently deleted the line that pushes non-ghost amendments
into the merge's output — every real (non-ghost) booking would have vanished from the grid,
while ghosts and untouched TMS bookings kept rendering fine, which is exactly the kind of
failure that looks like nothing's wrong until you check the count. `real: 1368` collapsing to
near-zero is what verification is FOR; caught before it reached the grid, not after.

Verified against live TMS with the real inline transaction logic (requireRole needs a Next
request scope a script doesn't have, so the DB operations were run directly, unchanged from
the action): induced a genuinely stale amendment, confirmed the flag set, confirmed "keep"
preserves content and clears the flag, confirmed "accept-tms" reverts content to TMS's and
clears the flag, confirmed cleanup restores baseline. Typecheck, lint, build clean.

---

## Stage D — publish

### D1. Pre-flight dialog — ✅ DONE

`lib/publish-eligibility.ts` — one `classifyForPublish()` shared by the client preview and
the server gate, same guarantee A1 established for `publishable`: what the dialog promises
is what the server actually does. Four exclusion reasons, checked in this order (so a
booking excluded for more than one reason gets the right explanation, not just the first
one alphabetically): `already-published` (routine, never shown as an exception — re-sweeping
a range that includes locked bookings is expected), `tms-conflict` (the retiring import's
flag), `tms-supersedes` (Stage C3 — checked ahead of status, since a Confirmed booking TMS
has since changed is a supersede problem, not a status problem), `not-publishable-status`.

Both entry points go through it: **Publish range** always previews before confirming
(`PublishRangeDialog` — updated to render the breakdown instead of a bare count);
**Publish selected** publishes immediately when every selected booking is eligible (nothing
to explain), and only opens a dialog (`PublishSelectedDialog`, new) when the selection
contains an exception — preserving the fast path for the common case while closing the
silent-skip gap for the surprising one.

**A real gap this closed, not just a UI improvement:** the server gate checked
`tmsConflictAt` (the retiring import's flag) and status, but never `tmsSupersedes` — a
`confirmed` booking TMS had changed since the amendment was made could have been published
without anyone resolving the disagreement, forwarding whichever side happened to win the
race. `publishBookings` now re-derives `tmsSupersedes` fresh from live TMS at commit time
(not trusting a client-sent flag), grouped by company so each company's TMS cache is read at
most once per call.

**Verified against live TMS, not just typechecked:** built a `confirmed`-status booking with
a deliberately stale `tms_updated_at`, attempted to publish it through the real gate logic,
confirmed it was blocked (`skippedByReason: { "tms-supersedes": 1 }`, `publishedAt` stayed
null). Before this change that booking would have published silently. Typecheck, lint, build
clean; dev server needed a restart after the edit (stale Turbopack compile, same as earlier
in this build — not a code defect, confirmed by diffing the file on disk against what the
error referenced).

### D2. Write path — stubbed

Quest builds the API *after* our proof of concept (`TMS_WRITE_BACK.md` §3.1), so this is an
interface with a fake implementation. Shape it now for what's agreed: `booking_ref` as the
idempotency key (§3.5), per-booking success/failure, error text passed through (§3.4), and
pad translation (A2).

**On success the amendment retires** — kept for audit, no longer rendered as an amendment,
booking thereafter read from TMS (§5). Getting this wrong renders the booking twice.

---

## Stage E — freshness and failure handling

### E1. Connection failure and refresh age — ✅ DONE

`TmsUnavailableError` (`lib/db/tms/booking-cache.ts`) wraps any TMS fetch failure, and
`app/(planner)/page.tsx` catches **only that type**, rendering
`components/planner/tms-unavailable.tsx`. Everything else propagates to a new
`app/(planner)/error.tsx`.

**That narrow catch is the load-bearing part.** Catching every error would turn a bug in our
own merge into a "TMS is down" screen — sending people to check the wrong system while the
real defect stays hidden. The two screens also say deliberately different things: the outage
screen states plainly that unpublished work is safe in our database and will be waiting
(the natural fear on seeing it is that the afternoon's planning went with the connection);
the error screen does *not* blame TMS or say "try again shortly", and surfaces Next's `digest`
so a screenshot is traceable to a real stack in the server logs.

Freshness shows in the toolbar as `TMS 14:32 · 3m ago` (`tms-freshness.tsx`), formatted
**after mount, never during render** — `fetchedAt` is a server value and the server runs UTC
while the schedulers are on UK time, so formatting it during render would both trip a
hydration mismatch and briefly display an hour-wrong clock.

Publishing needs no special handling in this state, as predicted: the grid never renders, so
no publish control exists to reach.

### E2. Two clocks — ✅ DONE (already correct; now verified)

No code change needed — the ~10s poll (`planner-grid.tsx`) and the 5-minute server-side cache
TTL (A3) were already independent by construction. What was missing was proof.

**Measured:** 30 consecutive grid renders — five minutes of 10s polling — produced exactly
**1** TMS fetch. A naive shared refresh would have made 30 round-trips to TMS's production
database per open screen.



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
