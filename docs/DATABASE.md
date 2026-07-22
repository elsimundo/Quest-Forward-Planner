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
App-local, even once TMS provides credentials (SPEC §1, `DECISIONS.md` #4).

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `name` | text | |
| `email` | text, unique | |
| `password_hash` | text | Not in SPEC §2's table — added because the Credentials provider needs something to verify against today. Becomes unused (but not dropped — old sessions/history may still reference the row) once/if the verify-credentials function is repointed at TMS. |
| `role` | text | `viewer` \| `scheduler` \| `admin` \| `super_admin` — SPEC §7 |
| `tms_synced_at` | timestamptz, null | Set only if TMS becomes the identity source |

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
| `published_at` | timestamptz, null | Set on publish/lock — SPEC §2b |
| `published_by` | FK → `users`, null | |
| `created_by` / `updated_by` | FK → `users` | |
| `deleted_at` | timestamptz, null | Soft delete — SPEC §2c |
| `deleted_by` | FK → `users`, null | |

**Constraint:** `UNIQUE (unit_id, date) WHERE deleted_at IS NULL` — a Postgres partial
unique index. One *live* booking per unit per day; a soft-deleted booking doesn't block a
new one being created in its place.

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

## Migration & seeding

**v1 launch is CT-only** (SPEC §2d) — seed a single `modalities` row (`"CT"`) before
running the rest of the migration, and set it on every migrated unit. MRI/other
modalities are added later the same way: a new `modalities` row, then their own units and
specs — no schema change needed.

One-off script (keep in `data/migrate-from-excel.ts` or similar) parses the source
workbook:

- `CT FP` tab → `units` from the header row; `bookings` from non-empty cells, with
  `status` decoded from Excel cell fill colour per the mapping in `SPEC.md` §3.
- `sites` from distinct cell text values — **the source data is messy**: inconsistent
  whitespace, and status text embedded in the site name itself (e.g. `"SW - CDC- West
  Swindon - cancelled chargeable"` needs the `" - cancelled chargeable"` suffix stripped
  into `status`/`notes`, not left in the site name).
- **Duplicate date rows**: the source sheet contains repeated rows for the same date
  (confirmed during analysis — e.g. multiple `2025-02-01` rows). Keep the row with the
  most populated cells per date, discard the rest.
- `CT inventory checklist` tab → `unit_specs`.
- The four fill colours found in the data that aren't in the client's documented legend
  (`F8CBAD`, `B4C6E7`, `E2EFDA`, `E08B8B`) need a client-confirmed mapping before this
  script is finalised — see `SPEC.md` §13 Q5. Don't guess a mapping and ship it silently.

Run `pnpm db:seed` locally to load migrated data into a dev database once the script
exists.

## Query conventions

- **Always filter `deleted_at IS NULL`** on `modalities`, `units`, `sites`, `companies`,
  `bookings`
  unless explicitly building an admin/audit view that needs to see soft-deleted rows.
  Prefer a Drizzle query helper/view that bakes this in over repeating the filter by hand
  at every call site.
- **Every write to `bookings` writes a matching `booking_events` row in the same
  transaction.** If you add a new mutation path, add its `action` value here and to
  `SPEC.md` §2 if it's a new kind of event.
