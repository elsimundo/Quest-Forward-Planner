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

<!--
Template for new entries:

### N. <short decision title>

**Decided:** <what, in one or two sentences>

**Why:** <the reasoning — what problem it solves, what tradeoff it accepts>

**Not chosen:** <the alternative(s) considered and why they lost out>
-->
