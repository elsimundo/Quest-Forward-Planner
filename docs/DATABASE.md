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
modalities ──► units ──┐
                        │
companies ──┐           │
            │           │
            ▼           ▼
          sites ──────► bookings ◄────── users
            │              │                │
            ▼              ▼                ▼
   unit_specs +      booking_events   (role: viewer|scheduler|admin|super_admin)
   site_capability_
   requirements
```

- A **booking** is the join of a unit, a date, and a site, with a status and a
  publish/lock state.
- **`booking_events`** is append-only and never soft-deleted itself — it's the audit
  trail for everything else.
- **`modalities` / `units` / `sites` / `companies`** are reference data, ultimately
  mirrored from TMS (§13.1) — treat them as read-mostly once that sync exists.
- **This app plans multiple fleets (CT, MRI, others)** — see SPEC §2d. `units` is scoped
  to a modality; everything downstream of a unit (bookings, specs) inherits that scope
  automatically since it's keyed off `unit_id`. Only CT is populated at launch.

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
| `id` | text, PK | Matches TMS id once synced (e.g. `"CT15"`) |
| `modality_id` | FK → `modalities` | Which fleet this unit belongs to |
| `display_order` | int | Column order in the grid, within its modality |
| `description` | text | Full spec line from the source sheet header |
| `active` | bool | |
| `deleted_at` | timestamptz, null | Soft delete — SPEC §2c |
| `tms_synced_at` | timestamptz, null | Set once TMS read-sync exists |

### `unit_specs`
Reference data, from the modality's own inventory-checklist source tab. Key/value per
unit — deliberately generic so each modality's spec sheet (CT: cardiac, MAKO,
insufflator; MRI: e.g. tesla strength, bore diameter — TBC with client) fits without a
schema change.

| Column | Type | Notes |
|---|---|---|
| `unit_id` | FK → `units` | |
| `key` | text | e.g. `cardiac`, `mako_approved`, `insufflator_model` |
| `value` | text | |

Drives the capability-matching warning (SPEC §2a).

### `companies`
Reference data. NHS Trusts, Ramsay, Circle, Spire, Healthshare, medneo, etc.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `name` | text, unique | |
| `tms_synced_at` | timestamptz, null | |

### `sites`
Reference data, but with one exception: schedulers can create new sites via free-text in
the booking drawer (flows into `pending_review`). Shared across modalities — the same
hospital can appear in both the CT and MRI grids (confirm with client, SPEC §13 Q6).

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `name` | text, unique | |
| `kind` | text, null | hospital \| LHC \| CDC \| yard \| other — taxonomy TBD, SPEC §13 Q7 |
| `company_id` | FK → `companies`, null | |
| `pending_review` | bool, default false | True when created via free-text, awaiting admin approval |
| `deleted_at` | timestamptz, null | Soft delete |
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
| `deleted_at` | timestamptz, null | "Deactivate staff" (SPEC §7) — soft delete, same pattern as everywhere else (§2c). Independent of TMS: a deactivated row blocks login here even if the person's TMS account is fine, and every mutation endpoint's `requireRole` re-check does the same, so a still-live session can't outlast deactivation. |
| `deleted_by` | FK → `users`, null | |

### `bookings`
The core operational table.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `unit_id` | FK → `units` | |
| `date` | date | |
| `site_id` | FK → `sites` | |
| `status` | text | `confirmed` \| `weekend` \| `likely` \| `bidding` \| `service` \| `tbc` \| `cancelled` \| `bankholiday` — SPEC §3 |
| `notes` | text, null | |
| `updated_at` | timestamptz, not null, default now() | Not in SPEC §2's table — added because §11's optimistic-lock reconciliation ("save is rejected if another user changed the same booking first") needs a column to compare against. See `docs/DECISIONS.md` #11. |
| `published_at` | timestamptz, null | Set on publish/lock — SPEC §2b |
| `published_by` | FK → `users`, null | |
| `created_by` / `updated_by` | FK → `users` | |
| `deleted_at` | timestamptz, null | Soft delete — SPEC §2c |
| `deleted_by` | FK → `users`, null | |

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
| `booking_before` | jsonb, null | Full row snapshot pre-change |
| `booking_after` | jsonb, null | Full row snapshot post-change |

Undo is implemented as: find the events for a `batch_id`, apply `booking_before` back
over the current row, write a new event recording the undo itself (so undo actions are
themselves auditable).

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

## Migration & seeding

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
  `bookings`
  unless explicitly building an admin/audit view that needs to see soft-deleted rows.
  Prefer a Drizzle query helper/view that bakes this in over repeating the filter by hand
  at every call site.
- **Every write to `bookings` writes a matching `booking_events` row in the same
  transaction.** If you add a new mutation path, add its `action` value here and to
  `SPEC.md` §2 if it's a new kind of event.
