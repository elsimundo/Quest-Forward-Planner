# Decisions log

Short, dated records of *why* something was chosen — so nobody has to reverse-engineer
the reasoning from the code, or accidentally undo a deliberate choice thinking it was an
oversight. Add a new entry whenever a non-obvious technical or product decision is made;
don't edit old entries when a decision is later revisited — add a new one and mark the
old one superseded.

Format: **what** was decided, **why**, **what we didn't pick and why not**.

---

### 1. PostgreSQL over MongoDB

**Decided:** Postgres is the database.

**Why:** The domain is fundamentally relational — units, sites, bookings, and their
relationships — and several requirements map directly to features Postgres has natively:
a uniqueness constraint on `(unit_id, date)`, transactional multi-row swaps (§ swap in the
clash dialog), and `LISTEN/NOTIFY` as a future path to live updates without new infra.

**Not chosen:** MongoDB — would work, but every one of the above becomes something to
hand-roll in application code instead of getting it from the database for free. There's
no unstructured or variable-shape data in this domain that would justify a document store.

---

### 2. Drizzle over Prisma

**Decided:** Drizzle ORM.

**Why:** SQL-close (queries read like SQL, easier to reason about exactly what's
happening), lighter runtime, and plays well with raw Postgres features like
`LISTEN/NOTIFY` and partial indexes (needed for soft-delete-aware uniqueness — see #6)
without fighting the ORM's abstractions.

**Not chosen:** Prisma — more batteries-included (nicer migrations UX, generated client
ergonomics), a reasonable choice too; Drizzle was picked for being closer to the metal
given how much of this schema's correctness depends on Postgres-specific behaviour.

---

### 3. Multi-select drag-and-drop with rigid offset + swap/overwrite clash resolution

**Decided:** Dragging a selection of bookings moves them all by the same date/unit
offset. Dropping on an occupied cell opens a dialog offering **Swap**, **Overwrite**, or
**Cancel** — applied uniformly to every clash in the drop, not per-clash.

**Why:** Rigid-offset movement is predictable and matches how a scheduler thinks about
"shift this block of work" — arbitrary reflow (e.g. auto-bumping displaced bookings
forward) was considered and rejected because it moves bookings the user didn't touch,
which erodes trust in the tool. Swap is the headline resolution because "these two units
already have each other's schedules" is the common real-world case; Overwrite is kept but
deliberately styled as the destructive option (crimson, never default-focused).

**Not chosen:** "Bump to next free day" and "book alongside" (double-booking) — both
real ideas, both deferred to `SPEC.md` §13 as open client questions rather than built,
because both change the data model or need a client-confirmed policy first.

---

### 4. Auth.js with a swappable credential-verification function

**Decided:** Build auth once, now, using Auth.js's `Credentials` provider — but isolate
the "verify this login" step behind a single function.

**Why:** The client's staff logins will eventually live in TMS, but TMS read-access isn't
built yet (`SPEC.md` §13.1). Rather than building a throwaway stub auth now and a real
one later, the verification function checks a local `users` table today and can be
repointed at TMS later without touching sessions, route protection, or anything else in
the auth flow. **Roles stay local regardless** — TMS has no concept of this app's
`viewer`/`scheduler`/`admin`/`super_admin` tiers.

**Not chosen:** Hosted auth (Clerk/WorkOS) — simpler to stand up, but adds a paid
dependency and doesn't solve the "credentials actually live in TMS" problem any better
than Auth.js does; deferring a stub entirely was also rejected since it means building
auth twice.

---

### 5. Polling over WebSockets for live updates

**Decided:** ~10s polling refetch for v1.

**Why:** Fastest to ship, no extra infrastructure on Coolify, and sufficient for a small
scheduling team where two people editing the exact same cell at the exact same moment is
rare. Optimistic-lock conflict handling (`updated_at` check, §11) is what actually
prevents data loss from concurrent edits — polling frequency is just about how fresh the
view is, not correctness.

**Not chosen:** WebSockets / SSE — the nicer experience, deliberately deferred rather
than rejected; revisit if multi-scheduler contention turns out to be a real pain point in
practice. The data model doesn't need to change to add this later.

---

### 6. Soft deletes everywhere, no hard deletes in the app

**Decided:** `bookings`, `units`, `sites`, `companies` all get `deleted_at`/`deleted_by`;
"Clear" and "Overwrite" set these fields instead of running `DELETE`. The uniqueness
constraint on `bookings(unit_id, date)` is a partial index scoped to `WHERE deleted_at IS
NULL`.

**Why:** This app becomes the live source of truth for a healthcare logistics fleet —
losing a booking record to a misclick, or breaking history by deleting a unit that old
bookings still reference, is a real operational risk, not a hypothetical one. Combined
with the `booking_events` audit log and Postgres-level backups, this gives three
independent layers of protection (app undo → query-level soft delete → infra backup)
rather than relying on any single one.

**Not chosen:** Hard deletes with a confirmation dialog — the usual pattern, rejected
because a confirmation dialog only protects against slow mistakes, not fast ones (a
double-click, a script bug, a bad migration), and it doesn't preserve the historical
record the audit log is meant to guarantee.

---

### 7. Four-tier roles with role-assignment gated to `super_admin`

**Decided:** `viewer` / `scheduler` / `admin` / `super_admin`, where `admin` can do
everything operational (unlock bookings, manage site requirements, review pending sites,
view the audit log) but **cannot** change anyone's role — only `super_admin` can.

**Why:** Splitting "runs day-to-day admin tasks" from "can grant access" closes a
privilege-escalation gap: if any admin could make other admins, an admin could quietly
promote themselves, which defeats the purpose of having an audit log at all. Role changes
themselves are logged (actor, target, old role, new role, timestamp) for the same reason.

**Not chosen:** Three tiers with `admin` covering both — simpler, but the security
argument above was judged worth the extra tier for an app that controls a live schedule.

---

### 8. Publish workflow: range-based as primary, selection-based as secondary

**Decided:** The main "Publish upcoming…" action lets a scheduler pick a date range and
publish everything unpublished in it, with a live count shown before confirming. A
secondary "Publish selected" (reusing the existing multi-select) handles publishing a
handful of individually-corrected bookings without touching the rest of a range.

**Why:** A *forward planner* exists because ops works in routine cycles — "get the next
fortnight locked in and forwarded" is the natural unit of work, matching how the client
already runs the Excel version. Selection-based publishing alone would work but doesn't
match that mental model as the default; range-based alone would be clunky for the
exception case of fixing one booking after the fact.

**Not chosen:** Selection-only publish as the sole mechanism — reconsidered as
insufficient on its own for the primary "forward the fortnight" use case, but kept as the
secondary path since it already existed from the multi-select feature and fits the
exception case well.

---

---

### 9. Modality-generic schema, one unified app, CT-only at launch

**Decided:** The client runs the same forward-planner pattern for MRI and other fleets,
not just CT — same day × unit grid, same colour key. Rather than a CT-specific app, the
schema gets a `modalities` table with `units.modality_id`, capability matching moves from
CT-specific boolean columns (`sites.requires_cardiac`, etc.) to a generic
`site_capability_requirements` key/value table, and the grid gets a modality-switcher tab
control. One unified app — one login, one admin page, one role system, one audit log —
rather than separate planner instances per modality.

**Why:** Retrofitting a modality concept after CT-specific naming and hardcoded
capability columns are built into the codebase is expensive; making the schema generic
now costs a handful of extra columns and one join table. Separate planner instances per
modality would duplicate admin/auth/audit infrastructure for what's conceptually one
scheduling job. **Launch scope stays CT-only** regardless — MRI's own inventory-checklist
equivalent and capability list aren't confirmed with the client yet (SPEC §13 Q6), so
adding it later is a seeding task, not a rebuild, precisely because the architecture
didn't wait for that confirmation to be generic.

**Not chosen:** Ship CT with CT-specific naming/schema now, generalize later — rejected
because the retrofit cost (renaming, migrating hardcoded capability columns, splitting
what were CT-only assumptions out of interaction code) is materially higher than building
generic from the start, and the generic version doesn't cost meaningfully more to build
today. Also considered: separate planner apps per modality — rejected per the duplicated-
infrastructure reasoning above, same logic as the single role system in decision #7.

---

### 10. Excel migration: colour mapping, weekend detection, and unit-spec matching

**Decided:** Three rules for `data/migrate-from-excel.ts`, each derived by scanning every
fill colour in the actual workbook against real day-rows rather than guessed from the
sheet's legend tab alone:

1. **The four "undocumented" colours from SPEC §13 Q5 aren't mapped to a status at all.**
   `F8CBAD`, `B4C6E7`, `E2EFDA`, `E08B8B`, and a 5th found during the scan (`808080`) only
   ever decorate a recurring monthly summary block ("AVAILABLE IN MONTH" / "NOT AVAILABLE"
   / "RD" / "OR" / "EMPTY") that reuses each month's first date as its row label. The
   migration excludes these rows (real day-rows are recognised by column B holding an
   actual Mon–Sun abbreviation, not by the date column alone — the summary rows have a
   valid-looking date too).
2. **`weekend` status is decided by day-of-week, not fill colour**, because the sheet uses
   *three* distinct grey fills for it (one explicit RGB `A6A6A6`, two Excel theme+tint
   greys that don't carry an RGB code) — day-of-week is the reliable signal. An explicit
   status colour (e.g. bidding-red on a Saturday) still overrides the weekend default,
   matching the reference mock-up's own sample data.
3. **Unit specs import on exact unit-ID match only.** The `CT inventory checklist` tab and
   the `CT FP` tab disagree on naming for the same physical units in places (`RCT28`/`RCT29`
   in the checklist vs `CT28`/`CT29` in the grid) and the checklist has no column at all for
   `RCT22` or `CT35`–`CT45`. Rather than guess a mapping, unmatched units simply get no
   `unit_specs` rows, logged clearly by the script for admin follow-up.

**Why:** All three are guesses SPEC explicitly asked not to make silently (§13 Q5, and the
general "flag rather than assume" rule in `CLAUDE.md`). Scanning the real file turned each
one from a guess into an evidence-backed rule — confirmed with the user before writing the
migration script itself.

**Not chosen:** Manually mapping `RCT28`→`CT28`/`RCT29`→`CT29` on the assumption they're the
same unit — plausible, but unverified, and the cost of being wrong (silently attaching one
unit's cardiac/MAKO capability data to a different physical unit) is high enough that the
user chose exact-match-only for now.

---

### 11. Two SPEC/schema gaps closed while building the booking drawer

**Decided:** Two places where `SPEC.md` describes a mechanism whose data model isn't
actually in §2's table definitions:

1. **`bookings.updated_at`** (timestamptz, not null, default now(), bumped on every write) —
   §11 requires optimistic-lock reconciliation ("the save is rejected... the cell snaps back
   to the current server value") but no column to compare against was ever defined. Added
   directly to `bookings` rather than working around its absence.
2. **§2a's capability-mismatch warning** is logged inside the existing `booking_events.
   booking_after` jsonb snapshot (as an extra `capabilityWarnings` key alongside the row
   data) rather than adding a dedicated `metadata` column. `booking_after` is already a
   flexible jsonb blob capturing "what happened"; a mismatch warning is exactly that kind of
   fact, and it avoids a schema column that would otherwise sit empty until §2a's warnings
   actually fire.

**Why:** Both are mechanical gaps, not open product questions — SPEC's own prose already
states the intended behaviour (§11's reconciliation, §2a's "logged...so it's auditable"),
the schema just hadn't caught up yet. Same category as `users.password_hash` (decision
implicit in slice 1): necessary to build what's already specified, documented in
`docs/DATABASE.md`, not a silent judgment call on an unresolved SPEC §13 question.

**Not chosen:** Leaving optimistic locking unimplemented until someone explicitly asks for
`updated_at` — rejected because SPEC §11 is unambiguous that concurrent edits must never
silently overwrite each other, and shipping the drawer without that check would violate an
explicit requirement, not just skip a nice-to-have.

### 12. Two-pass sentinel reposition for swaps/chained shifts

**Decided:** `moveBookings` repositions rows in two `UPDATE`s inside its transaction:
pass 1 parks every moving row in a collision-free sentinel date range (`date + 365000`
days), vacating all originals; pass 2 places each row at its final `(unit_id, date)`,
which is now guaranteed empty. `undoBatch` achieves the same collision-safety by
soft-deleting all touched rows (removing them from the partial unique index) before
restoring their snapshots.

**Why:** An earlier implementation did the reposition as a single CASE-mapped `UPDATE`,
on the belief that "Postgres checks a unique index against the statement's final state,
not row-by-row." **That belief is false.** A non-deferrable unique index is enforced per
row as the scan proceeds, and a *partial* index (`WHERE deleted_at IS NULL`) can't be made
`DEFERRABLE` at all — so swapping two bookings (A→B while B is still live at B) threw
`duplicate key value violates unique constraint` and rolled the whole action back. It only
ever passed testing because every prior test moved into an *empty* cell. The sentinel pass
sidesteps the constraint honestly instead of relying on a guarantee Postgres doesn't give.

**Not chosen:** (a) Making the constraint a `DEFERRABLE` unique *constraint* — impossible
while it must stay partial for soft-delete. (b) `NULLS NOT DISTINCT` full index on
`(unit_id, date, deleted_at)` — more invasive schema change, and still not deferrable
per-row without extra ceremony. (c) Per-row UPDATEs ordered to avoid collisions — fragile
(correct order is operation-dependent) and loses the single-statement atomicity the batch
already needs.

### 13. Publish/unlock are undoable; the unlock is admin-gated but Ctrl+Z isn't

**Decided:** Publishing (scheduler+) and unlocking (admin+) both go through `booking_events`
(`publish` / `unpublish` actions) and both push a batch onto the client undo/redo stack, so
Ctrl+Z reverses a publish the same way it reverses a move. `undoBatch`'s "can't undo under a
lock" guard is relaxed to exempt the row a batch is itself un-publishing (otherwise undoing
a publish would be blocked by the very lock it just applied). The drawer's unlock is a
two-step confirm and only rendered for `admin`/`super_admin`; the server re-checks the role
regardless (`lib/actions/publish.ts`).

**Why:** The client asked to keep the mock-up's behaviour, where publish/unlock sit in the
same undo history as everything else — it's the least surprising model for a scheduler who
mis-clicks "Publish selected". The seeming tension with SPEC §2b's "only admin can unlock" is
narrow in practice: the undo stack is per-session client state that doesn't survive a reload,
so Ctrl+Z only reverses a publish the current user made moments ago in this session. Anything
published in an earlier session (or by someone else) still requires the deliberate,
admin-only, confirmed unlock. So the admin gate holds for the case it exists to protect —
"TMS already has the old version" — while same-session undo stays frictionless.

**Not chosen:** Keeping publish/unlock entirely off the undo stack (my initial instinct, and
the stricter reading of §2b). Rejected because the client explicitly preferred the mock-up
behaviour once the trade-off was spelled out, and the per-session scoping keeps the admin
gate meaningful anyway. If the client later wants publishes to be irreversible except via
admin unlock, it's a one-line change (don't `pushUndo` the publish batchId).

### 14. Admin page: two schema gaps closed, "invite" built as direct creation

**Decided:** Building SPEC §7's admin page surfaced two mechanical gaps, closed the same way
as decision #11's (the SPEC's intent is clear, the schema just hadn't caught up):

1. **`users.deleted_at`/`deleted_by`** — added so "deactivate staff" can follow the same
   soft-delete pattern as every other destructive-looking action (§2c), instead of being the
   one exception. `verifyCredentials` and `requireRole` both filter it out, so a deactivated
   account can neither log in nor keep mutating on a still-live session.
2. **`user_role_events` table** — §7 requires role changes to be audited (actor, target,
   old/new role, timestamp) but `booking_events` is specifically about bookings, so a
   sibling append-only table was added rather than overloading that one.

Separately, **"invite" is built as direct account creation** (`super_admin` sets name,
email, and an initial password — the same mechanism `pnpm db:create-user` already used) —
no email is sent.

**Why:** There is no email/SMTP infrastructure anywhere in the stack (no provider in
`package.json`, nothing in `.env.example`), and SPEC §7 says only the single word "invite"
with no mechanics specified — a real invite flow (signup token, expiry, email delivery)
would be new infrastructure invented from nothing, not a spec gap closed. Direct creation
reuses a pattern that already exists and ships the actual capability (a super_admin can get
a new starter into the system today); it's also strictly easier to *extend* into an email
invite later than to walk back if I'd built token/email machinery the client didn't ask for.

**Not chosen:** Building a token-based email-invite flow — rejected as scope invention
without a spec basis, and blocked anyway on a decision (which email provider) that's the
user's to make, not mine to assume. Flagging this rather than silently picking one, per
project ground rules.

### 15. Booking drawer freezes its optimistic-lock reference at mount

**Decided:** `BookingDrawerBody` snapshots `booking?.updatedAt` into local state
(`initialUpdatedAt`) once, at mount, and `handleSave`/`handleClear` send *that* as
`expectedUpdatedAt` — never the live `booking` prop.

**Why:** Adding ~10s live-update polling (§11, this slice) surfaced a real data-loss bug:
the drawer previously read `booking?.updatedAt` straight off its prop at save-time. Once
the grid started polling and refreshing `bookings` every ~10s, an *open* drawer's "expected"
value would silently drift forward to whatever the server currently held — so if another
user edited the same booking while the drawer sat open, the next background poll would
quietly update `expectedUpdatedAt` to match their edit, and the original user's save would
sail through the optimistic-lock check and clobber it outright. Verified live: without the
fix, editing a booking already changed by another user through an open drawer succeeded
silently, overwriting their status change; with the fix, the same sequence is correctly
rejected with "This booking was changed by [name] — refresh to see the latest," and the
DB is untouched. This is exactly the SPEC §11 guarantee ("never silently overwrite a
concurrent edit") — polling had quietly reopened a hole in it.

**Not chosen:** Pausing polling entirely while any drawer is open — would work but is a
blunter tool (starves every *other* open tab/user of live updates for as long as one person
leaves a drawer open) for a problem that's really about one specific field's provenance,
not about polling being active at all.

### 16. Focus-visible outlines added via `outline`, not Tailwind `ring`

**Decided:** Every hand-rolled interactive element (grid cell chips, toolbar pills,
Undo/Redo, Publish buttons, admin action buttons, nav links) got an explicit
`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-[color]` class. Elements already built from the shadcn `Button`/
`Input` primitives didn't need it — those already ship a proper `focus-visible:ring`.

**Why:** SPEC.md §12 requires visible keyboard focus; auditing found the grid's `CellChip`
(the single most important interactive surface in the app) had **no visible focus
indicator at all** — confirmed empirically (`outlineStyle: none`, `boxShadow: none` on
focus) before the fix, then confirmed fixed via real keyboard Tab navigation afterward
(`outlineStyle: solid`, `2px`, matches `:focus-visible`). The `outline` CSS property was
used deliberately instead of Tailwind's `ring` utility (which is `box-shadow`-based)
because several of these components already use inline `style={{ boxShadow: ... }}` for
selection/hover states (e.g. the checked/preview treatment on `CellChip`) — inline styles
always win over classes for the same CSS property, so a `ring` utility would have been
silently overridden by the existing selection indicator. `outline` is a separate property
and composes cleanly with both.

**Not chosen:** Verifying via a programmatic `element.focus()` call in the browser tool —
this produced a false negative (Chromium's `:focus-visible` heuristic doesn't grant it for
script-triggered focus following a prior mouse interaction), which cost time chasing a
"broken" fix that was actually fine. Real keyboard `Tab` presses are the only reliable way
to test this.

### 17. TMS auth integration: identity/password move to TMS, role stays local

**Decided:** `verifyCredentials` (`lib/auth/verify-credentials.ts`) — the one function
DECISIONS.md #4 always intended to get repointed — now checks the submitted
username/email + password against TMS's MySQL `users` table (read-only, via
`lib/db/mysql-auth.ts`) instead of our own local `password_hash`. Specifically:

- Look up the TMS user by username OR case-insensitive email; `bcrypt.compare` the
  password against TMS's `password_digest` (bcryptjs is hash-format-compatible with
  Ruby's native `bcrypt` gem that produced it).
- **Gate on `enable_scheduling_access = 1`** — a real, purpose-built TMS column for "this
  person may use scheduling apps," discovered by inspecting the actual local TMS schema
  rather than assuming the reference app's own `permission_group` staff/engineer block
  applied here (it doesn't — that was a different app's unrelated business rule). Checked
  only *after* the password is confirmed, so a wrong-password attempt can't be used to
  probe whether an account has scheduling access.
- On success, find (or auto-provision) the matching row in our own local `users` table by
  email, and return **that** row's role for the session — TMS has no concept of
  `viewer`/`scheduler`/`admin`/`super_admin`, so role assignment stays Quest-app-specific,
  exactly as SPEC.md §1 always said it would. Auto-provisioning defaults to `admin` when
  TMS's `permission_group` is `superuser`, else `viewer` — a **one-time default at first
  login only**, not an ongoing sync, so a super_admin's later role change for that person
  is never silently reverted by their TMS tag on some future login.
- A local row's own `deleted_at` (deactivation) still blocks login independently of
  anything TMS says — the two are separate concerns (TMS: "is this a valid Quest
  identity with scheduling access", us: "have we deactivated them in this app").
- Simple in-memory login rate limiter (5 attempts / 15 min per IP+username), matching the
  reference app's pattern.
- `users.password_hash` is now nullable (migration `0004`) — meaningless for anyone
  authenticating via TMS. The admin "Add staff" flow and `pnpm db:create-user` no longer
  collect a password; they just pre-authorize a role for an email ahead of that person's
  first real TMS login (defaults to `viewer` automatically if nobody pre-authorizes them).

**Why:** This is exactly the swap DECISIONS.md #4 planned for when "TMS read-access
exists" — sessions, route protection, and Auth.js itself don't change, only the one
function that answers "is this password correct." The `enable_scheduling_access` gate was
a judgment call surfaced back to the user rather than assumed, since the obvious reference
(the sibling app's auth guide) used a different, not-applicable rule; the real schema had
a better-fitting, purpose-built column once actually inspected.

**Not chosen:** Replicating the reference app's own hand-rolled session mechanism
(HMAC-signed cookies, no JWT library, custom `requireSession`/`permissions` helpers). That
app doesn't use Auth.js; we already do, and it already does the identical job (issue a
session, read it on each request, redirect when absent) — swapping it out for a bespoke
equivalent would be reinventing already-correct, already-tested infrastructure for no
benefit. Only the credential-verification *logic* was reusable, not the whole auth stack.

---

### 18. Booking statuses become admin-managed data, not a fixed enum

> **✅ Resolved 2026-07-28 — the premise holds, for a different reason than recorded.**
> This entry rested on the client's answer that TMS's own `booking_statuses` table is
> obsolete and shouldn't be read. A direct read of TMS said otherwise: company 3's
> `booking_statuses` holds **exactly these
> eight statuses** — Confirmed, Bank Holiday, Weekend Confirmed, Waiting Final, Bidding,
> Corrective Works, Location to be Confirmed, Customer Cancelled — with matching colours
> and descriptions. Six are merely deactivated (`active = 0`); live bookings use only
> Confirmed (1,274) and Corrective Works (94). Put to the client, who confirmed those six
> were **deliberately retired** from the TMS scheduler, not left stale — and that the
> planner should keep all eight, because it tracks provisional work TMS no longer models.
> So the decision below stands. The correction is to the reasoning: TMS's table isn't
> "obsolete", it's deliberately narrower than ours. See `docs/TMS_WRITE_BACK.md` §3.3,
> which also adds a `publishable` flag so only Confirmed statuses can reach TMS.


**Decided:** The status catalogue moves out of the `STATUSES` string enum into a
`booking_statuses` table (key, label, four-part colour palette, display order, `editable`,
`calendar_derived`, `billable`, `active`, soft-delete). `bookings.status` is now a free
`text` FK into `booking_statuses.key` rather than a compile-time union. The eight
client-approved statuses are **seeded** from `lib/statuses.ts` (`SEED_STATUSES`) in
migration `0005` — before the FK is added, so the 15k existing bookings stay valid — so
nothing changes visually at launch. Schedulers with admin access manage the catalogue at
`/admin/booking-statuses` (add/recolour/relabel/reorder/retire); the grid, drawer, legend,
toolbar and clash dialog render from the live catalogue via a `StatusCatalogProvider`
React context (`components/planner/status-context.tsx`) instead of the old hardcoded
`STATUS_CONFIG` map. `weekend`/`bankholiday` stay `calendar_derived` (app-assigned, not
user-pickable and not deactivatable); `confirmed` is the structural default. Settable-status
validation in `saveBooking` now checks the live table, not a constant.

**Why:** The client confirmed TMS's own per-company `booking_status` table is obsolete and
they want their **own** set, editable by scheduling admins, different from TMS's (see
`docs/TMS_INTEGRATION_PLAN.md` §3 and the memory of locked decisions, 2026-07-27). An enum
can't be edited by an admin at runtime; a table can. Keying bookings by a stable `key`
slug (rather than an integer id) keeps the whole UI's semantic-key model intact — the
calendar-derived logic and the client-approved palette survive as seed data and a render
fallback — so the change is additive rather than a rewrite of every status comparison.
`STATUS_CONFIG` is retained (renamed `SEED_STATUSES`) as both the migration seed and the
neutral-grey fallback for any key the live catalogue somehow lacks, so an unknown status
never crashes a cell.

**Not chosen:** (a) Integer `status_id` FK — cleaner-looking but forces every one of the
~dozen `booking.status === "confirmed"`-style comparisons and the calendar logic through
an id↔key lookup, for no gain; the text key is both the DB value and the semantic handle.
(b) Keeping the enum and hardcoding "admins can only toggle visibility" — doesn't satisfy
"our own statuses, different from TMS's," which needs create/relabel/recolour. (c) Syncing
statuses from TMS — explicitly rejected: TMS's status table is dead and we want a
different set, so TMS is not a source here (unlike units/locations/bookings-data).

---

### 19. Units get a surrogate integer key; company_id lands on units/sites/bookings; unit↔modality becomes many-to-many

**Decided:** `units.id` changed from a text primary key holding the TMS registration
("CT17") to a surrogate `serial`, with `registration` moved to its own display column.
`companies` gained a real row (InHealth) and `company_id` (NOT NULL) on `units` and
`sites`; `bookings` gained denormalised `company_id` and `modality_id` columns. A new
`unit_modalities` join table replaces `units.modality_id`. Hand-written migration
(`0006_empty_ricochet.sql`), not drizzle-kit-generated: a primary-key type change against
15,408 live booking rows needs a careful backfill-then-rename sequence (add new columns →
backfill via join on the old key → drop old FKs/indexes/columns → rename → recreate
FKs/indexes), not a blind `ALTER COLUMN ... TYPE`. Every phase is guarded by a `DO $$
... RAISE EXCEPTION` check that aborts the migration if a backfill produces an unmapped
row, and a full `pg_dump` was taken before running it. Every call site that logs a
`booking_events` snapshot (`saveBooking`, `clearBooking`, `moveBookings`, `publishBookings`,
`unpublishBooking`, `undoBatch`, and the Excel migration script) now enriches its snapshot
with `unitRegistration` via a new `getUnitRegistrations` helper
(`lib/db/unit-labels.ts`), and the audit log's SQL prefers that field, falling back to the
legacy `unitId` text for events logged before this change — otherwise the surrogate key
would silently turn "who moved CT38 off the Gloucester run" into "who moved 42."

**Why:** Step 2 of `docs/TMS_INTEGRATION_PLAN.md`'s build order (§9), needed before any
TMS sync work: TMS registrations are only unique **within a company** (TMS has "CT4" under
both InHealth and Canon), so a text PK keyed on registration cannot survive a second
company or a renamed unit without collisions. `company_id` on units/sites/bookings is the
scaffolding the hard company-scoping security boundary (§2, "no cross-company anything")
needs to attach to later — not enforced as a query filter yet (no signed-in-user company
context exists until the TMS-derived permission model, build order step 5), just the
columns landing now while it's cheap and it's still one company's data. `unit_modalities`
becomes m2m because the client confirmed a unit can carry more than one modality (e.g. a
unit scanning both CT and MRI) and TMS already models it that way. `bookings.modalityId`
is stamped and re-validated server-side against the unit's actual `unit_modalities` tags
at save time — never trusted from the client — because a unit can now legitimately belong
to more than one sheet.

**Not chosen:** (a) Leaving `units.id` as text and just adding `company_id` — doesn't fix
the actual collision risk (registration uniqueness), which is the reason this had to move
now rather than later, while the dataset is still small and single-company. (b) Filtering
every read query by `company_id` in this same change — deferred deliberately to build
order step 5, once a real signed-in-user → company mapping exists; doing it now would mean
hardcoding the one existing company id as a stand-in for a security boundary that isn't
wired to anything yet. (c) Leaving the audit log showing raw numeric unit ids and fixing it
later — rejected: the audit log's entire purpose (CLAUDE.md, SPEC §7) is answering "who
moved CT38," and letting that silently degrade for every mutation from this point forward
is a regression, not a deferral.

---

### 20. Read-only TMS reference sync — additive-only for unit↔modality tags, linked (not duplicated) against pre-existing local rows

**Decided:** `lib/db/tms/sync.ts` mirrors InHealth's `companies`/`locations`/`units`/
`unit_modalities` from TMS into `companies`/`sites`/`units`/`unit_modalities`, inside one
Postgres transaction, via `runTmsSync(triggeredBy)`. New columns: `companies.tmsCompanyId`,
`units.tmsUnitId`, `sites.tmsLocationId` (+ `town`/`postcode`/`nominalCode`) — all nullable,
all sync-owned. Every run is logged to a new `tms_sync_runs` table (status, jsonb diff
summary, who/what triggered it) whether it succeeds or fails, so a bad run is visible
rather than silent — the point of `docs/TMS_INTEGRATION_PLAN.md` §6A's "show the diff."
Reachable two ways: `/admin/tms-sync`'s "Sync now" button (`lib/actions/admin/tms-sync.ts`,
local admin roles), and `POST /api/tms-sync` (shared-secret `Authorization: Bearer`, no
session) for an external scheduler — this app is a single Docker container on Coolify with
no built-in cron (see `Dockerfile`), so "nightly" is an ops/deployment decision to point
whichever scheduler at that route, not something the code can wire up unilaterally.

Three correctness fixes came directly out of running this against the real TMS dev
database, not from reasoning in the abstract:

1. **Company linking is by "the one row with no `tms_company_id` yet," not by name.**
   TMS's `company_name` for InHealth is `"Inhealth"`; migration 0006 had seeded ours as
   `"InHealth"`. A name-match fallback silently created a *second* company row on first
   run, splitting 147 units and 458 sites onto the wrong company — exactly the "no cross-
   company mixing" invariant §2 exists to prevent. Since this app is hard-scoped to
   exactly one company, "find the unlinked placeholder" is the actual unambiguous signal;
   more than one unlinked row is now a thrown error, not a guess.
2. **A registration match against an unlinked local unit/site (same company) is treated as
   the same real thing, not a duplicate.** The original 31 Excel-migrated units and 219
   Excel-migrated sites collide on `units_company_registration_live_unique` /
   `sites.name` the instant TMS has a row with the same identity — because it's the same
   real scanner or location, entered twice (once via Excel, once via TMS). The sync links
   them (sets `tmsUnitId`/`tmsLocationId` on the existing row) instead of crashing or
   duplicating. Units get this exact-match linking despite the client waiving *site*
   reconciliation (`docs/TMS_INTEGRATION_PLAN.md` §5, "we don't need reconcile data to
   tms") — that waiver was about the LHC/LCS-style fuzzy site matching, a genuinely
   different, harder problem; an exact `(company_id, registration)` match for units isn't
   fuzzy and needs no human judgement. Applied the identical safe pattern to sites too
   (exact name match only), since a blind insert would hit the same unique-constraint
   collision on the rare exact match, not just the many fuzzy near-misses the client
   already said not to bother reconciling.
3. **`unit_modalities` sync is additive-only — a tag TMS doesn't have is never removed.**
   Discovered by running the sync for real: TMS has no `unit_modalities` row for `RCT27` at
   all, and that unit carries 730 live local bookings. A first draft that mirrored TMS
   exactly (add missing tags, remove extra ones) silently untagged RCT27 for CT, which
   would have dropped it off the CT sheet entirely — the unit still exists and still has
   its bookings, it just becomes invisible, because `getActiveUnits` filters by
   `unit_modalities`. The client said "Quest is fixing the tagging in TMS now" — i.e. it's
   known-incomplete — so treating an absence there as authoritative for removal is actively
   dangerous, not just cautious. If a tag genuinely needs removing, that's a job for a human
   on a future admin screen, not an unattended nightly job trusting in-progress data.

A shrink guard (`assertNotSuspiciousShrink`) also aborts the whole sync, rather than
soft-deleting, if a fresh TMS pull comes back under half the previously-synced count for
units or sites (once there's a meaningful baseline) — a suspiciously empty result is far
more likely a transient connection problem than InHealth actually deleting most of its
fleet or site list.

**Why:** This is build order step 3 (`docs/TMS_INTEGRATION_PLAN.md` §9) — the read-only
mirror everything downstream (modality tabs, booking import) needs to exist first. Every
one of the three fixes above is a *safety* correction, not a feature: each was caught by
actually running the sync against the real TMS dev data rather than trusting the design on
paper, and each failure mode (duplicate company, duplicate unit/site, or a live-booked unit
silently vanishing from its own sheet) would have been a genuine incident, not a cosmetic
bug.

**Not chosen:** (a) Syncing bookings in this same step — that's explicitly §6B / build
order step 4, a separate and materially harder problem (the conflict-with-local-edits
rule); keeping this step to reference data only makes it independently reviewable and
revertible. (b) Building an in-process scheduler (`setInterval`/`node-cron`) so "nightly"
works without any ops configuration — rejected because a single-instance Next.js container
restarting (deploys, crashes, Coolify redeploys) makes an in-process timer unreliable for
something that's supposed to run unattended every night; an external trigger hitting a
stateless webhook is the correct shape for this deployment, even though it means one
manual ops step to wire up. (c) Silently removing unit_modalities tags TMS doesn't have —
this is exactly incident #3 above; not a hypothetical rejected alternative but a real bug
caught and reverted before it could ship.

---

### 21. TMS booking import — own booking refs, additive-only status mapping, and a "frozen until resolved" conflict rule

**Decided:** `lib/db/tms/booking-import.ts` brings InHealth's confirmed TMS bookings into
`bookings`, keyed by a new unique `tms_booking_id`, with a new `source` column
(`'tms' | 'planner'`) and our own `booking_ref` ("FP-000123", `docs/TMS_INTEGRATION_PLAN.md`
§4.3) minted for every booking — TMS-imported or locally-created — via a global,
never-reset Postgres sequence (`booking_ref_seq`, `lib/db/booking-ref.ts`). The existing
15,408 Excel-migration bookings were backfilled with refs and then **soft-deleted** ahead
of the first import (client call, this session: the Excel data was test data, not needed
now TMS access exists; kept as a soft delete, never hard, per CLAUDE.md — and their
`booking_events` audit trail was written explicitly for the deletion, since the SQL that
performed it bypassed the app's normal write path). TMS's `first_day`/`last_day` are read
via `DATE_FORMAT()` as plain strings, not as DATETIME/JS Date — see the bug below.
`updated_by`/`created_by` for imported rows point at a new "TMS Import" system user
(mirrors `data/migrate-from-excel.ts`'s own system-user pattern, kept distinct in the
audit log). Reachable via `/admin/tms-bookings` ("Import now") and
`POST /api/tms-booking-import` (same shared-secret pattern as the reference sync).

**The conflict rule, precisely** (the client's locked decision: "flag it as a clash,
TMS doesn't win automatically" — see the memory of 2026-07-27 decisions): every booking
tracks `tms_updated_at` (TMS's `updated_at` as of the last import) and `tms_imported_at`
(when the import last touched the row). `localEditedSinceImport = updatedAt > tmsImportedAt`;
`tmsChangedSinceImport = tb.updatedAt !== tmsUpdatedAt`. Only when **both** are true is a
row flagged: `tms_conflict_at` is set, a small "⇄" badge appears on the grid cell
(`CellChip`), and the row is **frozen** — no future import run touches it (not even to
refresh the tracking timestamps) until a scheduler resolves it by editing
(`lib/actions/bookings.ts`) or moving (`lib/actions/booking-moves.ts`) it, either of which
clears the flag and resets `tms_imported_at` to the exact same instant as `updatedAt`.
`publishBookings` additionally refuses to publish a still-conflicted booking. A missing
local↔TMS status-name mapping falls back to `tbc` and is counted separately in the run
summary, never silently guessed.

Two real bugs, not hypothetical ones — found by running this against live TMS data and a
simulated real conflict, the same discipline as the reference sync (#20):

1. **A one-day date shift during British Summer Time.** TMS stores `first_day` as UK
   *local* midnight; naively reading it as a DATETIME and doing
   `new Date(first_day).toISOString().slice(0,10)` reinterprets that local wall-clock value
   as UTC, which is a category error for a pure calendar date and silently shifts every
   BST-period booking (UTC+1, late March–late October) back by one day. First surfaced as
   19 "target slot occupied" skips clustered entirely on 2026-03-29 (the DST transition
   Sunday) — investigation traced it to two genuinely different TMS bookings (ids 40/41,
   correctly on 2026-03-29 and 2026-03-30) colliding after both got mis-dated to the same
   day. Fixed by pulling `first_day`/`last_day` via `DATE_FORMAT(..., '%Y-%m-%d')` — a
   plain string, sidestepping timezone reinterpretation entirely — while leaving
   `updated_at` (a genuine instant, not a calendar date) as a normal Date. Re-running after
   the fix: 1,368/1,368 imported, zero skips, zero collisions.
2. **Resolving a conflict didn't survive a second import run.** The first version cleared
   `tms_conflict_at` on edit/move but never froze the row while conflicted, and never
   advanced `tms_updated_at` when a conflict was raised. Simulating a full lifecycle
   (conflict → repeated "still unresolved" reports → scheduler resolves it → a later
   import run) showed the scheduler's resolution getting silently overwritten by the
   *original* TMS content on the next run — because `tms_updated_at` stayed pinned to
   whatever it was *before* the conflict, so every later comparison kept reading "TMS still
   disagrees" forever, even after resolution. Fixed by (a) freezing a conflicted row
   completely until explicitly resolved, and (b) advancing `tms_updated_at` to TMS's
   current value at the moment a conflict is *raised* — recording "the scheduler has now
   seen and rejected this version," so a later resolution correctly compares against what
   was actually shown, not what was true before the disagreement started. Re-verified the
   full lifecycle end-to-end after the fix, including "TMS changes again after resolution"
   safely refreshing.

**Why:** This is build order step 4 (`docs/TMS_INTEGRATION_PLAN.md` §9) — the baseline
schedulers plan against. `booking_ref` exists now (not deferred further) because every
booking the app shows needs one consistent handle distinct from TMS's own `BK:A…` numbers,
and minting it retroactively later would be a second migration touching every row instead
of one. The "frozen until resolved" design is deliberately conservative — a flagged
conflict never auto-clears from either side, only from a human's deliberate action — because
the alternative (a "smart" re-evaluation on every run) is exactly what produced bug #2:
plausible-looking logic that silently discards a scheduler's decision the next time cron
fires.

**Not chosen:** (a) Trusting `mysql2`'s default DATETIME→Date coercion for `first_day` —
rejected outright once bug #1 was found; a calendar date has no timezone, and letting the
driver apply one is never correct, not just occasionally wrong. (b) Auto-clearing
`tms_conflict_at` when TMS's value stops disagreeing — rejected: TMS "no longer disagreeing"
usually just means our own stale comparison point, not a human decision; only an explicit
edit/move counts as resolution. (c) Importing every unit regardless of modality tag
ambiguity — a unit with zero or multiple modality tags has no single sheet to attach a
booking to; skipped and counted rather than guessed, consistent with #20's caution around
TMS's still-in-progress tagging data.

### 22. Hard company scoping, resolved server-side from the user's own TMS `company_id`

**Decided:** Every mutation and query is scoped to a company, and that scope is never
trusted from the client or the session token. `getCompanyAccess(userId, role)`
(`lib/auth/company-access.ts`) re-derives it from the database on every request:
`super_admin` gets `{kind:"any"}` (and a company picker in the UI, only rendered when
there's more than one company to pick between); every other role gets `{kind:"fixed",
companyId}`, looked up by matching their own `users.tms_company_id` (refreshed on every
login, `docs/DECISIONS.md` #17) against `companies.tms_company_id`. Every server action
that reads or writes a company-scoped row (`bookings`, `sites`, `units`, moves, publish,
undo, admin site/requirement review) calls `companyAllowed(actor.companyAccess,
row.companyId)` before acting, and fails the same way an absent row would — "not found"
rather than "forbidden" — so a mismatched company can't be distinguished from a row that
simply doesn't exist. The modality tab strip and company picker are both URL-driven
(`?modality=`, `?company=`) query params rather than local component state, so the
company/modality pair is always what the server actually rendered, not stale client
state left over from a previous selection.

**Why:** Company is the actual security boundary here — InHealth's scheduler must never
be able to see or touch another company's units, sites, or bookings, regardless of what
the client sends. Deriving access from the user's own live TMS `company_id` (not a role
flag set once at provisioning) means a person's access follows them if TMS ever
reassigns their company, without needing a separate sync job. `super_admin` needing
"any company, plus the ability to pick one to view as" was an explicit requirement — the
alternative of hard-locking every account including `super_admin` would have locked the
app's own bootstrap account out, since `super_admin` is local-only (#17) and has no TMS
`company_id` of its own.

**Not chosen:** (a) Trusting a `companyId` sent from the client (a query param or form
field) directly — rejected outright; that's exactly the kind of client-supplied scope
CLAUDE.md's server-side permission rule exists to prevent. (b) Storing a resolved
`companyId` on the session/JWT at login and trusting it for the session's lifetime —
rejected because a TMS company reassignment or an admin fixing a bad company match
wouldn't take effect until the next login, and it duplicates data that's one join away
from authoritative. (c) Returning an explicit "forbidden" error for a company mismatch
instead of reusing "not found" — rejected as an information leak: it would let one
company's scheduler probe whether a specific booking/site ID belongs to a *different*
company, even without being able to act on it.

### 23. Multi-company TMS sync, scoped by `enable_scheduling`, plus closing the read-side company-scoping gaps it exposed

**Decided:** TMS sync/import are no longer hard-locked to InHealth (`company_id = 3`) —
`listSchedulingEnabledTmsCompanies()` (`lib/db/tms/queries.ts`) pulls every TMS company
with `enable_scheduling = 1`, client-confirmed as the selection rule ("only companies with
scheduling enabled... this may only be InHealth at the moment but there will be more").
`runTmsSync`/`runTmsBookingImport` loop over each and sync it independently within the same
transaction — no row from one company is ever blended with another's (#22 still holds
per-request). Manually triggering a sync/import, and viewing its run history, is now
`super_admin`-only (`lib/actions/admin/tms-{sync,booking-import}.ts`,
`app/admin/tms-{sync,bookings}/page.tsx`, moved off the shared admin nav) — a single run now
touches every scheduling-enabled company at once, so a company-scoped `admin` triggering it
(or reading its per-company counts) would be acting and seeing outside their own boundary.
`getPendingSites`/`searchApprovedSites`/`getAllSitesBasic`/`getAuditLog`
(`lib/db/admin-queries.ts`) now take a `companyId: number | null` (`null` = every company,
valid only for a `super_admin`'s `{kind:"any"}` access) — these were reading globally with
no company filter at all, which was invisible while only one company existed and became a
real leak (a company-scoped admin could see another company's pending-site names, merge
targets, requirement targets, and audit history) the moment a second company was synced.

**Why:** Turning on a second company is exactly the scenario #22's design was already
built for (`super_admin` = `{kind:"any"}`), but it had never actually been exercised
end-to-end — running it for real (Quest Power, TMS id 150) surfaced three latent gaps that
only mattered once "more than one company" stopped being hypothetical:
1. **`sites.name` was globally unique**, not per-company (unlike `units.registration`,
   which was already correctly scoped). Live TMS data confirmed a real collision —
   "LCS Tesco Harrow" and "LCS Asda Slough (C&S)" each exist under both InHealth and Quest
   Power — so syncing a second company would have crashed outright on the unique
   constraint. Fixed: `sites_company_name_live_unique` on `(company_id, name) WHERE
   deleted_at IS NULL`, migration `0010`, mirroring `units_company_registration_live_unique`.
2. **`saveBooking`'s site resolution had no company filter at all** — neither the
   "existing site by id" path nor the free-text "match by name" path checked
   `sites.companyId` against the unit's own company. Harmless by construction while only
   one company's sites existed; a real cross-company data-attachment bug the moment a
   second company's site could share an id-guessable pattern or, worse, an identical name
   (see the Tesco/Asda collision above) with the company actually being booked into.
3. **The admin read-queries above had no company filter**, only the *mutating* actions that
   consume their results did (already fixed under #22) — so the write path was safe but the
   list/search UI itself leaked other companies' site names to a company-scoped admin.

**Not chosen:** (a) Keeping sync hard-locked to one company and having Quest manually flip
a config flag per new company — rejected; `enable_scheduling` already exists in TMS
specifically to mark which companies are live for this exact purpose, so reading it
directly needs no new coordination surface. (b) Letting company-scoped `admin`s keep
triggering sync/import now that a run spans every company — rejected as a boundary
violation, not merely a UX nicety: it would let a company-scoped admin cause TMS reads and
see aggregate counts for companies they have no access to elsewhere in the app.

### 24. Publish is gated to `confirmed` (and its calendar-derived forms), not any status

> **Superseded in mechanism, not in rule (2026-07-28).** `PUBLISHABLE_STATUS_KEYS` is gone;
> publishability is now `booking_statuses.publishable` (migration `0012`), admin-editable at
> `/admin/booking-statuses`. The client asked for this directly (`docs/TMS_WRITE_BACK.md`
> §3.3). The column is seeded to exactly the three keys below, so behaviour was unchanged on
> deploy — verified against the live catalogue. The "both sides read one source" property the
> entry below relies on is preserved and now stronger: the server gate and the grid's counts
> both read the catalogue rather than a shared constant. `confirmed` is protected from being
> made unpublishable, since it's the default status and switching it off would leave nothing
> publishable at all.


**Decided:** `publishBookings` (`lib/actions/publish.ts`) now refuses to forward a booking
to the live schedule unless its status key is `confirmed`, `weekend`, or `bankholiday` —
anything still "in discussion" (`bidding`, `tbc`, `likely`, `service`, `cancelled`) is
silently skipped, same treatment as an already-published or TMS-conflicted target, with a
distinct summary message ("N booking(s) still need to be Confirmed first"). The three
publishable keys live in one place, `PUBLISHABLE_STATUS_KEYS` (`lib/statuses.ts`), imported
by both the server gate and the client's own eligibility counts (`planner-grid.tsx`'s
`publishableSelected`/`eligibleInRange`) so the "Publish N" button/sweep count never
promises more than the server will actually publish.

**Why:** Client-confirmed via a team member's meeting notes (2026-07-27, David Emerson):
"anything that is confirmed will only be able to be published in the live schedule.
Anything that is currently in discussion, red days etc will not be included." Before this,
`publishBookings` had no status check at all — a "Bidding for contract" or "Site to be
confirmed" booking could be forwarded to TMS exactly like a genuinely confirmed one.
`weekend`/`bankholiday` are included deliberately (client-confirmed, not assumed): they're
a `confirmed` booking's calendar-derived label for that specific day (SPEC.md §3), not a
separate in-discussion state — excluding them would have blocked routine weekend/holiday
work that's otherwise fully confirmed.

**Not chosen:** (a) A new boolean column on `booking_statuses` (e.g. `publishable`) instead
of a hardcoded key list — rejected as unnecessary weight: `key` is already immutable once a
status is created (`docs/DATABASE.md`), so keying off the three structurally-significant
keys the app already special-cases elsewhere (`DEFAULT_STATUS_KEY`, the calendar-derived
pair) is exactly as stable and needs no schema change or admin UI. (b) Filtering the client
selection down to only-publishable before calling `publishBookings`, instead of sending the
full selection and letting the server report what it skipped — rejected for consistency:
the TMS-conflict skip already works this way, and a scheduler benefits from seeing "N still
need to be Confirmed" rather than those rows silently vanishing from what they selected.

### 25. Pad grouping — one-level `sites.parentSiteId`, admin-managed, drawer asks "which pad?"

**Decided:** Built the pad-grouping UI §5 always intended as a fast-follow. Schema:
`sites.parentSiteId`, nullable self-reference, migration `0011`. A site is exactly one of:
a plain standalone site (no parent, no children), a **group parent** (no parent of its
own, ≥1 child), or a **pad** (has a parent, no children of its own) — enforced in
`lib/actions/admin/site-groups.ts`'s `setSiteParent`, not the database: assigning a parent
rejects if the target parent itself has a parent (no grandparent chains) or if the site
being assigned already has children of its own (can't be both a parent and a pad). New
admin screen `/admin/site-groups` (company-scoped like every other admin list,
`docs/DECISIONS.md` #22/#23) — create a group (a bare new site, name only, never
TMS-linked or itself bookable), search any approved site to add as a pad, remove a pad back
to standalone. `searchSites`/the booking drawer's browse-all (`lib/db/queries.ts`,
`docs/DECISIONS.md` #26 — the location-dropdown work) now **excludes** pad sites from the
top-level list entirely — you pick the parent, and if it has children the drawer fetches
them (`getSiteChildren`) and prompts "which pad?" before finalizing the actual booking
target, which is always a pad/leaf site, never the parent. Grouping is 100% local
organisation on top of what TMS already gave us as flat, independently-bookable locations —
it never touches an existing booking's `site_id`, and TMS has no concept of it at all.

**Why:** TMS's `pads` table is completely empty everywhere (verified live, `docs/
TMS_INTEGRATION_PLAN.md` §5) — InHealth instead bakes the pad into the location name
("Kent & Canterbury Hospital Pad 1" / "Pad 2", each its own TMS `locations` row). Phase 1
shipped this as "pad = its own site" for free, with the explicit intent to add real
grouping once CT was live and it stopped being a distractor. One level only (no
grandparent chains) keeps the drawer's "pick parent → which pad?" flow simple to reason
about and impossible to get stuck in — there's never a "which pad, which then asks which
pad again" case to handle.

**Not chosen:** (a) Arbitrary-depth nesting — rejected as solving a problem nobody has;
TMS's own data is flat (a hospital's pads, not pads-within-pads), and unlimited depth would
turn the drawer's simple two-step flow into a real tree-navigation UI for no known benefit.
(b) Auto-grouping by name pattern (e.g. regex-stripping " Pad N" and grouping by the
remainder) — rejected: fragile against real naming variance already observed live ("Lister
Hospital Main Pad (General)" vs "... PET Reloc Pad" vs "Queens Medical Centre, Pad 1" — no
single pattern fits all of it), and silently grouping sites an admin never reviewed risks a
wrong merge no one asked for. Explicit admin action only. (c) Letting a parent site be
directly bookable too (as if it were also its own pad) — rejected: every existing booking
already points at a specific real TMS location, and letting new bookings land on a
purely-organisational parent row would create bookings resolving to nothing at TMS's end.

### 26. Site-location field: search or browse, not search-only

**Decided:** The booking drawer's site field (`components/planner/booking-drawer.tsx`)
now opens a full, scrollable, alphabetical list of the company's sites on focus — before
the user types anything — instead of showing nothing until 2+ characters are typed.
Typing still narrows to the existing top-6 type-ahead (`lib/db/queries.ts`'s `searchSites`,
SPEC §5). Implemented as a `siteFieldOpen` boolean driving the dropdown, not derived from
query length, so an empty query can legitimately show results.

**Why:** Client-relayed ask (David Emerson's meeting notes, 2026-07-27): "the site location
can be search or from a dropdown list of locations available to the company." A scheduler
who doesn't know (or can't spell) a site's exact name had no way to browse what's available
before this — SPEC §5's original ≥2-char type-ahead assumed the user already had a name in
mind.

**Not chosen:** Capping the browse-all list (e.g. top 50) — rejected: InHealth alone has
677 sites, and an artificial cap would silently hide real options with no way to reach them
short of guessing search terms, defeating the point of "browse" in the first place. A plain
scrollable list handles that volume fine.

### 27. The Excel workbook is deleted outright — data, script, and file

**Decided:** Every trace of the client's `CT_Forward_Planner_23012025.xlsx` was removed on
2026-07-28: the workbook, `data/migrate-from-excel.ts`, the `pnpm db:migrate-excel` script,
the `exceljs` dependency, and — **hard-deleted** from Postgres — 15,409 bookings, 30,935
`booking_events`, 219 sites, 3 units, 138 `unit_specs` rows, 28 `units.description` values,
and the `migration@system.quest.local` system user. This is a deliberate, one-off exception
to the project's no-hard-delete rule (`SPEC.md` §2c), authorised by the client directly.

**Why:** Client request, relayed this session: they were worried about "unnecessary tables
caused by the Excel data" and found it impossible to tell which rows were real TMS data and
which were spreadsheet leftovers. That confusion was real and getting worse — the workbook's
sites and units had already been *linked* to their TMS counterparts by the sync
(entry #24), so Excel-origin rows were no longer visually distinguishable from TMS-origin
ones. Soft-deleting wouldn't have helped: the whole complaint was about rows being *present
and ambiguous*, and a `deleted_at` row still shows up in every admin and audit view. The
workbook was only ever test data (`docs/TMS_INTEGRATION_PLAN.md` §2, "the Excel workbook was
only ever an example"), so nothing of value was destroyed.

Two subtleties worth remembering:

1. **`RCT22` was kept** despite having no `tms_unit_id`. It carries live TMS-imported
   bookings, so it's a real unit TMS simply never tagged — exactly the case entry #24 warns
   about. "Has no `tms_unit_id`" is *not* a safe test for "is Excel junk"; actual booking
   linkage is.
2. **138 `unit_specs` rows and 28 `units.description` values survived the first purge pass**
   because they hang off units that *are* TMS-linked. They were Excel text sitting on real
   TMS rows — precisely the client's complaint — and needed a second, separate pass.

**Consequences (not yet resolved):** `unit_specs` is now permanently empty with no source.
TMS has no capability data — across all 147 live InHealth units, `requires_special_access`
is 0, `special_access_details` is empty, and `customer_unit_type_id` is null on every single
row — and there is no admin UI that writes `unit_specs`. So SPEC §2a's capability-matching
warning is dead code until the client says where that data should come from. `units.description`
is likewise null everywhere, but is repopulatable from TMS `manufacturer` / `unit_type` /
`notes` whenever that's wanted. Both are flagged in `docs/DATABASE.md`.

**Not chosen:** *Soft-deleting instead* — rejected above; it preserves exactly the ambiguity
the client asked to remove. *Dropping `unit_specs` / `site_capability_requirements` and the
capability feature altogether* — considered and explicitly declined: the feature is
client-approved in SPEC §2a and modality-generic by design, and deleting it to tidy an empty
table would be trading a signed-off requirement for cosmetics. The tables stay empty and
honest until the data question is answered.

### 28. The overlay purge: 1,365 copies removed, judged on content not timestamps

**Decided:** With the overlay read path live (`docs/OVERLAY_BUILD_PLAN.md` B2), the 1,368 TMS
bookings copied into `bookings` became redundant — the grid now reads TMS directly. 1,365 of
them were **hard-deleted** on 2026-07-28, leaving the 3 rows that are genuine amendments.
`booking_events` was deliberately **not** touched.

**Why content, not the timestamp heuristic:** the build plan proposed keeping any row whose
`updated_at` was later than `tms_imported_at` — "somebody edited this" — which selected 11
rows. Comparing each row's actual unit/date/site/status/notes against live TMS showed only
**3** genuinely differ (the RCT22 moves off CT23). The other 8 had been touched at some point
but were byte-identical to TMS: a re-save, or an edit that landed on what TMS already said.
Under the overlay an amendment identical to TMS isn't an amendment, it's a duplicate — the
exact ambiguity the client objected to in #27 — and since TMS supersedes the planner
(`docs/TMS_WRITE_BACK.md` §5) keeping them protected nothing. The purge script recomputed
this comparison at run time rather than trusting the analysis, and refused to touch anything
published or TMS-conflicted (both zero).

**Why a hard delete, given `SPEC.md` §2c:** these are not bookings being cancelled. Every one
of them still exists, in TMS, which is now the thing the grid reads. Soft-deleting would have
left 1,365 rows sitting in admin and audit views looking like real bookings — recreating the
"which of these is real?" problem that caused #27 — and writing a `delete` event for each
would have put 1,365 cancellations into the audit log that never happened. Explicitly
authorised by the user, on the same footing as #27 and equally not a precedent.

**Why `booking_events` survived:** it is append-only (`SPEC.md` §2). Those events are the
true record that the import created these rows, and removing duplicates of data that still
lives in TMS doesn't entitle us to erase the history of having imported it. 1,409 events
remain, untouched.

**Verification:** the grid was compared before and after. Local live rows fell from 1,368 to
**3**, and the rendered grid stayed **identical** — 1,371 rows (1,368 real + 3 ghosts), same
2026-03-01..2026-05-31 range, no duplicate slots, no ghost colliding with a real booking, no
ghost pointing at a missing target, nothing unplaced. That equivalence is the actual proof
the overlay works: the schedule now comes from TMS live rather than from our copy of it.

**Not chosen:** *Soft delete* — rejected above, on both the visibility and the false-audit
grounds. *Deleting the matching `booking_events` too*, as #27 did — that purge was removing
data the client said should never have existed; this one is removing duplicates of data that
does exist and is still authoritative in TMS. Different case, different answer.

### 29. "Confirmed in Forward Planner" is sync state, not a ninth status

**Asked for:** the client, 2026-07-29 — *"we have confirmed in TMS which is white bg, I think
we need a new status for confirmed in forward planner"*, clarified as *"see at a glance what
we are planning to lock in as changes and how it affects the schedule"*.

**Decided:** no new status. The question "does TMS have this yet?" is answered from data the
planner already holds, rendered as a **marker on the chip** plus a **changes view** that fades
back everything TMS already agrees with. `OverlayBooking` gains an `origin` field
(`tms` | `amended` | `local`); `lib/planner-changes.ts` turns that plus `publishedAt` into one
of four change kinds — new, amended, moved, cleared.

**Why not a status:** three independent reasons, any one of which would be enough.

1. **It's a different axis.** A status says what kind of work a booking is (confirmed, likely,
   bidding, corrective works). Where it's confirmed is orthogonal — a *Likely* booking can
   equally exist only in the planner. Encoding it as a status means cross-multiplying against
   all eight, and the second request ("likely in Forward Planner") is inevitable.
2. **It has nothing to map to.** Statuses round-trip to TMS by name
   (`lib/db/tms/status-map.ts`), against company 3's catalogue of exactly eight. There is no
   TMS status called "Confirmed in Forward Planner", so a booking in it would have no defined
   value to send once the write API exists (`docs/TMS_WRITE_BACK.md` §3.1).
3. **It could lie.** A status is picked from a dropdown by a person. Someone sets "confirmed
   in TMS" on a booking TMS has never seen and the grid is confidently wrong. `origin` and
   `published_at` are derived at read time and cannot disagree with reality.

There's also a rule-level objection: `docs/CELL_STATES.md` says a cell's appearance must match
what you can do with it. Sync state already changes that — publishable or not, locked or not.
A new colour would change appearance while changing nothing about behaviour.

**Why a marker and a view, not just one:** they answer different questions. The dot answers
"is this cell in TMS?" while you're reading the schedule normally, so it has to be quiet — in a
live planning week a large fraction of cells carry one, and the grid is a schedule first. The
changes view answers "what am I about to publish?", which wants to be loud, so it dims
everything else instead of adding more ink. Same data, two intensities.

**Why the view dims rather than filters:** the client asked how changes *affect the schedule*.
A filtered list of changed bookings loses exactly that — you can't see that the move you made
leaves CT23 empty on the Thursday. Dimming keeps every change in the context of the work
around it. It reuses the status filter's existing 22%-opacity mechanism rather than inventing a
second one.

**Why the changes bar doesn't report publish eligibility:** the pre-flight dialog already does
that, against the same logic as the server gate (`lib/publish-eligibility.ts`). A second count
in the bar would either duplicate it or quietly disagree with it — a *cleared* booking is a
change with no live row for the publish sweep to find, so the two numbers would differ by the
number of clears. The bar says what changed; the button opens the dialog that says what will
actually go.

**Also changed:** the legend gained a second row. It described only status, which is part of
why the two axes got conflated in the first place.

**Left open, deliberately:** publishing a *clear* isn't wired up — `publishBookings` only
touches live rows, so a cleared booking counts as a change here but no publish path sends the
removal to TMS. That gap predates this work and belongs with the write API
(`docs/TMS_WRITE_BACK.md` §3.2, still deferred); this change surfaces it rather than papering
over it.

**Not chosen:** *A ninth status* — above. *A separate "finalised" sign-off step before publish*
— offered to the client as the other reading of the request; they confirmed it's visibility
they want, not a new approval gate. Worth revisiting only if they ask for it explicitly, since
it adds a role question (who signs off, who can undo it) that publish already answers.

### 30. The publish pre-flight sweep was reporting on TMS's whole schedule, not the planner's changes

**Found:** the client, testing #29 against a wide date range, saw a pre-flight dialog claim
"1895 of 2032 will publish — 137 need attention first," with the 137 almost entirely bookings
nobody had touched in the planner — untouched TMS rows sitting in `likely`/`tbc`/etc. because
that's what they normally are. *"I'm not sure the warning system is correct — it's warning me
about every booking, not just ones that have been moved in Forward Planner."*

**Root cause:** `preflightForRange` (`planner-grid.tsx`) swept every live, unpublished booking
in the date range — regardless of `origin` — through `classifyForPublish`. An untouched TMS
booking (`origin: "tms"`) was never actually publishable in the first place (it has no local
row for `publishBookings` to act on — `lib/actions/publish.ts` silently drops it at the "row
not found" step), so it was landing in the *excluded* list with a real-looking reason
("Not yet Confirmed") for something that was never a candidate to begin with. Same root cause
as the count that could overstate what the server would actually do, just visible here as
noise rather than a shortfall.

**Decided:** both pre-flight sweeps now scope to planner changes only —
`origin !== "tms"` — before classifying anything.

- **Range sweep:** an untouched TMS booking is filtered out before classification. Neither
  eligible nor excluded; it was never a change, so this dialog has nothing to say about it.
- **Selection sweep:** kept, not filtered — a scheduler who explicitly ctrl-clicks an untouched
  TMS booking made a deliberate choice, and silently dropping their selection would be exactly
  the silent behaviour `docs/TMS_WRITE_BACK.md` §5 already ruled out once (#24). It's reported
  as excluded with a new, calm reason (`not-a-planner-change` → "Already matches TMS — nothing
  to send") rather than the status/conflict reasons, which all imply something's actually wrong.
- **The flat "N will publish" count is gone.** `PublishBreakdown` now takes an
  `eligibleSummary: ChangeSummary` (`lib/planner-changes.ts`) and shows the new/amended/moved
  breakdown inline — "5 of 8 changes will publish (3 new · 2 amended) — 3 need attention
  first." Same data the chip dot and the changes view already use, so the three surfaces can't
  disagree with each other.

**Why filter rather than just relabel:** relabelling ("Already in TMS" instead of "Not yet
Confirmed") would still have shown 137 lines for a range where the planner made a handful of
changes — technically accurate, still the wrong thing to be looking at in a *publish*
dialog. The dialog's job is "what is the planner about to send," not "what is the state of
every booking in this range," and the fix makes the data match that job description instead
of narrating around the mismatch.

**Not chosen:** *Relabelling instead of filtering* — rejected above. *Filtering the selection
sweep too* — rejected because an explicit selection is a deliberate action, and dropping part
of it without saying so recreates the exact silent-skip problem #24 fixed.

### 31. The "not yet in TMS" marker became a background wash, not just a dot

**Asked for:** the client, adamant, after #29 shipped with a small corner dot: *"confirmed in
Forward Planner"* needed a visibly different background colour from *"confirmed in TMS"* — a
plain white Confirmed chip looking identical either way, dot or no dot, wasn't enough.

**Decided:** `CellChip`'s fill is no longer always the status's own background colour. Whenever
`changeKindFor` (`lib/planner-changes.ts`) returns a kind — the same data #29 already computed
— the fill is that status colour blended 14% toward navy (`mixHex`, `lib/statuses.ts`)
instead of the flat colour. The corner dot stays, layered on top: the wash answers "is this in
TMS?" at a glance across the whole grid, the dot (and its tooltip) still answers "what kind of
change is this?" once you look at one cell.

**Why every status, not just Confirmed:** asked and left open in #29's write-up; the client's
own answer here didn't specify, so the call was made against the standing architecture rather
than special-cased. Sync state is one axis that applies uniformly to all eight statuses
(#29's whole argument against a ninth status), so treating it as an all-eight rule cost no
more code than special-casing Confirmed and stayed consistent with that reasoning. A `Likely`
booking someone created in the planner gets the same tell as a `Confirmed` one now, which is
arguably more correct, not less — the ambiguity Confirmed's white background made obvious
exists for every status, just less visibly.

**Why a blend, not a flat colour:** a single flat "changed" colour stamped over all eight
statuses would answer "is this in TMS?" while destroying the answer to "what kind of work is
this?" — which is the very conflation #29 was written to avoid, just moved from the data model
into the rendering. Blending a small ratio into each status's own colour keeps both answers
visible in one glance: still recognisably Confirmed (or Likely, or Bidding), just perceptibly
off from how it renders once TMS actually has it.

**Also updated:** the "Changed here" legend swatch (`status-legend.tsx`) now shows the actual
wash rather than a plain white square with a dot, computed with the same `mixHex` call so the
key can't drift from what the grid renders.

**Not chosen:** *Confirmed only* — the literal wording of the ask, but narrower than the
architecture supports and inconsistent with #29 without a reason to be. *A flat single colour
for every "changed" cell* — rejected above, for erasing status identity.

### 32. The "not yet in TMS" colour changed from navy to the app's own blue

**Asked for:** Dave, after #31 shipped: *"confirmed in Forward Planner"* to be **blue**.

**Root cause:** #31's wash blended white toward `#1a3d69` — a very dark, near-black navy —
at a light 14% ratio. Mixing white with a colour that dark mostly desaturates it rather than
tinting it: the result (`#dfe4ea`) is a pale grey, and reads as "slightly off-white," not as
blue. The mechanism from #31 was right; the specific colour it mixed toward wasn't.

**Decided:** swapped the wash/dot colour from `#1a3d69` to `#2b7bb9` — the app's existing blue
accent, already used for focus rings, links, and the open-cell highlight
(`components/planner/cell-chip.tsx`, `status-legend.tsx`, the toolbar's Changes pill, and the
drawer's change label). Confirmed-in-planner now mixes to `#e1edf5`, a clean pale blue in the
same family as the app's other pastel status colours, rather than a grey. Nothing else about
#31's design changed — same `mixHex` mechanism, same 14% ratio, still applied uniformly across
all eight statuses, dot still layered on top for the specific reason on hover.

**Not touched:** the navy on the Publish button, the selection bar, the changes bar, and the
publish dialogs' "PUBLISH TO TMS" headers. Those are action-button chrome, not the booking
marker Dave was describing, and swapping their colour too was never asked for.

### 33. The drawer's sync-state line was silent on the common case

**Found:** the client, looking at the edit drawer for an ordinary Confirmed booking: it just
says "Confirmed," with no answer to "is this in TMS or Forward Planner?" — because
`BookingDrawer`'s change-kind line (#29) only ever rendered when there *was* a pending
change. An untouched TMS booking has no `changeKind` (`lib/planner-changes.ts` returns null
for `origin: "tms"`), so the line was omitted entirely rather than saying anything — silence
that read as "no answer" rather than "TMS already has this."

**Decided:** the drawer now always states which side has the booking, for anything that isn't
locked: the existing blue change-kind line when there's a pending change, or a new neutral
grey line — *"Already matches TMS — nothing to send"* — when there isn't. Reused verbatim from
`PUBLISH_EXCLUSION_LABEL["not-a-planner-change"]` (`lib/publish-eligibility.ts`, #30) rather
than a new string, so the drawer and the publish dialog can't end up saying this two different
ways. Skipped once locked — "🔒 Published & locked" right above it already answers the
question.

**Same shape as #29's original gap:** a marker that only appears on the exceptional case reads
as absent, not reassuring, on the common one. #29 fixed this on the chip with the wash; this
is the same fix applied to the one other place a scheduler reads a single booking's status.

### 34. Right-click "Move to unit" — a narrow, client-approved exception to the context-menu deferral

**Asked for:** a way to redistribute a block of bookings off a unit (e.g. it's gone down)
without dragging through however many unit columns the fleet has to find one with room.

**Decided:** two additions, built together. First, an **"Available units" toggle** in the
toolbar (`components/planner/planner-grid.tsx`) that hides unit columns with no free
capacity — scoped to the current multi-select's dates when one exists (the actual dates
being redistributed), otherwise the whole loaded range. It never hides a unit that
currently holds part of the selection, even if that unit is (by definition) full on those
exact dates — the first version of this shipped without that guard and made the very
column a scheduler was dragging from disappear out from under them.

Second, **right-click a booked, unpublished cell → "Move to unit"** → a submenu of the
same filtered/visible unit list, each entry showing a clash count if landing there would
collide with an existing booking. Picking one calls the exact same
`computePreview`/clash-detection/`applyMove` pipeline a drag already uses (refactored to
take an explicit `{origin, keys}` argument instead of always reading the drag ref, so both
triggers share one code path) — the swap/overwrite dialog, undo, and publish-eligibility
all behave identically regardless of which one was used.

**Why right-click, specifically:** this app replaces an Excel workbook — right-click-to-act
on a cell is the client's existing trained reflex, not a new pattern being introduced. And
because it's implemented as a second front door onto the same move pipeline rather than a
parallel reimplementation, it doesn't create the "two mental models for one action" risk a
bolted-on menu usually would.

**SPEC.md §14 lists "right-click context menu" as a deferred, phase-2 item** — that entry
is about a general-purpose menu (copy/paste, delete, etc.). This ships one specific action
ahead of that, deliberately, at the client's request; §14 now calls out the exception by
name rather than silently drifting from what's built.

**Not chosen:** *Hiding unavailable units in the submenu* (matching the toolbar toggle's
column-hiding) — rejected once the toolbar toggle's own hide-the-source-column bug surfaced
the same failure mode. A dropdown is short enough that listing every candidate with its
clash count costs nothing, and never makes a unit seem to vanish. *A general context menu
built now, ahead of the client asking for the rest of it* — rejected; scope creep back
into the phase-2 item this was meant to carve a single exception out of, not replace.

### 35. Redistributing a block: shift-drag one at a time, or a per-row dialog

**Found:** #34 made it easy to *find* a free unit, but not to actually place a block into one.
A drag applies a single uniform date/unit offset to the whole selection, and
`attemptMove` is all-or-nothing: if any one cell in the block would land on an occupied slot,
the entire move stops at the clash dialog. A run of bookings coming off a downed unit almost
never fits contiguously anywhere else, so in practice nothing got placed — the client's words:
*"if they flash no of them get placed."*

**Decided:** two ways to place a selection one booking at a time, both feeding the existing
move pipeline.

1. **Shift *mid-drag* places only the grabbed cell.** Start the drag normally — the whole block
   moves, as before — then hold shift and only the booking actually grabbed is placed, leaving
   the rest of the selection where it is.

   **A move no longer clears the selection; the selection follows the bookings.** `applyMove`
   used to call `clearSelection()`, which made one-at-a-time placement useless — the first
   shift-drag threw away the very set being worked through. It now remaps each moved cell's key
   from its old position to its new one, so a tick stays on until the scheduler takes it off
   (clicking the booking, or Clear selection). After each shift-drag the placed booking is still
   ticked at its destination and the unplaced ones are still ticked where they are. The
   shift-click range anchor is remapped the same way so it keeps pointing at the same booking.

   **Shift is read per-event during the drag, not once at dragstart** — the first attempt did
   the latter and worked only intermittently. Shift held at *mousedown* makes the browser
   extend the document's text selection instead of initiating a drag, so the drag frequently
   never started. (A contributing bug: `CellChip`'s draggable branch was missing `select-none`,
   which `GhostChip` already had — fixed, and commented, since removing it would silently
   resurrect this.) Once a drag is in flight there is no selection to extend, and
   `dragover`/`drop` carry `shiftKey` just as well. `single` is part of the drag-preview state
   and its equality check, so tapping shift without moving the mouse still repaints the preview
   from "whole block" to "one cell".

   **Not a different modifier:** Alt/Option and Ctrl mean *copy* in HTML5 drag-and-drop. With
   `effectAllowed = "move"` the browser resolves a requested copy to `dropEffect = "none"` and
   rejects the drop outright, so switching keys would break the gesture rather than fix it.
   Shift means *move*, which is the semantics actually wanted here.
2. **Right-clicking a multi-select opens a per-row dialog** (`move-selected-dialog.tsx`)
   instead of #34's submenu: one row per selected booking, each keeping its own date and
   picking its own destination unit from a dropdown, with occupied units flagged inline.
   Rows default to "Keep where it is" so confirming an accidentally-opened dialog is a no-op.
   A single-cell right-click still gets the simple submenu — a modal for one row is friction,
   not help.

**Why the dialog doesn't send the whole block to one unit:** that's what a horizontal drag
already does, and it re-creates the exact clash the block is usually being moved to escape.
The per-row form is the thing neither drag nor #34's submenu could express.

**Clash handling is unchanged and shared.** `attemptExplicitMoves` applies the drag's own rule
— a target counts as occupied only if something is there that isn't itself vacating in the same
batch — and hands any real conflict to the existing swap/overwrite `ClashDialog`. The one new
check is *self*-collision (two rows sent to the same unit on the same date), caught in the
dialog and blocking confirm, because `ClashDialog` explains a conflict with an existing booking
and has no meaningful swap/overwrite answer for two of your own rows fighting each other.

**Escape keeps the selection while the dialog is open**, unlike everywhere else in the grid.
The dialog is *about* the selection; dismissing it and silently discarding the multi-select
would throw away the expensive part to rebuild.

**Not chosen:** *Making block drags partial — place what fits, report the rest* — rejected as
a silent partial success on the primary interaction, where "some of these moved and some
didn't" is exactly the ambiguity the clash dialog exists to prevent. Shift-drag makes the
one-at-a-time case explicit instead. *A bulk conflict-resolution UI inside the dialog* —
rejected as a second clash model to keep in sync with the first.

### 36. Stage B4 — collision detection, and why it didn't fire on a booking added directly in TMS

**Reported:** a scheduler booked CT40 on 6 March in the planner (Unconfirmed, no linked TMS
booking), then added a *different* location for CT40/6 March directly into TMS's own
database. No warning appeared anywhere in the planner.

**Root cause:** Stage B4 of `docs/OVERLAY_BUILD_PLAN.md` — "an amendment and a *different* TMS
booking on the same unit and date" — was scoped but never built. Without it, the merge in
`lib/db/tms/overlay.ts` had no rule for two REAL (non-ghost) rows landing in the same slot: the
untouched-TMS-booking branch pushed the new TMS row unconditionally, the amendment loop pushed
the local booking unconditionally, and `bookingLookup` in `planner-grid.tsx` — a plain `Map`
keyed by unit+date — silently kept whichever one was inserted last. One booking simply didn't
render, with nothing to say so.

**Decided:** built B4 as scoped — computed on read, no background job, reusing the existing
5-minute TMS cache. `OverlayBooking.tmsCollision` (`lib/db/tms/overlay.ts`) is set whenever an
amendment's slot also holds a live TMS booking it isn't linked to. New `⨯` badge (red, bottom-
left, same corner as `⇄`/`↻`) — priority `⇄` (legacy) > `⨯` (collision) > `↻` (supersede),
same rule as the existing two: different colours and symbols so none is ever mistaken for
another while all exist in the codebase at once. Drawer shows a banner naming what TMS has
there. `classifyForPublish` (`lib/publish-eligibility.ts`) gained a `tms-collision` exclusion,
checked ahead of `tms-supersedes` — a collision has no shared lineage to reconcile (two
different bookings wanting one slot), which is more fundamental than "TMS changed a booking we
already amended." `publishBookings` (`lib/actions/publish.ts`) re-derives it fresh at commit
time against live TMS, the same pattern C3/D1 already established for `tmsSupersedes`, rather
than trusting a client-sent flag.

**No new resolution action.** Unlike `resolveTmsSupersede` (C3), a collision doesn't have two
versions of the same thing to pick between — the existing Clear and drag-to-move already cover
every real resolution (defer to TMS, or move the local booking elsewhere). Adding a bespoke
resolve flow here would be a second mechanism doing what the drawer's footer already does.

**Known gap, not fixed here:** detection is on-read only, per B4's own scope — it surfaces the
next time anyone opens or refreshes the grid for that date, bounded by the 5-minute cache TTL
plus however long until someone looks. It does not proactively notify anyone the moment the
TMS row is added. A proactive alert (background polling tighter than the 5-minute display
cache, plus a delivery channel) is a separate, larger feature — planned in
`docs/COLLISION_ALERTS_PLAN.md`, not built, and Email was already deferred by the client
(`docs/TMS_INTEGRATION_PLAN.md` §12: "we can wire up brevo later").

### 37. Right-click "Swap" for exactly two selected cells

**Asked:** with two cells selected, a one-click right-click "switch them" action.

**Scope tension, flagged before building:** SPEC.md §14 scopes the v1 right-click menu to
one narrow, client-approved action ("Move to unit") and explicitly says it is "not a
reopening of the general context-menu item" — a general multi-action context menu is listed
out of scope. A second distinct menu item is a small step past that literal wording, even
though it adds no new underlying capability: the existing "Move N selected bookings…" dialog
(#35) can already produce the identical outcome today, in two picks (each row choosing the
other's unit as its destination). Put to the user rather than decided unilaterally; confirmed
— add it.

**Decided:** `CellMoveMenu` (`components/planner/cell-context-menu.tsx`) shows "⇄ Swap these
two bookings" above the usual "Move N selected…" item whenever exactly two cells are
selected and the right-clicked cell is one of them. `handleSwapSelected`
(`planner-grid.tsx`) calls `moveBookings` (`lib/actions/booking-moves.ts`) directly with a
**single** `MoveSpec` (A→B) and `mode: "swap"` — no clash dialog, because picking "Swap" on a
two-cell selection already is the confirmation. `moveBookings`'s swap mode already computes
the reciprocal reposition itself (whatever occupies the target slot moves into the vacated
origin) — this is the exact mechanism a drag-onto-an-occupied-cell already resolves to via
`ClashDialog`'s "Swap bookings" button, just invoked directly instead of via a drag+clash.

**Not routed through `applyMove`.** That helper's checked-set remap assumes `moves` names
every departing cell (built for one-directional block moves), and would incorrectly drop one
of the two keys from `checked` here — a swap's reciprocal half never appears in `moves` at
all, it's inferred from the clash. A straight two-way swap doesn't actually change *which*
cells are selected (both stay occupied, just by each other's booking), so the correct
behaviour is no remap at all — `handleSwapSelected` does its own success handling
(toast/undo/refresh) rather than reusing `applyMove`.

### 38. The cell fill is the status indicator, and the label went neutral to make it so

**Asked for:** *"the cell bgs should be the indicator of status not the text colour"* — and, on
the follow-up, the reason: *"its easy to see at a glance over the text colour being the
indicator."*

**The actual problem.** Nominally the fill was already the indicator — `CellChip` has always
painted `st.bg`. But the eight seeded `bg` values were each status's `bar` colour at roughly
**7%** over white, which is close enough to white that `cancelled`'s `#f9ebf6` and
`confirmed`'s `#ffffff` are the same colour in a wall of forty cells. What actually
distinguished them was the *label*, drawn in the status's saturated `text` (`cancelled`'s
`#7d2f6c`). So the indicator had migrated from the fill to the text without anyone deciding
that — which is exactly backwards for glanceability: a 12px two-line site name is a far worse
carrier of "which status is this" than a 40px block of colour.

Worth recording that **fixing only the text made it strictly worse before it got better.** The
first pass neutralised the label and stopped there, on the assumption the fills were already
doing their job. They weren't, and with the text neutral there was no indicator left at all —
the grid went uniformly white. The two halves are one change, not two.

**Decided:** two things together.

1. **The label is a fixed `#333333`** in `CellChip` and `GhostChip`
   (`components/planner/cell-chip.tsx`) instead of `st.text` — the same neutral the mock-up
   already used for `confirmed`. `st.text` is untouched in the catalogue and still used where a
   status *names itself* (the drawer's status picker) rather than where it colours a booking.
2. **Every non-`confirmed` `bg` moved to its own `bar` colour at 28% over white** — one
   derivation instead of eight hand-picked tints, so the palette is internally consistent and a
   future admin-added status can follow the rule. `lib/statuses.ts` for the seed and the render
   fallback; migration `0014_status_bg_saturation.sql` for the live rows.

**Why 28%, and why it's a ceiling.** Two things bound it from above. The fixed `#333333` label
has to stay legible (all eight clear 8:1, comfortably AAA), and — the tighter constraint — the
sync wash of #31/#32 works by mixing 14% of the blue accent *into* this same `bg`, so the more
saturated the base, the less that wash reads. Measured, the wash's RGB delta drops from ~33 on
the old tints to ~29 at 28%, which still reads; past that it degrades fast. The ratio is stated
in both places with a note to retune them together.

**Why `confirmed` stays pure white.** It's the overwhelming majority of the grid, so tinting it
would make everything loud and leave nothing to read the exceptions against. More concretely,
"Confirmed in the planner but not yet in TMS" is the single most common thing the blue wash has
to say, and that wash needs a white base to say it — #32 exists precisely because a wash on a
near-white base was already marginal.

**Admin colours are not clobbered.** `color_bg` is editable at runtime
(`/admin/booking-statuses`), so each `UPDATE` in 0014 is guarded on the current value still
being the original seed colour. Anything already recoloured by hand keeps its colour.

**Known remaining weak pair:** `tbc` (`#fbdbca`) and `bankholiday` (`#f6e7c2`) are both warm
pales and stay the closest two in the set, because their `bar` colours — orange `#f17f42` and
amber `#e0a826` — are genuinely adjacent hues. Separating them properly means changing a brand
`bar` colour, which is a client call, not a rendering one. Flagged rather than fixed.

**Not chosen:** *keeping `st.text` and only saturating the fills* — two competing indicators is
what made the grid hard to read in the first place, and the client asked for one. *A flat
"status" colour per cell with no white default* — loses `confirmed`-as-neutral, which the Excel
workbook and the mock-up both relied on.

### 39. TMS `superuser` is exempt from `enable_scheduling_access`, and provisions as `super_admin`

**Reported:** both Quest-internal accounts (`Simon`, `jamesw`) could not sign in despite being
TMS superusers. **Stated rule:** *"superusers do not need scheduling access 1, only any other
user — this is because superusers should have full access."*

**The bug, and why #17 got it wrong.** #17 gated login on `enable_scheduling_access = 1`, chosen
after inspecting the schema as the purpose-built "may use scheduling apps" column. That was the
right column and the wrong scope: it's a **per-account grant**, and nobody grants a superuser a
permission the tier already implies. Measured against live TMS: **all 15 superusers have
`enable_scheduling_access = 0`**, and all 15 have `company_id IS NULL`. So the population locked
out was exactly the people meant to administer the planner, while ordinary staff got in
normally — the gate was inverted for the one tier that mattered.

**Decided:** two changes in `verifyCredentials`, sharing one `isTmsSuperuser` predicate so the
two tests can't drift:

1. **The gate is skipped for a superuser** — `!isTmsSuperuser(tmsUser) &&
   !tmsUser.enableSchedulingAccess`. Ordinary accounts are untouched and still need the flag.
2. **First-login provisioning gives `super_admin`, not `admin`** — reversing #17's explicit
   "nothing here ever auto-provisions `super_admin`".

**Why (2) was not optional.** Fixing only (1) was tested and still left `jamesw` rejected. A
superuser has no TMS `company_id`, and the company gate (#22) admits a non-`super_admin` only by
matching their TMS company to a local one — so `admin` wasn't a *lesser* grant here, it was
**none**: authenticate, then bounce at the next gate. `super_admin` is the only role that
expresses "full access, no company affiliation", which is what the TMS tier means. #17's
reasoning — that never auto-provisioning the top tier is what makes it safe to exempt
`super_admin` from company scoping — was sound in isolation but assumed the top tier would be
reached by promotion through the admin UI. That's unreachable when nobody can log in to do the
promoting.

**What this widens, stated plainly:** all 15 TMS superusers now get top-tier, cross-company
planner access on first login. That was put to the user with the full list and the trade-off
before being implemented, not assumed. It's bounded and auditable: the tier is 15 named
Quest/Flow Media internal accounts, TMS is the client's own system of record for identity, and
because provisioning is a **one-time default** (unchanged from #17), demoting someone in the
planner afterwards sticks and is never re-escalated by their TMS tag on a later login.

**Not chosen:** (a) *Pre-authorising named individuals with `pnpm db:create-user`* — no policy
change and keeps #17 intact, but leaves every future superuser locked out until somebody
remembers, which is the same failure that produced this report. (b) *Provisioning `admin` and
exempting superusers from the company gate instead* — grants effectively the same power while
the role label understates it, and would require threading TMS state into `getCompanyAccess`,
which today derives everything from the local `users` row. Rejected as more moving parts for a
less honest result.

**Still open, deliberately not assumed:** this app reads `scheduling_permission_group` into
`TmsUser` and never uses it. All 10 grant-holding TMS users are `'admin'` there; both reporting
superusers are `'read_only'`. `docs/TMS_INTEGRATION_PLAN.md` §7 maps that column to
`viewer`/`scheduler`, but the code doesn't implement it — local role is the only authority.
Whether `read_only` should constrain what someone can do in the planner is a client question
(`SPEC.md` §13), untouched here.

### 40. A TMS `company_id` of NULL means Quest's own staff — and they see every company

**Stated by the user (2026-07-30):** *"if a users company_id is null that means they are quest
staff and should be able to see all companies."*

**What was wrong.** #22 read a NULL `company_id` as *"no company, so nothing to show them"* and
rejected the login. That inverted the field's meaning: TMS leaves `company_id` NULL precisely
for **internal Quest people**, who aren't affiliated to one client company because they work
across all of them. The check was denying access to the group with the broadest legitimate need
for it.

**Decided:** NULL `company_id` grants `{kind:"any"}`, the same company access `super_admin`
already had. Two places, because the login gate and the enforcement point are separate:

- `verifyCredentials` no longer throws `NoCompanyAccessError` for a NULL company. Anyone *with*
  a company_id is still rejected if we hold no data for that company.
- `getCompanyAccess` (`lib/auth/company-access.ts`) returns `{kind:"any"}` when the local row's
  `tmsCompanyId` is NULL.

The second one is load-bearing: fixing only the login gate would have admitted a Quest-staff
`viewer` and then failed every company-scoped query, since `getCompanyAccess` returned `null`
for them — a worse outcome than the clean rejection it replaced.

**One condition had to be split.** `getCompanyAccess` tested `!user?.tmsCompanyId`, conflating
"no such user row" with "user row whose company is NULL". Those now return **opposite** answers
(deny vs. full access), so they're separate branches, with `=== null` rather than a falsy test —
which also stops a `company_id` of `0` being read as "no company".

**"Any" is still never a blended view.** It means *may switch between* companies via the picker,
one at a time — the rule from #22/#23 that no grid ever mixes two companies is unchanged. The
planner page already gated the picker on `companyAccess.kind === "any"` rather than on the role,
so Quest staff get it with no extra rule to keep in sync; only a stale comment there needed
correcting.

**Scope of what this widens.** 220 live TMS users have a NULL `company_id` (78 engineer, 76
manager, 16 staff, 16 transport_manager, 15 superuser, 10 finance_manager, 9 senior_manager).
**Today this changes nothing observable:** none of the 205 non-superusers holds
`enable_scheduling_access = 1`, so none can log in at all, and the 15 superusers already get
`{kind:"any"}` via `super_admin` (#39). It matters the moment TMS grants scheduling access to a
Quest-internal engineer or manager — who previously would have been rejected at login, and now
lands as a `viewer` able to switch between companies. Role still governs what they can *do*;
this axis only governs *which company's* rows they may touch.

**Not chosen:** treating "Quest staff" as a separate `CompanyAccess` variant, or a new local
role. Both add a third state to an axis that already had exactly the right two — the existing
`{kind:"any"}` means "not company-locked", which is precisely what a Quest-internal account is.

### 41. "Corrective works / service" recoloured off the app's own blue accent, onto sky blue

**Reported by the user:** *"the corrective works and confirmed in forward planner blues are too
similar."*

**The cause.** `service`'s bar/bg (`#2b7bb9`/`#c4daeb`) and the "not yet in TMS" sync wash
(#31/#32, the app's blue accent `#2b7bb9` mixed into whatever status a booking has) are the same
hue by construction — `service` had simply always used the app's own interactive blue as its
status colour, which happened not to matter until #38/#39 made status fills the primary
signal on a cell (before that, colours were pale enough across the board that this specific
collision wasn't the thing you'd notice first).

**Decided, in two steps within the same session.** Offered a genuinely different hue (teal) or a
hue-shifted-but-still-blue option, with the tradeoff of each stated plainly. Teal was picked
first, shipped (migration `0015_corrective_works_teal.sql`, bar `#1a9e8f`), and seen live — at
which point the user preferred staying in the blue family after all. Final value: bar `#2f9fd6`,
bg `#c5e4f4`, text `#0a5273` (6.39:1 against the new bg — AAA), migration
`0016_corrective_works_sky_blue.sql`. Both migrations are kept rather than collapsed into one:
0015 genuinely was live (verified in the running app) before being superseded, and the project's
own rule is new migrations over edited ones. `lib/statuses.ts` reflects only the final value.
Both migrations guard on the specific value they expect to find (0015 on the original blue, 0016
on 0015's teal) so a fresh database replays both in order, and an admin who hand-recoloured
`service` in between keeps their own colour rather than being overwritten by either step.

**Why sky blue over teal.** RGB distance from the wash accent `#2b7bb9` is ~46 — enough that a
plain Corrective Works cell and a washed Confirmed cell read as different colours — while
staying close enough in hue that an *unpublished* Corrective Works booking (which washes toward
`#2b7bb9` same as any other status) lands near its own resting colour rather than jumping hue
entirely the way teal would have. Teal remains the safer choice against the wash in the abstract
(zero collision risk under any circumstance, not just reduced), but the user weighed seeing both
live and chose to stay in the blue family.

**Not touched:** the wash accent itself (`CHANGE_COLOR` in `cell-chip.tsx`, `#2b7bb9`) — it's the
app's general interactive blue (buttons, focus rings, `SPEC.md` links), client-mandated to be
exactly this blue (#32) and applied uniformly across all eight statuses (#31). Recolouring the
wash instead of `service` would have meant either breaking that uniformity for Confirmed alone
(rejected in #31 already, as narrower than the architecture) or changing the wash for every
status, which is a much bigger, already-settled decision to reopen for a one-status collision.

**Known drift:** `reference/quest-ct-forward-planner.jsx` still defines its own `service` as
`T.blue`/`T.blueDark` — the same structural collision, unfixed there. Left alone per CLAUDE.md
(the mock-up isn't edited unilaterally); flagged the same as #38's drift.

### 42. Bulk "discard unpublished changes" reuses undo's snapshot restore, not soft-delete

**Decided:** the changes bar's "Discard my changes" / "Discard everyone's changes" buttons
revert unpublished bookings by repeatedly calling the same transaction logic as `undoBatch`
(`lib/actions/undo.ts`, factored out as `undoBatchWithinTx`), walking each affected row's
`booking_events` history backwards until nothing unpublished remains in the visible date
range. "Mine" is scoped by current ownership (`bookings.updatedBy`/`deletedBy`), not
original authorship — if someone else has since edited a row you touched, it's no longer
yours to discard, and `undoBatch`'s existing conflict check (refusing to reach back past a
newer edit it doesn't recognise) is the backstop if that's ever attempted anyway.
"Discard my changes" is scheduler/admin/super_admin, same as Undo; "discard everyone's" is
admin/super_admin only, same tier as unlocking a publish (SPEC.md §2b) — it can wipe out a
colleague's in-progress edits regardless of ownership.

**Why:** a naive "just soft-delete the live row" revert is wrong. `loadSuppressedTmsBookingIds`
(`lib/db/tms/overlay.ts`) treats *any* soft-deleted row carrying a `tmsBookingId` as a
permanent "cleared" ghost — it can't tell a genuine Clear apart from an undone in-place edit.
Soft-deleting an "amended" row to revert it would turn the cell into a stuck cleared ghost
instead of cleanly reverting to the plain TMS booking. `undoBatch` already gets this right,
because its before/after snapshot restore knows the correct end-state for every action kind
(create/update/delete/move/swap/overwrite) — reusing it sidesteps reinventing that logic.

**Not chosen:** wiring the bulk discard into the client's one-click Ctrl/Cmd+Z undo stack.
Discard can produce several new `booking_events` batches in one call, but the stack
(`planner-grid.tsx`) is a flat list of single batch ids, one push per user action — grouping
several batches into one undo step is a real change to that mechanism, left for a follow-up.
Every event discard produces is still a normal, already-undoable row on its own; the
confirmation dialog (`discard-changes-dialog.tsx`) is the safety net for this pass, same as
`clearBooking` having no confirmation today and `unpublishBooking` using a two-step
arm/confirm rather than relying on Undo.

### 43. The corner "change dot" is gone; the wash carries the sync state alone

**Decided:** removed the 6px blue dot from the bottom-right of every changed chip
(`components/planner/cell-chip.tsx`). The 14% blue background wash stays and is now the only
mark for "TMS doesn't have this cell as shown yet". Which *kind* of change it is
(new/amended/moved/cleared) is still named in full in the chip's tooltip, and still drives
the changes bar's breakdown — nothing was removed but the mark itself. The legend swatch
(`status-legend.tsx`) lost its dot to match; the drawer's inline sync line keeps its dot,
because there it sits beside a written explanation rather than standing alone.

**Why:** the client asked for it directly — "get rid of the little dots on the booking,
they're not needed". They're right, and #31 is why: the dot was the *first* attempt at this
signal, and the wash was added when the dot alone proved not to be enough. Once the wash
landed, the dot was carrying no information the tooltip didn't already carry, on a grid where
a busy week can show it on forty cells at once.

**Not chosen:** removing the wash as well, which would leave "what's unpublished?" answerable
only from the changes bar and the publish pre-flight. The wash is the part the client was
explicitly "adamant" about in #32. Also not chosen: stripping the other corner marks
(⚠ ⇄ ⨯ ↻ ⌫) at the same time. They look similar but do a different job — ⨯ and ↻ mark cells
that publishing will *refuse*, and hiding a blocker until the pre-flight dialog is worse than
a slightly busier chip.

### 44. A drop preview is one verdict for the whole block, not one per cell

**Decided:** `computePreview` (`planner-grid.tsx`) paints every target cell red when the drag
as a whole can't land cleanly, rather than colouring each target on its own merits. Green now
means exactly "drop this and it just moves". The selection bar becomes the drag's readout
while a drag is live, naming the shortfall in words ("9 bookings · 3 won't fit"), since colour
alone can't distinguish "three of these clash" from "this hangs off the end of the calendar".

**Why:** the client's report was "if we're moving 9 bookings then it needs to turn green and
allow that movement only when all 9 fit". The *behaviour* was already that — a partial fit has
never half-applied; it goes to the clash dialog or a toast. What was wrong was the feedback:
six green cells and three red ones reads as "mostly fine", because green is the go-ahead
colour and most of the block was green. Out-of-range drags were worse still — their members
have no in-range cell to paint, so a block hanging off the end of the calendar showed its
remainder in green with nothing at all to indicate the rest had nowhere to go.

**Not chosen:** blocking the drop outright when the block doesn't fit. That would remove
swap/overwrite for multi-drags, which is approved behaviour from mock-up review (SPEC.md §8)
and is often exactly what the scheduler wants. Red now means "not a clean fit", not
"forbidden". Also not chosen: a cursor-following drag ghost showing the count — SPEC.md §6
lists it as a nicety, and the selection bar is already on screen throughout a multi-drag with
no positioning edge cases to get wrong.

### 45. Undo takes you to what it reverted

**Decided:** `undoBatch` returns the unit+date of every row it touched (`UndoTarget[]`, read
from the rows *after* the restore), and the grid scrolls to the earliest of them and flashes
all of them amber for two seconds. Redo does the same. `goToMoved` was generalised to
`goToCell` and `flashKey` to a `flashKeys` set to support it, and `CellChip`'s empty branch
gained flash styling.

**Why:** the client asked "when undo'ing, can it go to where the change is going back to". The
grid is one continuous ±1yr virtualised scroll, so Ctrl+Z from anywhere frequently reverted
something well outside the viewport and said so only in a toast — leaving the scheduler to go
and find it to confirm the undo did what they meant. The machinery already existed for the
ghost's "jump to where this moved" link; this is the same problem.

**Not chosen:** flashing only the cell scrolled to. Nine bookings snapping back should light up
nine cells, or the highlight describes the destination rather than the change. Also not
chosen: awaiting `router.refresh()` before scrolling — `days`/`dateIdx` are a fixed range, so
the row index is valid regardless of data freshness, and waiting would just delay the scroll.

### 46. Empty cells are selectable; each action states its own scope

**Decided:** ctrl-click, shift-click and Select mode now work on free cells as well as booked
ones, and the selection may hold both kinds at once. `checked` is no longer provably
all-booked, so the guarantee is replaced with an explicit split (`selectedBookingKeys` /
`selectedEmptySlots`) that each consumer reads: drag and swap and publish take the booked
part, "Book N days" takes the empty part, and the selection bar names both counts. A
shift-click range takes its kind from its anchor, so ranges stay homogeneous without the user
thinking about it.

**Why:** the client asked to "select multiple empty bookings and manage all of them in one
go". Booking a fortnight at one site was fourteen separate drawer visits. The mixed selection
falls out of allowing it at all — a shift-range down a column will cross both kinds — so
rather than forbidding that, each action says what it operates on.

**Not chosen:** a separate `checkedEmpty` set. Two selection states means two things to clear,
two things to keep in sync through a move, and two sources of truth for "is this cell
selected". Also not chosen: forcing the selection homogeneous by clearing it when the user
crosses kinds — that silently throws away work in exactly the case the feature exists for.

### 47. Drag a run's edge to extend it; the run is a rendering, not a row

**Decided:** the top and bottom day of a contiguous same-site unpublished run carry an
8px `ns-resize` grab strip. Dragging it out creates one booking row per new day (inheriting
site and status, notes blank); dragging it in soft-deletes the days given up. One gesture is
one `batch_id`, so one Ctrl+Z. Growth clamps at the first occupied day rather than turning
red, and a run always keeps at least one day. Built on pointer events with
`setPointerCapture`, and the handles are siblings of `CellChip`, not children.

**Why:** the client asked to "drag the top or bottom of the planned movement to extend it".
The catch is that there is no planned movement in the database — `bookings.date` is a single
date column under `bookings_unit_date_live_unique`, so a five-day visit IS five rows and there
is no duration to stretch. "Extend by three days" is therefore a bulk *create*, which is the
same operation as #46's bulk booking; both go through `createBookings` in
`lib/actions/bookings.ts`, and `writeBookingAtSlot` was extracted from `saveBooking` so the
overlay's amendment and revive rules have exactly one implementation.

**Not chosen:** HTML5 drag-and-drop, which the chip's *move* gesture already owns — two
overlapping drag sources on one element is where this would break. Not chosen: turning the
preview red when growth meets a booking; the edge physically cannot pass one, so there's no
invalid state to represent and a wall feels better than an error. Not chosen: letting a
run shrink to nothing — that's Clear, and it should be the deliberate thing it already is.
Status is allowed to vary within a run (only the site must match): a week at one site that's
Confirmed for three days and Provisional for two is still one visit, and splitting the handle
there would surprise.

<!--
Template for new entries:

### N. <short decision title>

**Decided:** <what, in one or two sentences>

**Why:** <the reasoning — what problem it solves, what tradeoff it accepts>

**Not chosen:** <the alternative(s) considered and why they lost out>
-->
