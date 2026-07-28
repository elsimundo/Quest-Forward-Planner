# Publishing back to TMS — model, and what we need from Quest

**Status:** design agreed on our side (2026-07-28); blocked on Quest for the API itself.

This covers the second half of the TMS integration: getting confirmed planner bookings
*into* TMS. The read side (units, sites, bookings coming out of TMS) is already built and
running — see `docs/TMS_INTEGRATION_PLAN.md`. Nothing here changes that.

---

## 1. The model we've settled on

**The planner is a sandbox until you publish.** Schedulers move units, swap sites, try
"what if this scanner breaks" scenarios — none of it touches TMS. That's deliberate: a
lot of what sits in the planner is *provisional* (bidding for a contract, waiting on final
confirmation, location TBC), and putting that into the live schedule would mean dispatch
and billing were reading work that isn't won yet.

**Publish is the one and only crossing point.** When a scheduler publishes, that booking
is checked against TMS and written across. Everything else stays on our side.

**Conflicts surface as warnings at publish time**, not silently. If TMS has changed
underneath a booking since we last looked, the scheduler is told before anything is
written, and decides what to do.

This is why the planner keeps its own copy of bookings rather than reading TMS live. It
isn't a duplicate database for its own sake — it's the workspace where unconfirmed
planning happens, plus a record of what TMS looked like last time we checked, which is
what makes conflict detection possible at all.

### What stays on our side permanently

These have no equivalent in TMS and aren't intended to get one: publish/lock state, our
own `FP-000123` booking references, user roles, the audit log and undo history, sites
awaiting review, and site capability requirements. Agreed as fine.

---

## 2. How conflict detection should work

Two checks, at different moments, using the same underlying signal.

We already store, per booking: TMS's own `updated_at` as of our last import
(`tms_updated_at`), when we last imported it (`tms_imported_at`), and when we last changed
it locally (`updated_at`). Comparing those tells us whether TMS changed, we changed, or
both changed.

**Check 1 — continuously, on every import run.** Already built. If both sides changed
since the last import, the booking is frozen and badged "⇄" on the grid, and no automatic
import overwrites it until a human looks. This keeps the sandbox honest day to day.

**Check 2 — at the moment of publish. This is the new part.** Immediately before writing,
re-read the current TMS rows for exactly the bookings being published and compare them
against the baseline we hold. Anything that changed in TMS since we last imported gets
reported to the scheduler — per booking, with what changed — and is held back rather than
written.

**Why both, rather than just the publish check:** the publish check is the authoritative
gate, because it runs at the instant of writing and closes the gap between "last import"
and "scheduler clicked publish" — a window that could be hours. But the import check is
what stops a scheduler spending a morning planning around a booking TMS already moved.
One catches problems early, the other catches them definitively.

The foundation is already in place: `publishBookings` currently refuses to publish any
booking carrying an unresolved conflict flag. The publish-time re-read is an addition to
that, not a replacement.

**Recommended failure behaviour:** publish should report per-booking outcomes, not
all-or-nothing. If 28 of 30 bookings publish and 2 conflict, the scheduler should see
exactly which 2 and why, with the other 28 committed — not the whole batch rejected.

---

## 3. What we need from Quest

We cannot build any of section 2's write path until these are answered. Roughly in order
of how much they block us.

### 3.1 Does the API exist, and when?

Today our connection to TMS is **read-only**, deliberately and enforced in code — we have
never written a single row to TMS and won't until this is agreed. Is there an existing
API for creating and updating bookings? If not, is one planned, and on what timeline?
Everything below assumes one is coming.

### 3.2 What can we set on a booking?

A TMS booking row carries: `unit_id`, `location_id`, `first_day` / `last_day`, `status`,
`notes`, `pad_id`, `company_id`, plus billing-related fields. Which of these are we
allowed to set, and which does TMS own? Specifically — can we set `notes`, and should we
ever set `pad_id`?

### 3.3 Statuses — should the deactivated ones come back?

This one needs a second look, because what we were told doesn't match what's in TMS.

We were told TMS's own `booking_statuses` table was obsolete and that the planner should
own its statuses separately. But TMS's table for InHealth already contains **exactly the
eight statuses the planner uses** — Confirmed, Bank Holiday, Weekend Confirmed, Waiting
Final, Bidding, Corrective Works, Location to be Confirmed, Customer Cancelled — with
matching colours and descriptions. Six of the eight are simply switched off (`active = 0`),
and live bookings only ever use the two that remain on: Confirmed (1,274 of 1,368) and
Corrective Works (94).

So: were those six deactivated deliberately, and should they stay off? Two options:

- **Reactivate them**, and a published booking keeps its real status. Cleanest — the
  planner and TMS agree on vocabulary, and statuses round-trip properly.
- **Leave them off**, in which case tell us what a published `Bidding` or `Waiting Final`
  booking should become in TMS. (Our strong preference is that speculative statuses are
  simply never publishable — see 3.6.)

### 3.4 What does TMS reject, and what comes back?

What makes TMS refuse a booking? In particular, does TMS enforce one booking per unit per
day, the way the planner does? (We noticed a `has_double_bookings` flag, which suggests
sometimes it doesn't.) When a write is rejected, what do we get back — enough to show the
scheduler a useful message, or just a failure?

### 3.5 Retries and duplicates

If we send a booking and the connection drops before we hear back, we don't know whether
it landed. If we retry, do we get two bookings? Can we supply our own reference (we
already generate `FP-000123` for every booking) so TMS can recognise a repeat and ignore
it? Without this, network glitches quietly become double-bookings.

### 3.6 Does writing a booking trigger anything downstream?

This is the one we're most cautious about. Does creating or updating a booking in TMS set
off invoicing, customer notifications, driver assignment, or anything else? If publishing a
booking can generate an invoice, then publishing anything provisional is genuinely
dangerous, and we'd want to restrict publishing to confirmed statuses only.

### 3.7 Can we build against a test environment?

We'll need somewhere that isn't live to develop and test writes. Is there a TMS staging
environment we can point at? We should not be testing a write path against production
scheduling data.

---

## 4. Still open on our side

- **Read freshness.** If schedulers are to trust that the planner reflects TMS, the import
  needs to run on a schedule rather than only when someone clicks it, and the UI should
  show how recently it ran. Not yet decided — how often is often enough?
- **Availability.** If TMS is unreachable, planning should still work and publishing should
  fail clearly rather than silently. Falls out of the design above, but worth stating.
- **Pads.** TMS has a `pads` table and a `pad_id` on bookings, though InHealth uses it on
  none of its 1,368 bookings. Our own pad grouping is currently local-only, on the
  assumption TMS had no such concept. Worth checking with Quest whether these are meant to
  be the same thing before the two diverge.
