# Database reference

Living reference for the actual schema. `SPEC.md` §2 is the *design* (what the schema
should achieve and why); this document should track the *real* Drizzle schema as it
exists in code. **Keep this in sync with `lib/db/schema.ts` — update it in the same PR
that changes the schema, not after.**

> Until implementation starts, the tables below mirror `SPEC.md` §2 exactly. Once real
> migrations exist, replace the block below with the actual generated schema (or a
> script that keeps this file generated from it) rather than hand-maintaining both.

## Entity overview

```
                    unit_modalities
modalities ◄───────────────┤
    ▲                       │
    │                       ▼
companies ──┐             units
    │       │               │
    │       ▼               │
    └──►  sites ──────► bookings ◄────── users
            │              │                │
            ▼              ▼                ▼
   unit_specs +      booking_events   (role: viewer|scheduler|admin|super_admin)
   site_capability_
   requirements
   booking_statuses ──────────┘  (bookings.status → booking_statuses.key)
```

- A **booking** is the join of a unit, a date, and a site, with a status and a
  publish/lock state.
- **`booking_events`** is append-only and never soft-deleted itself — it's the audit
  trail for everything else.
- **`modalities` / `units` / `sites` / `companies`** are reference data, mirrored from TMS
  by `lib/db/tms/sync.ts` (§13.1, `docs/DECISIONS.md` #20) — treat them as read-mostly.
  Every column the sync owns is documented per-table below; anything not sync-owned
  (`description`, `display_order`, `active`, `kind`, `pending_review`, …) is local-only and
  the sync never touches it.
- **This app plans multiple fleets (CT, MRI, others)** — see SPEC §2d. A unit's modality
  is now many-to-many (`unit_modalities`) rather than a single column, since TMS confirms a
  unit can carry more than one modality (e.g. CT + MRI) and appear on more than one sheet
  (`docs/DECISIONS.md` #19). Only CT is populated at launch.
- **Everything is scoped to one company (InHealth) today.** `units`, `sites`, and
  `bookings` all carry a `company_id`, but it isn't yet enforced as a query filter — that
  lands once a real signed-in-user → company mapping exists (`docs/TMS_INTEGRATION_PLAN.md`
  §7, build order step 5). Until then, treat the single seeded `companies` row as the only
  one in play.
- **`booking_statuses` is admin-managed data, not a fixed enum** (`docs/DECISIONS.md` #18)
  — `bookings.status` is a free-text FK into it. TMS's own per-company status table is
  obsolete; this app's client wants its own set, editable at `/admin/booking-statuses`.

## Tables

### `modalities`
Reference data. One row per fleet type — CT, MRI, and whatever else Quest schedules the
same way. **v1 launch has only a `CT` row seeded**; adding a new modality later is a
seed, not a migration.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `name` | text, unique | `"CT"`, `"MRI"`, … |
| `display_order` | int | Tab order in the modality switcher |
| `deleted_at` | timestamptz, null | Soft delete |

### `units`
Reference data. One row per scanner unit (e.g. `CT15`, `RCT22`, `CT45` — or an MRI/other
equivalent once that modality is added).

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | Surrogate key — **not** the registration. TMS registrations are only unique *within* a company (`docs/DECISIONS.md` #19), so they can't be a global PK. |
| `company_id` | FK → `companies`, not null | |
| `registration` | text | Display identity (e.g. `"CT15"`) — what used to be `id` |
| `display_order` | int | Column order in the grid, within its modality |
| `description` | text | Full spec line from the source sheet header |
| `active` | bool | Local-only — the sync sets it `true` on create and never touches it again, so an admin's decision to hide a unit survives every later sync run |
| `deleted_at` | timestamptz, null | Soft delete — SPEC §2c. Set by the sync when a linked unit disappears from TMS |
| `tms_unit_id` | int, unique, null | TMS `units.id` — the sync's upsert key. Null for a unit that's never been synced |
| `tms_synced_at` | timestamptz, null | Stamped on every row the sync touches, whether changed or not |

**Constraint:** `UNIQUE (company_id, registration) WHERE deleted_at IS NULL` — a registration
is only unique per company, matching TMS.

### `unit_modalities`
Reference data. Many-to-many join between `units` and `modalities` — a unit can carry more
than one modality (e.g. a unit scanning both CT and MRI) and then appears as a row on both
sheets (`docs/DECISIONS.md` #19). Replaces the old single `units.modality_id` column.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `unit_id` | FK → `units`, not null | |
| `modality_id` | FK → `modalities`, not null | |

**Constraint:** `UNIQUE (unit_id, modality_id)`.

The sync (`lib/db/tms/sync.ts`, `docs/DECISIONS.md` #20) only ever **adds** rows here, never
removes one — TMS's own tagging is known-incomplete (a real InHealth unit with 730 live
bookings had no TMS tag at all when this was built), so treating an absence in TMS as
authoritative for removal would silently drop a booked unit off its own sheet. Removing a
stale tag, if ever needed, is a manual admin action, not something an unattended sync does.

### `unit_specs`
Reference data, from the modality's own inventory-checklist source tab. Key/value per
unit — deliberately generic so each modality's spec sheet (CT: cardiac, MAKO,
insufflator; MRI: e.g. tesla strength, bore diameter — TBC with client) fits without a
schema change.

| Column | Type | Notes |
|---|---|---|
| `unit_id` | FK → `units` | Numeric surrogate key, not the registration |
| `key` | text | e.g. `cardiac`, `mako_approved`, `insufflator_model` |
| `value` | text | |

Drives the capability-matching warning (SPEC §2a).

### `companies`
Reference data. NHS Trusts, Ramsay, Circle, Spire, Healthshare, medneo, etc. Only one row
exists today (InHealth) — everything else in this app is hard-scoped to it, per
`docs/TMS_INTEGRATION_PLAN.md` §2.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `name` | text, unique | |
| `tms_company_id` | int, unique, null | TMS `companies.id` — InHealth is `3`. The sync's upsert key; links to this row by finding "the one company with no `tms_company_id` yet," not by name (`docs/DECISIONS.md` #20 — TMS's own name and ours don't even agree on casing) |
| `tms_synced_at` | timestamptz, null | |

### `sites`
Reference data, but with one exception: schedulers can create new sites via free-text in
the booking drawer (flows into `pending_review`). Shared across modalities — the same
hospital can appear in both the CT and MRI grids (confirm with client, SPEC §13 Q6).

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `name` | text | Unique **within a company**, not globally (`sites_company_name_live_unique` on `(company_id, name) WHERE deleted_at IS NULL`, migration `0010`, `docs/DECISIONS.md` #23) — matches `units.registration`'s pattern below. Two different companies can genuinely share a site name; confirmed live in TMS ("LCS Tesco Harrow" exists under both InHealth and Quest Power) |
| `kind` | text, null | hospital \| LHC \| CDC \| yard \| other — taxonomy TBD, SPEC §13 Q7. Local-only, never touched by the sync |
| `company_id` | FK → `companies`, not null | |
| `tms_location_id` | int, unique, null | TMS `locations.id` — the sync's upsert key. Null for a site created locally via the drawer's free-text flow |
| `town` / `postcode` / `nominal_code` | text, null | From TMS; not collected for locally-created sites |
| `pending_review` | bool, default false | True when created via free-text, awaiting admin approval. Never set by the sync |
| `deleted_at` | timestamptz, null | Soft delete. Set by the sync when a linked site disappears from TMS |
| `tms_synced_at` | timestamptz, null | |

### `site_capability_requirements`
Generalized replacement for what would otherwise be CT-specific boolean columns on
`sites` (e.g. `requires_cardiac`). One row per requirement, so any modality's own
capability vocabulary fits without a schema change — mirrors the `unit_specs` key/value
pattern by design.

| Column | Type | Notes |
|---|---|---|
| `site_id` | FK → `sites` | |
| `requirement_key` | text | CT example: `cardiac`, `mako`, `insufflator`. MRI (TBC): e.g. `high_tesla`, `wide_bore` |
| `required` | bool, default true | |

### `users`
App-local *role* assignment even now that TMS provides credentials (SPEC §1,
`DECISIONS.md` #4, #17). Identity and password verification happen against TMS
(read-only, `lib/db/mysql-auth.ts`) — this table records what someone can *do* in the
planner, not who they are.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `name` | text | Synced from TMS forename/surname on first login (auto-provision); not kept in sync afterward |
| `email` | text, unique | Matched case-insensitively against TMS's `email_address` to find/provision this row |
| `password_hash` | text, null | No longer set for TMS-authenticated users (`DECISIONS.md` #17) — `verifyCredentials` checks TMS's `password_digest`, not this column. Made nullable in migration `0004`; kept for any legacy locally-authenticated row. |
| `role` | text | `viewer` \| `scheduler` \| `admin` \| `super_admin` — SPEC §7. **Always local** — TMS has no concept of these roles. On auto-provision (first login), defaults to `admin` if TMS's `permission_group = 'superuser'`, else `viewer` — a one-time default, not an ongoing sync, so a later local role change is never overwritten by TMS on a subsequent login. A super_admin can also pre-authorize a higher role for an email before someone's first TMS login (admin "Add staff" / `pnpm db:create-user`). |
| `tms_synced_at` | timestamptz, null | Bumped on every successful TMS login |
| `tms_company_id` | integer, null | TMS's own company id for this person (`companies.tms_company_id` is the local match). Refreshed on every successful TMS login — never trusted from the session, always re-read here at request time. Drives hard company scoping (`docs/DECISIONS.md` #22): resolved into a `CompanyAccess` via `lib/auth/company-access.ts`. Null for `super_admin` (local-only role, no TMS company of its own — gets `{kind:"any"}` instead) and for anyone whose TMS account isn't linked to a company the planner knows about yet (login is blocked in that case, `NoCompanyAccessError`). |
| `deleted_at` | timestamptz, null | "Deactivate staff" (SPEC §7) — soft delete, same pattern as everywhere else (§2c). Independent of TMS: a deactivated row blocks login here even if the person's TMS account is fine, and every mutation endpoint's `requireRole` re-check does the same, so a still-live session can't outlast deactivation. |
| `deleted_by` | FK → `users`, null | |

### `booking_statuses`
Admin-managed catalogue of statuses (`docs/DECISIONS.md` #18) — **not** a fixed enum.
Seeded with the eight client-approved statuses in migration `0005`; schedulers with admin
access add/relabel/recolour/reorder/retire rows at `/admin/booking-statuses`.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `key` | text, unique | Stable slug a booking points at — `confirmed`, `weekend`, etc. Immutable once created. |
| `label` | text | Display label, editable |
| `color_bg` / `color_bar` / `color_text` / `color_border` | text | Hex colours for the chip render |
| `display_order` | int | |
| `editable` | bool | User-pickable in the drawer. `false` for calendar-derived statuses. |
| `calendar_derived` | bool | `true` for `weekend`/`bankholiday` — assigned by the app from the date, never user-set |
| `billable` | bool | Informational, mirrors TMS's own concept |
| `active` | bool | `false` hides it from the picker without breaking historical bookings |
| `deleted_at` | timestamptz, null | Soft delete |

### `bookings`
The core operational table.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `booking_ref` | text, unique, not null | Our own display handle, "FP-000123" — a single global, never-reset sequence (`booking_ref_seq`, `lib/db/booking-ref.ts`). Minted for every booking, local or TMS-imported, so nothing shown to a user lacks one. `docs/DECISIONS.md` #21 |
| `unit_id` | FK → `units` | Numeric surrogate key, not the registration |
| `company_id` | FK → `companies`, not null | Denormalised from the unit at write time (`docs/DECISIONS.md` #19) — makes the sheet query and the unit/date uniqueness index a single index hit |
| `modality_id` | FK → `modalities`, not null | Denormalised — which sheet this booking belongs to. Stamped and re-validated server-side against the unit's `unit_modalities` tags at save time, never trusted from the client |
| `date` | date | |
| `site_id` | FK → `sites` | |
| `status` | text, FK → `booking_statuses.key` | Free-text key into the admin-managed catalogue, not a fixed enum — SPEC §3, `docs/DECISIONS.md` #18 |
| `notes` | text, null | |
| `updated_at` | timestamptz, not null, default now() | Not in SPEC §2's table — added because §11's optimistic-lock reconciliation ("save is rejected if another user changed the same booking first") needs a column to compare against. See `docs/DECISIONS.md` #11. |
| `published_at` | timestamptz, null | Set on publish/lock — SPEC §2b. `publishBookings` refuses to publish a booking with an open `tms_conflict_at` |
| `published_by` | FK → `users`, null | |
| `created_by` / `updated_by` | FK → `users` | |
| `deleted_at` | timestamptz, null | Soft delete — SPEC §2c |
| `deleted_by` | FK → `users`, null | |
| `source` | text, not null, default `'planner'` | `'planner'` \| `'tms'` — where the row came from. `docs/DECISIONS.md` #21 |
| `tms_booking_id` | int, unique, null | TMS `bookings.id` — the import's upsert key. Null for a planner-created row |
| `tms_updated_at` | timestamptz, null | TMS's own `updated_at` as of the last time the import wrote this row — the import's "has TMS changed since we last looked" signal |
| `tms_imported_at` | timestamptz, null | When the import last wrote this row — compared against `updated_at` to detect a local edit since the last import |
| `tms_conflict_at` | timestamptz, null | Set when the import finds BOTH sides changed since the last import (the conflict rule). While set, the row is **frozen** — no import run touches it again until a scheduler clears it by editing (`lib/actions/bookings.ts`) or moving (`lib/actions/booking-moves.ts`) it. Rendered as a "⇄" badge on the grid cell |

> **Booking import's conflict rule is deliberately conservative** — see `docs/DECISIONS.md`
> #21 for two real bugs (a BST date-shift, and a conflict that didn't survive a second
> import run) found by actually running it against live data. The short version: a
> conflicted row is frozen until a human resolves it; nothing auto-clears it, and
> resolving it *must* reset `tms_imported_at` to the same instant as `updated_at`, not
> just clear the flag, or the next import can silently revert the resolution.

**Constraint:** `UNIQUE (unit_id, date) WHERE deleted_at IS NULL` — a Postgres partial
unique index. One *live* booking per unit per day; a soft-deleted booking doesn't block a
new one being created in its place.

> **Repositioning around this index (swaps & chained shifts).** Postgres enforces a
> unique index *per row* as an `UPDATE` scans — not against the statement's final state —
> and a *partial* index can't be made `DEFERRABLE`. So a one-shot `UPDATE … SET (unit_id,
> date) = …` that swaps two rows (or shifts a chain into occupied slots) collides
> mid-scan. `lib/actions/booking-moves.ts` therefore repositions in **two passes inside
> the transaction**: first park every moving row in a collision-free sentinel date range
> (`date + 365000` days, ~999 years out, nothing lives there) to vacate all originals,
> then place each row at its final slot — now guaranteed empty. `lib/actions/undo.ts`
> gets the same guarantee differently: it soft-deletes every touched row (removing them
> from the partial index) before restoring snapshots. Do **not** collapse either into a
> single `UPDATE` trusting "final-state" uniqueness — that guarantee does not exist here.

### `booking_events`
Append-only audit log. **Never soft-deleted or hard-deleted.**

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `actor_id` | FK → `users` | |
| `at` | timestamptz | |
| `action` | text | `create` \| `update` \| `delete` \| `move` \| `swap` \| `overwrite` \| `publish` \| `unpublish` |
| `batch_id` | uuid | Groups a multi-booking operation into one undoable step |
| `booking_before` | jsonb, null | Full row snapshot pre-change, plus an extra `unitRegistration` string |
| `booking_after` | jsonb, null | Full row snapshot post-change, plus an extra `unitRegistration` string |

Undo is implemented as: find the events for a `batch_id`, apply `booking_before` back
over the current row, write a new event recording the undo itself (so undo actions are
themselves auditable).

**`unitRegistration` enrichment.** Since `unit_id` became a numeric surrogate key
(`docs/DECISIONS.md` #19), every write site spreads an extra `unitRegistration` string
onto its snapshot(s) — via `getUnitRegistrations()` in `lib/db/unit-labels.ts` — so the
audit log can keep showing `"CT38"` instead of a bare id. `lib/db/admin-queries.ts`'s
`getAuditLog` reads `unitRegistration` first, falling back to the legacy `unitId` field for
events logged before this existed (those already hold a text registration directly). If
you add a new mutation path that writes `booking_events`, enrich its snapshot the same way.

### `user_role_events`
Append-only audit log for role changes — SPEC §7's "who made X an admin" requirement.
Separate from `booking_events`, which is specifically about bookings.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `actor_id` | FK → `users` | Who made the change (`super_admin` only — enforced server-side) |
| `target_user_id` | FK → `users` | Whose role changed |
| `old_role` / `new_role` | text | Same enum as `users.role` |
| `at` | timestamptz | |

### `tms_sync_runs`
Append-only log of every read-only TMS reference sync run (`lib/db/tms/sync.ts`,
`docs/DECISIONS.md` #20) — one row per run, whether triggered manually
(`/admin/tms-sync`) or by the external scheduler hitting `POST /api/tms-sync`. Never
edited after the fact.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `started_at` | timestamptz, not null, default now() | |
| `finished_at` | timestamptz, null | Null while `status = 'running'` |
| `status` | text | `running` \| `success` \| `error` |
| `error` | text, null | Set on failure — the transaction is rolled back, nothing partial is applied |
| `summary` | jsonb, null | `{ companies, units, sites: {added,updated,removed}, unitModalities: {added} }` |
| `triggered_by` | FK → `users`, null | Null for an automated (cron/webhook) run |

### `tms_booking_import_runs`
Append-only log of every TMS booking import run (`lib/db/tms/booking-import.ts`,
`docs/DECISIONS.md` #21) — same shape/purpose as `tms_sync_runs`, kept as its own table
since booking import is a materially higher-stakes operation (it touches live, possibly
scheduler-edited data) with a different summary shape.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `started_at` | timestamptz, not null, default now() | |
| `finished_at` | timestamptz, null | |
| `status` | text | `running` \| `success` \| `error` |
| `error` | text, null | |
| `summary` | jsonb, null | `{ created, refreshed, unchanged, removed, conflicts: [{unitRegistration,date,siteName,reason}], skipped: {reason: count} }` |
| `triggered_by` | FK → `users`, null | Null for an automated (cron/webhook) run |

## Migration & seeding

**Superseded as a source of truth by the TMS integration**
(`docs/TMS_INTEGRATION_PLAN.md` §8) — real units, locations, and bookings come from TMS,
not this workbook. The script below is kept runnable purely as a local-dev seeding
convenience; the description that follows is historical. Its bookings were soft-deleted
ahead of the first TMS booking import (`docs/DECISIONS.md` #21, client call — the Excel
data was only ever test data) so they don't collide with TMS's real confirmed bookings on
the same unit/date slots.

**v1 launch is CT-only** (SPEC §2d) — seed a single `modalities` row (`"CT"`) before
running the rest of the migration, and set it on every migrated unit. MRI/other
modalities are added later the same way: a new `modalities` row, then their own units and
specs — no schema change needed.

`data/migrate-from-excel.ts` parses the source workbook — run with `pnpm db:migrate-excel`
(idempotent: re-running skips units/specs/bookings that already exist). What it actually
does, confirmed against the real file (not the pre-implementation guess below the line):

- **Real column layout**: `CT FP`'s unit columns run D→AH (`CT15`→`CT45`, 31 units) — the
  header's own row 1 (richer, concatenated rich-text runs) is used for `units.description`;
  row 2 is a shorter duplicate and isn't used.
- **Real day-rows vs. a hidden summary block**: the sheet has a recurring "AVAILABLE IN
  MONTH / NOT AVAILABLE / RD / OR / EMPTY" block roughly once a month that reuses that
  month's first date as its row label — a plain "is column A a date" check doesn't exclude
  it. Real day-rows are identified by column B holding an actual `Mon`–`Sun` abbreviation;
  everything else is skipped.
- **Status decoded from fill colour**, with `weekend` decided by day-of-week (Sat/Sun)
  rather than colour — the sheet uses three different grey fills for it, two of which are
  Excel theme+tint colours with no RGB code. An explicit status colour (e.g. bidding-red)
  still overrides the weekend default. See `docs/DECISIONS.md` #10 for the full reasoning.
- `sites` from distinct cell text values, whitespace-normalised. Only the confirmed
  `"... – cancelled chargeable"` suffix is stripped into `status`/`notes` — every other
  dash-suffixed pattern found in the real data (`"– Canon PM"`, `"– 6 monthly"`,
  `"– unstaffed"`, `"– ENT"` (a department name, not a status)) is left in the site name,
  since stripping generically would destroy real information.
- **Duplicate date rows**: none were found in this particular export (730 distinct real
  dates, zero repeats) — SPEC's warning may describe an earlier version of the file. The
  "keep the fullest row" dedup logic is still implemented defensively for future re-exports.
- `CT inventory checklist` tab → `unit_specs`, **exact unit-ID match only**. The checklist
  and the planner grid disagree on naming in places (`RCT28`/`RCT29` vs. `CT28`/`CT29`) and
  the checklist has no column for `RCT22` or `CT35`–`CT45` — unmatched units get no specs
  rather than a guessed mapping, logged clearly by the script.
- A system user (`migration@system.quest.local`, role `admin`, random unusable password)
  is upserted to satisfy `bookings.created_by`/`updated_by` and `booking_events.actor_id`
  for migrated rows. Every inserted booking gets a matching `booking_events` row
  (`action: 'create'`) in the same transaction, all sharing one `batch_id` for the run.

The four fill colours SPEC §13 Q5 flagged as undocumented (`F8CBAD`, `B4C6E7`, `E2EFDA`,
`E08B8B`, plus a 5th found during the scan, `808080`) turned out to only ever appear in the
summary block above — they're excluded along with it, not mapped to a status. See
`docs/DECISIONS.md` #10.

## Query conventions

- **Always filter `deleted_at IS NULL`** on `modalities`, `units`, `sites`, `companies`,
  `bookings`, `booking_statuses`
  unless explicitly building an admin/audit view that needs to see soft-deleted rows.
  Prefer a Drizzle query helper/view that bakes this in over repeating the filter by hand
  at every call site.
- **Every write to `bookings` writes a matching `booking_events` row in the same
  transaction**, enriched with `unitRegistration` (see the `booking_events` section above).
  If you add a new mutation path, add its `action` value here and to `SPEC.md` §2 if it's a
  new kind of event.
- **No query filters by `company_id` yet**, even though `units`/`sites`/`bookings` all
  carry it — see the entity-overview note above. Don't add an ad hoc filter hardcoding the
  single seeded company; that scoping arrives properly with the TMS-derived permission
  model (`docs/TMS_INTEGRATION_PLAN.md` §7).
