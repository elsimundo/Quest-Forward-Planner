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
same way. Created on demand by the sync from TMS's own modality names (`ensureModality` in
`lib/db/tms/sync.ts`), *not* seeded by a migration — six exist today (`CT`, `Cardiac`,
`Cath Labs`, `MRI`, `Mammography`, `Endoscopy`). **v1 launch still exposes only CT in the
UI** (SPEC §2d); the rest simply exist as tags until a second sheet is switched on.

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
| `description` | text | Free-text detail line, shown as the grid column tooltip and included in unit search. **Currently null on every row** — it used to hold the Excel sheet's header text, which was cleared in the 2026-07-28 purge (`docs/DECISIONS.md` #27). Nothing writes it today; the sync doesn't set it. Candidate TMS sources when it's repopulated: `units.manufacturer` (54/147 InHealth units populated), `units.unit_type` (81), `units.notes` (80, holds real scanner models like "Canon, Aquillion Prime") |
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
Key/value capability data per unit — deliberately generic so each modality's spec sheet
(CT: cardiac, MAKO, insufflator; MRI: e.g. tesla strength, bore diameter — TBC with
client) fits without a schema change.

| Column | Type | Notes |
|---|---|---|
| `unit_id` | FK → `units` | Numeric surrogate key, not the registration |
| `key` | text | e.g. `cardiac`, `mako_approved`, `insufflator_model` |
| `value` | text | |

Drives the capability-matching warning (SPEC §2a).

> **⚠️ Empty, with no data source — the capability feature cannot currently fire.**
> Its only ever source was the workbook's "CT inventory checklist" tab, purged on
> 2026-07-28 (`docs/DECISIONS.md` #27). TMS has no equivalent: across all 147 live
> InHealth units, `requires_special_access` is 0 on every row, `special_access_details`
> is empty on every row, and `customer_unit_type_id` is null on every row — so a sync
> cannot fill this table either. There is also **no admin UI that writes `unit_specs`**
> (only `site_capability_requirements` has one). Both halves of the SPEC §2a check are
> therefore empty and the warning is dead code until the client decides where capability
> data should come from. Don't hand-seed it to make the feature look alive.

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
| `tms_pad_id` | int, unique, null | TMS `pads.id`, for a site representing a **pad** rather than a location (migration `0013`, `docs/TMS_WRITE_BACK.md` §6). **Dormant — null on every row**: TMS's `pads` table is empty and no booking in TMS, for any company, sets `pad_id`. Added at the client's request so the planner is ready for a company that adopts pads later. Mutually exclusive with `tms_location_id` (a site is one or the other, never both) — not enforced by a CHECK yet, deliberately, since there's no data on either side to validate such a rule against. Nothing populates it: the sync has no pad support, by design |
| `town` / `postcode` / `nominal_code` | text, null | From TMS; not collected for locally-created sites |
| `pending_review` | bool, default false | True when created via free-text, awaiting admin approval. Never set by the sync |
| `deleted_at` | timestamptz, null | Soft delete. Set by the sync when a linked site disappears from TMS |
| `tms_synced_at` | timestamptz, null | |
| `parent_site_id` | FK → `sites`, null | Pad grouping (migration `0011`, `docs/DECISIONS.md` #25). One level only, enforced in `lib/actions/admin/site-groups.ts` not the DB: a site is a plain standalone site, a group parent (no parent of its own), or a pad (has a parent, no children) — never more than one of these. Purely local; TMS has no concept of it and it never changes an existing booking's `site_id`. Managed at `/admin/site-groups` |

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
| `publishable` | bool, default false | May a booking in this status be forwarded to TMS? Migration `0012`, replacing the hardcoded `PUBLISHABLE_STATUS_KEYS` list at the client's request (`docs/TMS_WRITE_BACK.md` §3.3) so it's admin-editable. Seeded true for `confirmed`/`weekend`/`bankholiday` — exactly the old behaviour (`docs/DECISIONS.md` #24). **Defaults false**, so a newly created (or un-retired) status must be opted into publishing. Read by both the server gate (`lib/actions/publish.ts`) and the grid's own "Publish N" counts, from the same catalogue, so the two can't drift. `confirmed` can't be made unpublishable — it's the default status, so turning it off would leave nothing publishable at all |
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

> **`date` is a single day, and there is no duration.** A multi-day site visit is N rows,
> one per day — the index above is what makes that the only possible shape. Anything the UI
> calls a "run" (the contiguous same-site block a scheduler drags the edge of, see
> `docs/DECISIONS.md` #47) is a *rendering* of several rows, not a row with a span.
> "Extending a booking by three days" is therefore an INSERT of three rows, and shortening
> it is a soft-delete of some — which is why `createBookings` / `clearBookings`
> (`lib/actions/bookings.ts`) exist and why both take one `batch_id` for the whole gesture.
> If you find yourself reaching for an `end_date` column, this is the constraint to reckon
> with first: every read path, the overlay merge and the TMS import all assume one row per
> unit-day.

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
themselves auditable). It also returns the unit+date of every row it touched, read from the
rows *after* the restore, so the grid can scroll to what was reverted and flash it
(`docs/DECISIONS.md` #45).

> **The bulk write paths reuse the single-cell one.** `saveBooking`, `createBookings` (bulk
> booking and drag-to-extend) and the run-resize all write through one helper,
> `writeBookingAtSlot` in `lib/actions/bookings.ts`. The overlay rules it encodes are the
> reason: a write over a slot TMS holds but we have no row for must become an *amendment*
> carrying that `tms_booking_id`, and a previously-cleared TMS booking is a soft-deleted row
> still holding that id — which is UNIQUE — so re-booking that slot must revive the existing
> row rather than insert a second. A second copy of that would drift within a release. Its
> `expectedUpdatedAt` doubles as the caller's claim about what's there: `null` means "this
> cell was empty when I read it", so a row appearing since is a `CONFLICT`, never a silent
> overwrite.

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

**There is no seed script, and no spreadsheet.** All real data comes from TMS — companies,
units, and sites via the reference sync (`lib/db/tms/sync.ts`, `/admin/tms-sync`), bookings
via the import (`lib/db/tms/booking-import.ts`, `/admin/tms-booking-import`). To bring a
fresh database up: run `pnpm db:migrate`, create a user with `pnpm db:create-user`, then run
the sync followed by the import.

Nothing else needs hand-seeding:

- **`booking_statuses`** — the eight client-approved rows are seeded by migration `0005`
  (`docs/DECISIONS.md` #18). TMS does not own these; the app does.
- **`companies`** — the InHealth row is seeded by migration `0006`, then linked to TMS
  company 3 by the first sync run.
- **`modalities`** — *not* seeded by any migration. The sync creates each row on demand
  from TMS's own modality names (`ensureModality` in `lib/db/tms/sync.ts`), which is how
  the current six (`CT`, `Cardiac`, `Cath Labs`, `MRI`, `Mammography`, `Endoscopy`) got
  there. v1 launch is still CT-only in the UI (SPEC §2d); the others simply exist as tags.

### The Excel workbook is gone (2026-07-28)

The client's `CT_Forward_Planner_23012025.xlsx`, the `data/migrate-from-excel.ts` script,
the `pnpm db:migrate-excel` command, and the `exceljs` dependency were all **removed**, and
every row the migration ever wrote was **hard-deleted** from Postgres — the one deliberate
exception to this project's no-hard-delete rule (`docs/DECISIONS.md` #27). The client asked
for it directly: Excel-derived rows sitting alongside real TMS rows made it impossible to
tell which data was real, and the workbook had only ever been test data.

What was removed, for the record:

| Removed | Count |
|---|---|
| `bookings` (Excel migration + 1 manual test row) | 15,409 |
| `booking_events` for those bookings | 30,935 |
| `sites` never linked to a TMS location | 219 |
| `units` never linked to a TMS unit | 3 (`CT15`, `CT16`, `CT24`) |
| `unit_specs` (from the "CT inventory checklist" tab) | 138 |
| `units.description` values (sheet header text) | 28, nulled |
| The `migration@system.quest.local` system user | 1 |

`RCT22` was **kept** despite having no `tms_unit_id`: it carries live TMS-imported
bookings, so it is a genuine unit TMS simply never tagged — the exact case
`docs/DECISIONS.md` #24 warns about. Anything reasoning about "is this row real?" should
key off actual booking linkage, not the presence of `tms_unit_id` alone.

Two features lost their data source in this purge and are documented in place above:
`unit_specs` (capability matching — now unfillable, see the warning on that table) and
`units.description` (repopulatable from TMS, see that column's note).

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
