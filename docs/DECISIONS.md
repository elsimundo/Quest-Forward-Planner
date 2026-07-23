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

<!--
Template for new entries:

### N. <short decision title>

**Decided:** <what, in one or two sentences>

**Why:** <the reasoning — what problem it solves, what tradeoff it accepts>

**Not chosen:** <the alternative(s) considered and why they lost out>
-->
