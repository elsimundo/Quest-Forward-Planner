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

> **⚠️ One premise of this entry is in doubt (2026-07-28).** It rests on the client's
> answer that TMS's own `booking_statuses` table is obsolete and shouldn't be read. A
> direct read of TMS says otherwise: company 3's `booking_statuses` holds **exactly these
> eight statuses** — Confirmed, Bank Holiday, Weekend Confirmed, Waiting Final, Bidding,
> Corrective Works, Location to be Confirmed, Customer Cancelled — with matching colours
> and descriptions. Six are merely deactivated (`active = 0`); live bookings use only
> Confirmed (1,274) and Corrective Works (94). The *decision* below still stands (we own
> the catalogue, and it's admin-editable), but "TMS has nothing usable here" is not true,
> and it matters for publishing statuses back. Re-raised with Quest in
> `docs/TMS_WRITE_BACK.md` §3.3.


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

<!--
Template for new entries:

### N. <short decision title>

**Decided:** <what, in one or two sentences>

**Why:** <the reasoning — what problem it solves, what tradeoff it accepts>

**Not chosen:** <the alternative(s) considered and why they lost out>
-->
