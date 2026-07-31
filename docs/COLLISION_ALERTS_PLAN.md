# Proactive collision alerts — plan

**Not built. Planning only**, written after Stage B4 (`docs/OVERLAY_BUILD_PLAN.md`,
`docs/DECISIONS.md` #36) shipped the *reactive* half of this problem: a `⨯` badge that
appears once someone opens or refreshes the grid. This is the other half the client asked
about separately — a *push*, not a flag someone has to go looking for.

Client precedent: "Email + red-box alert on a schedule conflict" is in the feedback backlog
(`docs/TMS_INTEGRATION_PLAN.md` §12). The red-box half is done (B4). Email was explicitly
**deferred by the client's own instruction** ("we can wire up brevo later") — Brevo is the
chosen provider (per prior session notes) but isn't integrated into the app at all yet. This
document plans the piece that request actually needs — detecting a NEW collision the moment
it appears, not just flagging one that's already sitting there — so it's ready to build
whenever Brevo lands, rather than starting design from zero at that point.

---

## Why B4 alone isn't "proactive," concretely

Detection is computed on read (deliberately — no background job, `docs/OVERLAY_BUILD_PLAN.md`
B4). That means a collision is only found when:

1. Someone has the grid open on that date range, or refreshes it, **and**
2. The 5-minute TMS booking cache (`lib/db/tms/booking-cache.ts`, Stage A3) has actually
   re-read TMS since the colliding row appeared.

Worst case, that's up to 5 minutes of cache staleness *plus* however long until someone
happens to look at that unit and date — which could be hours, if nobody's actively scheduling
that part of the grid. For the reported case (a booking silently not rendering, discovered by
accident) that gap is the whole problem: the client wants to hear about it, not find it.

**The fix is not "lower the 5-minute TTL."** That TTL is deliberately the client's own figure
(`docs/TMS_WRITE_BACK.md` §7) and is shared by every grid viewer — Stage A3 built it
specifically to cap TMS read load *regardless of how many people have a screen open*, and
measured that cost to justify the number (~74ms cold, ~0ms warm, 1 fetch per 5 minutes per
company no matter how many pollers). Lowering it to get faster alerts would raise TMS load for
every viewer to buy something only a background scanner needs. The two have to be decoupled:
the grid's display cache stays as-is; alerting gets its own, independent read cadence.

---

## Shape of the fix

A scheduled job, external to any user's browser session, that:

1. Reads live TMS bookings per scheduling-enabled company (same
   `listTmsBookings`/`getTmsBookings` used today) on **its own cadence**, not gated by whether
   anyone has the grid open.
2. Runs the same collision computation Stage B4 already has in `lib/db/tms/overlay.ts`
   (`amendmentBySlot` vs. TMS bookings) across ALL live amendments for that company, not just
   whatever date range a grid happened to be scrolled to.
3. Diffs against what it found last run. A collision that already existed and was already
   flagged doesn't need to notify again.
4. Sends whatever's newly collided down the configured channel(s).

This is the same operational pattern the reference sync already uses (`docs/
TMS_INTEGRATION_PLAN.md` §6A, §9 step 3): an external pinger (Coolify scheduled task, k8s
CronJob) hitting an authenticated endpoint on a timer, same as `POST /api/tms-sync` today.
Nothing here needs an in-process scheduler.

### Read cadence

Independent of the 5-minute grid cache. Options, cheapest first:

- **Reuse `getTmsBookings`, just call it more often.** Simplest — the scan job calls the same
  cached function the grid does. But if the scan's own cadence is shorter than 5 minutes, most
  calls just return the same cached snapshot, buying nothing.
- **Scan job forces a fresh read** (`invalidateTmsBookingCache` before reading, or a small
  second TTL specific to the scanner) **on its own schedule**, e.g. every 1–2 minutes. Stage
  A3 already measured the actual cost of a fresh read (~74ms per company) — cheap enough that
  a dedicated tighter cadence for scanning alone is affordable without touching what grid
  viewers experience. **Recommended** — it's what actually answers "the 5-minute window is
  too long," without raising cost for everyone who isn't asking for faster alerts.

Exact interval is a product decision, not an engineering constraint — 1–2 minutes is a
starting point, cheap to tune once real usage is observed (same "measure before committing"
discipline Stage A3 used for the 5-minute TTL itself).

### Idempotency — don't re-notify every scan

A collision that's already been flagged shouldn't re-fire on every run until it's resolved.
Needs a small piece of state per (amendment, colliding TMS booking) pair recording "already
notified" — e.g. `bookings.tms_collision_notified_at`, set on first detection, cleared when
the collision clears (the amendment moves, is cleared, or the TMS row goes away). Mirrors how
`tms_updated_at` already works as a watermark for supersede detection (Stage C3).

### Who gets notified

**Open question — not decided, flagging rather than assuming** (per `CLAUDE.md`'s own rule
about `SPEC.md` open questions). Candidates:

- The amendment's `created_by` / `updated_by` — the scheduler who made the local booking.
- Every `scheduler`/`admin` for that company — safest if ownership isn't reliably "whoever
  should act on this."

The client's original ask ("email... on a schedule conflict") didn't specify a recipient list.
Needs a client answer before building the delivery side, same as the still-open TMS
write-back questions in `docs/TMS_QUESTIONS.md`.

### Delivery channel

- **In-app:** already covered — the `⨯` badge (B4) is live the moment anyone loads the grid
  after a scan has run, no extra work needed here.
- **Email (Brevo):** deferred by the client. Once unblocked, this job is the natural trigger
  — same "what's new since last run" diff feeds both the in-app state and an email, from one
  computation, rather than two.

### Rate limiting

A single TMS reference-sync run or a bulk external change could produce many collisions at
once. Batch them into one message per recipient per run rather than one email per collision —
otherwise a bad sync run becomes a mail flood. Not needed for B4's in-app badge, which has no
such failure mode (it's just cell state).

---

## Staged build (once scheduled — not now)

1. **Move the collision computation into a shared function** callable both from
   `getOverlayBookings` (per-request, scoped to a date window) and a new scan job (per-company,
   full amendment set, no window). Currently the logic lives inline in `overlay.ts`; extracting
   it avoids the scan job re-deriving its own copy that could drift from what the grid shows.
2. **Add the notified-watermark column** and the diff-against-last-run logic.
3. **Scan endpoint** (`POST /api/collision-scan`, secret-gated like `/api/tms-sync`), wired to
   an external scheduler at whatever cadence is agreed.
4. **Recipient decision from the client**, then Brevo wiring — blocked on both the client
   answer above and the client's own "later" on Brevo integration generally.

Steps 1–3 don't need Brevo and could ship as "faster in-app detection" alone, if the client
wants that before committing to email. Step 4 is genuinely blocked on the client.

## Risks

1. **TMS read cost at a tighter cadence, per company, is unmeasured** — same caveat Stage A3
   flagged for the 5-minute display cache, now for a second, faster consumer. Measure before
   committing to an interval, not after.
2. **A scan finding a LOT of new collisions at once** (e.g. after a bulk TMS-side change) needs
   the batching in "Rate limiting" above, or it's a mail flood on day one.
3. **No TMS webhook exists.** Everything here is polling, because TMS is a read-only MySQL
   database with no push mechanism (`docs/TMS_INTEGRATION_PLAN.md` §6). If Quest ever exposes
   one, this whole plan simplifies to "react to the webhook" instead of polling on a timer —
   worth revisiting this doc if that ever becomes available.
