# Publishing back to TMS — model, and what we need from Quest

**Status:** Client answered 2026-07-28 (Dave Emerson). The write API is confirmed as
coming, but **after** we build a proof of concept — so the local side is unblocked and the
TMS write path stays deferred. Dave's reply also **changes the storage model** (§1) and
therefore the conflict model (§2). §4 is the new part: what this means for the code that
already exists.

The read side (units, sites) is built and running — see `docs/TMS_INTEGRATION_PLAN.md`.

---

## 1. The model — bookings are an overlay, not a copy

**The planner is a sandbox until you publish.** Schedulers move units, swap sites, and try
"what if this scanner breaks" scenarios without touching TMS. Confirmed by the client.

**We do NOT copy TMS bookings into our database.** *(Client decision, 2026-07-28 — this
reverses the booking-import design.)* Confirmed bookings are read from the TMS read-only
database **directly, at request time**. Our database stores **only amendments and
additions** — the difference between what TMS says and what the scheduler is proposing.

> "I agree that we need to have bookings that are editable on our side where you'll be able
> to move them around, but I would like for only the amendments/additions to be stored in
> our database. Any confirmed bookings will be referenced from the TMS read-only database
> directly." — Dave Emerson

**Moving a TMS booking leaves a ghost.** If a scheduler drags a TMS booking to a different
day or unit:

- the original TMS booking **stays visible in its original slot**, rendered semi-transparent;
- that faded original carries a **link that scrolls the user to the booking's new position**;
- a brand-new booking with no TMS counterpart gets **no ghost and no link**.

This is the visible expression of the overlay: TMS's truth stays on screen, our proposed
change sits alongside it, and the relationship between the two is navigable.

### What stays on our side permanently

Publish/lock state, our `FP-000123` references, user roles, the audit log and undo history,
sites awaiting review, and site capability requirements. **Agreed as fine** by the client.

Also on our side, per §3.3: **the full eight-status catalogue**, including the six TMS has
switched off. TMS's scheduler now only recognises Confirmed and Corrective Works; the
planner keeps the richer set because that's where provisional work is tracked.

---

## 2. Conflict detection, under the overlay model

Removing the import actually **simplifies** this. There is no cached copy of TMS to drift,
so there is no "did both sides change since the last import?" question. A conflict is now a
straightforward collision, computable from live data at any moment:

> **A conflict is: one of our amendments and a live TMS booking occupying the same unit on
> the same day.**

> "If a booking has been created in this new system and a booking then is moved in TMS to
> the same unit on the same day then a conflict should automatically display. When we try
> to publish the bookings to TMS we should re-check to see if there are any conflicts and
> display them. Publishing should be locked until the conflicts are resolved."
> — Dave Emerson

So, two moments:

**Continuously, on read.** Every time the grid loads, we merge live TMS bookings with our
local amendments. Any collision on (unit, date) is flagged in the UI immediately — no
background job or import run required. This replaces the old `⇄` frozen-row mechanism.

**Again at publish, as a pre-flight check.** Re-read the live TMS rows for exactly the
bookings being published and re-check for collisions. **Publishing is locked until
conflicts are resolved** — client's explicit instruction.

One point to confirm back with Dave (see §5): whether "locked" means the *whole publish
batch* is blocked, or only the conflicting bookings, with the clean ones going through. Our
recommendation remains per-booking outcomes — if 28 of 30 are clean, publishing those 28
and reporting the 2 is less disruptive than making a scheduler clear an unrelated conflict
before anything can move.

---

## 3. Answers from Quest (2026-07-28)

### 3.1 Does the write API exist? — **Coming, after our proof of concept**

> "Yes there will be a new API for creating and updating bookings. Once we've got the proof
> of concept functionality created for this new system then we'll work on the API."

**Consequence:** build order is settled. We build the overlay planner and publish flow
against a stub, prove it, and Quest builds the API to match. Nothing writes to TMS until
then, and the read-only rule in `lib/db/mysql-auth.ts` stays as-is.

### 3.2 What can we set on a booking? — **Deferred**

> "We don't need to worry about this yet."

### 3.3 Statuses — **keep all eight locally; add a `publishable` flag**

> "Those statuses have been removed from the TMS scheduler and have been replaced with just
> confirmed and corrective works. But we need to have the booking statuses of the ones that
> have been active equal to zero stored in this new system. Only the confirmed statuses in
> this new system should be publishable to TMS and I wonder if we create a new field for
> publishable statuses???"

**Answered, and it resolves the contradiction flagged in `docs/DECISIONS.md` #18** — the six
statuses weren't stale leftovers, they were deliberately retired from TMS's scheduler. The
planner keeps all eight because it tracks provisional work TMS no longer models.

**On the `publishable` field: yes, and we've most of the way there already.** `docs/DECISIONS.md`
#24 already gates publishing to `confirmed` / `weekend` / `bankholiday`, via a hardcoded
`PUBLISHABLE_STATUS_KEYS` list in `lib/statuses.ts`. Dave's suggestion moves that into the
`booking_statuses` table as a per-status boolean, which is better: it becomes admin-editable
alongside the labels and colours, instead of needing a code change. Small, well-understood
change — see §4.

### 3.4 What does TMS reject? — **One booking per unit per day; errors returned by the API**

> "Double bookings flag in TMS is a flag that warns us to correct it and shouldn't be
> allowed. We need one booking per day. If the planner is rejected by TMS (it shouldn't be
> if we have the correct conflict detection in place) then a response from the API will
> detail the error message."

**Consequence, and it needs care:** "one booking per unit per day" is currently enforced by
a Postgres partial unique index. Under the overlay model that index **cannot see TMS
bookings**, so it can no longer enforce the rule on its own — half the bookings live in
another database. Enforcement has to move into the application, checked against live TMS
plus local amendments at write time. Noted in §5 as the main technical risk.

### 3.5 Retries and duplicates — **Use our `FP-` reference as the idempotency key**

> "Good idea"

Accepted: the write API should take our `booking_ref` so a retried request is recognised as
a repeat rather than creating a second booking.

### 3.6 Downstream triggers (invoicing etc.) — **Deferred**

> "We don't need to worry about this yet. The API will reject it if necessary."

### 3.7 Test environment — **Deferred until the API exists**

> "We don't need to worry about this yet. There's no API for the write yet."

---

## 4. What this changes about the current build

The overlay decision in §1 is the significant one — it retires work that already exists.

**Retired: the TMS booking import.** `lib/db/tms/booking-import.ts`, the
`tms_booking_import_runs` table, `/admin/tms-booking-import`, and `POST /api/tms-booking-import`
all exist to copy TMS bookings into our `bookings` table. The client has explicitly asked us
not to do that. This code should not simply be deleted until the replacement read path works
— but it stops being the design.

**Retired: the three-timestamp conflict machinery.** `bookings.tms_updated_at`,
`tms_imported_at`, and `tms_conflict_at` exist to answer "did both sides change since the
last import?" With no import, that question disappears (§2). `tms_booking_id` stays — it's
how an amendment points at the TMS booking it modifies.

**The 1,368 imported bookings currently in Postgres shouldn't exist under this model.** They
are copies of TMS rows, which is exactly what §1 rules out. They'll need clearing once the
live read path replaces them — the same "is this real or a copy?" ambiguity that caused the
Excel purge (`docs/DECISIONS.md` #27).

**New: a live merge on read.** The grid becomes: read live TMS bookings for the window +
read local amendments + merge, with superseded TMS rows rendered as ghosts. This is a
cross-database join done in application code, and it's on the hot path for every grid render
(~30 units × 92 days, 1,368 bookings today). Needs a caching strategy — see §5.

**New: `booking_statuses.publishable`.** A boolean column replacing the hardcoded
`PUBLISHABLE_STATUS_KEYS`, seeded true for `confirmed` / `weekend` / `bankholiday` to
preserve current behaviour, and editable in the admin UI. Both the server gate and the
client-side "Publish N" count read it, so they can't disagree.

**Unchanged:** units and sites stay mirrored from TMS (the client only objected to
*bookings* being copied), along with everything in §1's "stays on our side" list.

---

## 5. Resolved by the client (2026-07-28, second round)

**Amendments retire on successful publish.** Once TMS accepts a booking, our amendment
stops being an amendment and the booking is read live from TMS like any other. Keeps the row
for audit; stops rendering it from both sources. *("I agree.")*

**TMS supersedes the planner.** If TMS moves a booking we've already amended, our proposed
change is **flagged for review**, not silently kept or silently dropped. TMS is the system of
record; the planner defers to it. *("It should be flagged — TMS supersedes Forward Planner.")*

**Use TMS pads.** No company uses pads today, but the planner should model them so it works
for one that does later. See §6 for how this maps — it's smaller than it sounds.

**The import is replaced.** *("Yeah make the change.")*

### Still to settle: publish, all-or-nothing or partial?

Dave was genuinely torn — a dialogue listing conflicts, but worried partial publishing
causes confusion. **Our recommendation: partial, but never silent, via a pre-flight dialog.**

The confusion he's worried about comes from finding out *afterwards* that only some of a
batch went through. So move the decision in front of the write: on clicking Publish, show
"28 of 30 will publish — 2 are in conflict", list the 2 with reasons, and offer *Publish 28*
or *Cancel and fix*. Nothing is written until the scheduler chooses, so there's no surprise
either way, and one clash on an unrelated unit doesn't block a week's work.

This also fixes an existing wart: `docs/DECISIONS.md` #24 currently **silently skips**
bookings that aren't in a publishable status, reporting only afterwards. Those belong in the
same pre-flight dialog, for the same reason.

---

## 6. Pads — how this maps

TMS's `pads` table is **empty (0 rows)**, and **no booking in the TMS database — any
company — sets `pad_id`**. So there is nothing to sync today; this is purely about not
painting ourselves into a corner.

The two models differ in a way that matters:

| | Our model | TMS |
|---|---|---|
| A pad is… | a `sites` row with `parent_site_id` set | a `pads` row with `location_id` set |
| A booking points at… | `site_id` (which may itself be a pad) | `location_id` **and** optionally `pad_id` |

Structurally these are the same idea — a pad belongs to a location — but TMS carries the
location and pad as *two* fields on a booking, where we carry one.

**Recommendation: don't restructure.** Keep `sites.parent_site_id` (`docs/DECISIONS.md` #25);
it's built and it works. Add a nullable `tms_pad_id` to `sites` for pad rows, and translate
at publish time: a booking on a pad-site publishes as `location_id` = the parent's
`tms_location_id`, `pad_id` = the pad's `tms_pad_id`. One translation in one place, and no
schema churn for a feature nobody uses yet.

---

## 7. New requirement — keeping open screens fresh

Raised by Dave in the second round:

> "If two people are working on the new system and person 1 moves, or creates a booking then
> person 2 would also see the change. Possibly through channel subscriptions? We would also
> need to do a reload of the TMS bookings data every 5 minutes into the view, so that
> continuously open views won't go stale."

**Largely already designed.** `SPEC.md` §11 specifies optimistic-UI updates reconciled
against `updated_at`, with a rejected save snapping back and explaining itself, and **~10s
polling** for live updates — chosen deliberately over push for a small scheduling team.

**These are two different refresh problems and must not share a cadence:**

| What | Source | Cadence | Cost |
|---|---|---|---|
| Another scheduler's amendment | our Postgres | ~10s | cheap, ours |
| TMS booking changes | TMS MySQL | 5 min | expensive, not ours |

The trap: under the overlay model the grid needs both sources, so a naive 10s refresh would
hit TMS's production replica six times a minute per open screen. TMS reads must be cached
server-side and refreshed on their own 5-minute cycle, independent of how often the client
polls for local changes.

**Recommendation: polling first, push later if needed.** Polling satisfies both requirements
with no new infrastructure. If ~10s proves too slow in practice, Server-Sent Events are the
smaller next step (one-way "something changed, refetch" — no WebSocket server to run on
Coolify). Don't build channel subscriptions before we know polling is insufficient.

---

## 8. Still open on our side

1. **Enforcing one-booking-per-unit-per-day across two databases** (§3.4). The Postgres
   partial unique index can't see TMS rows any more, so this moves into application code and
   becomes a check rather than a guarantee. Flagged to Dave; he's confirmed the rule matters.
2. **Availability.** If TMS is unreachable the grid can't render at all under this model,
   where previously it fell back to the last import. The 5-minute server-side cache in §7
   softens this — a cached copy can still render, clearly marked stale. Needs deciding
   explicitly rather than falling out by accident.
