# TMS integration plan — v2 (decisions locked)

Written after a read-only survey of the TMS dev database (`questmedical_development_2023`)
and a round of client answers, 2026-07-27. This version supersedes v1 and the assumptions
in `TMS_COMPANY_UNIT_LOCATION_MODEL.md` (that file describes an older, simpler subset).

**One-line summary of what this app is, after the client round:** a *planning sandbox that
runs in parallel with TMS scheduling*. It reads InHealth's confirmed bookings out of TMS,
lets schedulers view and rearrange them (swap units, move sites, cover a broken scanner),
and later pushes accepted changes back into TMS scheduling via an API that **does not exist
yet**. TMS is the source of the booking data; TMS scheduling is the eventual destination.

---

## 1. Confirmed: the booking table *is* the sheet

You asked me to confirm I can see companies → units → locations → modalities in the TMS
`bookings` table. I can. One InHealth CT sheet is exactly this query:

```sql
SELECT b.id, u.registration AS unit, l.name AS location,
       b.first_day AS day, b.status, b.notes
FROM bookings b
JOIN units u            ON u.id = b.unit_id
JOIN unit_modalities um ON um.unit_id = u.id          -- unit → modality
JOIN modalities m       ON m.id = um.modality_id
JOIN locations l        ON l.id = b.location_id        -- booking → location
WHERE b.company_id = 3                                 -- InHealth, hard-scoped
  AND m.name = 'CT'                                    -- the tab
  AND b.deleted_at IS NULL;
```

- **Rows** = units (the CT-tagged ones — 28 today).
- **Columns** = days (`first_day`; every InHealth booking has `first_day = last_day`, so it's
  genuinely a per-day grid — 1,368 live rows, Mar–May 2026, 28 units, 84 distinct locations).
- **Cell** = the `location` the unit is at that day, plus status + notes.

Every field lines up:

| sheet element      | TMS source                                    |
| ------------------ | --------------------------------------------- |
| which company      | `bookings.company_id` (= 3, fixed)            |
| unit row           | `bookings.unit_id → units.registration`       |
| which sheet (tab)  | `unit_modalities` for that unit               |
| cell location      | `bookings.location_id → locations.name`        |
| day column         | `bookings.first_day` (= `last_day`)           |
| notes              | `bookings.notes`                              |
| status             | *not from TMS* — we own this (see §3)          |

So the sheet is not something we assemble from scattered tables — TMS already stores it in
one place. Good.

---

## 2. Locked decisions (your answers)

| # | Decision |
| - | -------- |
| **Company** | InHealth **company 3 only**. Never mix companies. Every query is scoped to 3, enforced **server-side**, and no user may see any other company's data. Not a picker. |
| **Modality** | The sheet switcher. One sheet is always exactly one modality — never mixed. Sourced from **`unit_modalities`** (the customer-facing unit↔modality m2m), *not* `unit_types`. |
| **Multi-modality units** | A unit **can carry more than one modality** (e.g. CT + MRI) and then appears as a row on *both* sheets. Our model must be many-to-many, matching TMS. |
| **`unit_types`** | Ignore. `customer_unit_types` will be used later but isn't populated yet. |
| **`units.location_id`** | Ignore — location comes from the **booking**, never the unit. Confirmed against the data: 1,368/1,368 InHealth bookings carry `location_id`; only 5/1,919 units carry one. |
| **Booking data** | Read from **TMS `bookings`** as the baseline. This runs in conjunction with scheduling; scheduling holds the confirmed bookings, we mirror them to plan against. |
| **Booking statuses** | **We own these in our own DB**, and they are **different** from TMS's. TMS's `booking_status` table is obsolete — do not read it. Only users with `enable_scheduling_access = 1` **and** `scheduling_permission_group = 'admin'` may manage them. |
| **Booking refs** | We generate **our own** booking reference scheme, independent of TMS's `BK:A…`. |
| **Tagging** | Quest is fixing `unit_modalities` in TMS now, so we can trust it as the modality source (don't build our own tagging). |
| **Publish → TMS** | Via a future **API request**, not yet built. Out of scope for phase 1. |
| **Reconcile to TMS** | Not needed. The Excel workbook was only ever an example; real units/locations/bookings come from TMS. |

---

## 3. Booking statuses — ours, admin-managed

TMS's per-company `booking_status` table is dead, and you want a different set anyway, so
statuses become **first-class editable data in our DB**, not the hardcoded `STATUSES` enum
that's in `lib/db/schema.ts` today.

```
booking_statuses (
  id            serial pk,
  name          text,          -- "Confirmed", "Bidding", …
  colour        text,          -- hex, drives the chip
  display_order int,
  billable      bool,          -- optional, mirrors a concept TMS had
  active        bool,
  deleted_at    timestamptz    -- soft delete, per CLAUDE.md
)
bookings.status  →  status_id int → booking_statuses.id
```

- **Seed** it with the eight current statuses from `lib/statuses.ts` (the client-approved
  mock-up palette) so nothing visual changes at launch.
- **`weekend` / `bankholiday` stay calendar-derived**, not user-set — keep that logic in
  `lib/statuses.ts`; it doesn't become editable data.
- **Management UI** lives on `/admin`, gated by a new server check:
  `enableSchedulingAccess === true && schedulingPermissionGroup === 'admin'`. This is a
  *TMS-derived* permission (see §7), distinct from the local `super_admin` who manages users.

This replaces `lib/db/schema.ts`'s `STATUSES` const and the `status` enum column. It's the
change that gets more expensive the longer the enum is baked into queries, so do it first.

---

## 4. Data model changes

### 4.1 Reference data becomes TMS-id-keyed

Today `units.id` *is* the registration (`"CT17"`) and companies/sites are keyed by name.
That breaks the moment TMS is the source. Move to surrogate keys + TMS ids:

```
units          id serial pk                     -- was: text = registration
             + tms_unit_id  int unique
             + registration text                 -- display ("CT17"); trim TMS whitespace
             + company_id   → companies.id        -- always 3 for now
               (drop the single modality_id — see 4.2)

sites (=locations)
             + tms_location_id int unique
             + company_id → companies.id  (NOT NULL)
             + town, postcode, nominal_code
             + parent_site_id → sites.id  null    -- pad support, see §5

companies    + tms_company_id int unique
```

`units.id` as a surrogate matters because registrations are only unique *within* a company
(TMS has `CT4` under InHealth and under Canon), and four InHealth registrations have
trailing whitespace (`"CT34 "`, `"CT36 "`, `"CT37 "`, `"CT38 "`). Keep `registration` as a
plain display column. This touches `bookings.unit_id` and every grid query — cheapest now
while it's one company's data.

### 4.2 Units ↔ modalities is many-to-many

Because a unit can be CT **and** MRI, drop `units.modality_id` and add a join table
mirroring TMS:

```
unit_modalities ( unit_id → units.id, modality_id → modalities.id, unique(unit_id,modality_id) )
```

A unit with two modality rows shows up on two sheets. The CT sheet's row set is
`units JOIN unit_modalities WHERE modality_id = CT`.

### 4.3 Bookings

```
bookings   (existing planner table — keep audit, soft-delete, optimistic lock)
         + company_id  → companies.id         -- denormalised (= 3); makes the grid query
         + modality_id → modalities.id         --   and the unit-per-day uniqueness index
                                               --   single-index, no joins
         + booking_ref text unique             -- OUR scheme, format decided below
         + tms_booking_id int null unique      -- which TMS booking this mirrors; null = planner-created
         + source text  -- 'tms' | 'planner'   -- where the row came from
         status: enum → status_id → booking_statuses (§3)
```

Why `company_id` + `modality_id` **on the row**: the one-live-booking-per-unit-per-day
index (`bookings_unit_date_live_unique`) and the sheet query both need them, and a
denormalised column keeps those a single index hit instead of a 3-table join on the hot
path. They're immutable copies of the unit's facts, set at write time.

`tms_booking_id` earns its place now even though write-back is phase-2: it's what makes a
future publish **idempotent** (update the mirrored TMS row rather than duplicate it) and
what lets a re-import know "I already have this one."

**Booking-ref format — DECIDED: `FP-000123`.** `FP` (forward planner) prefix so it's instantly
distinct from TMS's `BK:A…`; a single zero-padded global sequence, **no per-year reset** (a
reset would make refs ambiguous across years and needs collision handling for no user benefit).
It's monotonic, sortable, and short enough to read aloud on the phone — shown in the booking
drawer and on hover. One `bookings_ref_seq` sequence in Postgres backs it; the ref is minted
at insert for any planner-created row. TMS-imported rows keep their `tms_booking_id` as the
external key and get an `FP-` ref too, so every row the app shows has one consistent handle.

---

## 5. Pads — how to support both approaches

You flagged that some companies want pads *under* a location and some want each pad as its
own location. The data settles it for phase 1:

- **The TMS `pads` table is completely empty — 0 rows, every company.** Nobody uses it.
- **InHealth encodes the pad in the location name.** 34 of company 3's locations are
  pad-level: `Kent & Canterbury Hospital Pad 1` / `Pad 2`, `Queens Medical Centre, Pad 1–4`,
  `Lister Hospital Main Pad (General)` / `Lister Hospital PET Reloc Pad`, `Aberdeen Royal
  Infirmary pad 2`. Each is a separate `locations` row with its own `location_id`, and the
  bookings point straight at it.

So **phase 1 = "pad as its own site"**, for free — we import each TMS location as a site and
the pad-level ones just are sites. No pad handling needed to ship CT.

To keep the door open for the other approach without building it now, add the one nullable
column in §4.1: `sites.parent_site_id`. That lets an admin later group `… Pad 1` / `Pad 2`
under a parent `Kent & Canterbury Hospital`, or add pads to a site that doesn't have them —
and drives exactly the UX you described (*"when adding a location, if it has pads, ask which
one to use"*): if the chosen site has children, the cell editor asks which pad. Until an
admin creates a parent, every site is flat and behaves like today. **Recommendation: ship
flat, add the pad-grouping UI as a fast-follow, don't block CT on it.**

---

## 6. The sync (read-only, one direction)

A `lib/db/tms/` module under the same iron rule as `lib/db/mysql-auth.ts`: **every statement
is a `SELECT`.** Two things to pull, both scoped `WHERE company_id = 3`:

**A. Reference sync** (units, `unit_modalities`, locations, companies) — nightly cron + a
"Sync now" button on `/admin`. Upsert on the TMS id; if a TMS row is `deleted_at`,
soft-delete ours (never hard delete). Show the diff (added / updated / removed) so a
surprise mass-change is visible before it's applied.

**B. Booking import** (the new part vs v1) — bring TMS confirmed bookings into our
`bookings` table as `source = 'tms'`, keyed by `tms_booking_id`. This is the baseline
schedulers plan against.

The one real design question this raises: **what happens to a scheduler's un-published edit
when TMS changes underneath it?** **DECIDED: flag it as a clash** — reusing the optimistic-lock
machinery the app already has (`docs/DECISIONS.md` #11, #15):

- A re-import **never silently overwrites** a locally-edited row. If our copy of a
  `tms_booking_id` has local changes since last import, and TMS's version also changed, the
  row is flagged as a **conflict** and surfaced the same way clashes already are — the
  scheduler resolves it, TMS doesn't win automatically.
- TMS rows we haven't touched refresh freely.
- Planner-created rows (`tms_booking_id = null`) are ours until published.

Since there's **no write-back API in phase 1**, "publish" stays the existing lock-state
machine (SPEC §2b) — accepted changes are marked published/locked locally, ready for the
future API to drain. Nothing is pushed to TMS yet.

---

## 7. Permissions come from TMS scheduling fields — DECIDED

Your booking-status rule — *manageable only by `enable_scheduling_access = 1` and
`scheduling_permission_group = 'admin'`* — means planner permission is **TMS-derived**. This
refines `docs/DECISIONS.md` #17 ("identity from TMS, role stays local"): identity **and the
planner capability** now come from TMS; the local `role` column becomes a *cache* of the
derived tier plus one local-only elevation.

**Mapping, computed at every login** (TMS is the source of truth, re-read each sign-in so a
change in TMS takes effect on next login — no manual role admin for the common case):

| TMS user fields | derived local `role` | can |
| --- | --- | --- |
| `enable_scheduling_access = 0` | — | **no planner access** (sign-in rejected) |
| `= 1`, `scheduling_permission_group = 'read_only'` | `viewer` | view sheets only |
| `= 1`, `scheduling_permission_group = 'admin'` | `scheduler` (+status mgmt) | edit bookings, publish, **manage `booking_statuses`** |

**`super_admin` stays local-only** — it is *app* administration (managing app users, seeing
the audit log, the reconciliation/pad tools), which TMS has no concept of. It's granted
inside the app, not derived from TMS, and it's the bootstrap account. A `super_admin` also
has everything a `scheduler` has.

Implementation notes:
- `verifyCredentials` already returns the TMS user; extend it to read `enableSchedulingAccess`
  + `schedulingPermissionGroup` (both already selected in `lib/db/mysql-auth.ts`) and set/refresh
  the local `role` from the table above on each successful login.
- Reject login when `enable_scheduling_access = 0` with a clear "no scheduling access" message,
  distinct from bad-credentials.
- Status-management endpoints re-check `role === 'scheduler' || 'super_admin'` server-side —
  UI gating is not the boundary (CLAUDE.md).
- The old local four-tier `admin` tier collapses into `scheduler` for scheduling purposes;
  keep the enum value to avoid a data migration, just stop deriving it from TMS.

Today only **11 TMS users** have `enable_scheduling_access = 1` (10 InHealth admins + 1 Quest
Power), so `viewer` (read-only) is the common tier.

---

## 8. What this changes about the current build

- **The Excel migration (`data/migrate-from-excel.ts`) is superseded.** Its 219 sites and
  15,408 bookings were scaffolding; real data comes from the TMS sync (§6). Keep the script
  for reference / local seeding, but it's no longer the source.
- **`STATUSES` enum → `booking_statuses` table** (§3). Biggest single edit.
- **`units.id` text→serial, `modality_id`→`unit_modalities` join** (§4.1, §4.2).
- **`company_id` / `modality_id` / `booking_ref` / `tms_booking_id` on `bookings`** (§4.3).
- **No cross-company anything** — a hard `company_id = 3` filter in every query and server
  action, treated as a security boundary, not a convenience (CLAUDE.md: permissions are
  server-side always).

---

## 9. Suggested build order

1. ✅ **Booking statuses as admin-managed data** (§3) — self-contained, unblocks the
   modality-generic direction, most expensive to defer. `docs/DECISIONS.md` #18.
2. ✅ **Surrogate `units.id` + `company_id` on units/sites/bookings + `unit_modalities` m2m**
   (§4). Breaking and mechanical — do it while it's one company's data.
   `docs/DECISIONS.md` #19.
3. ✅ **Read-only reference sync** with the admin diff view (§6A) — `lib/db/tms/sync.ts`,
   `/admin/tms-sync`, `POST /api/tms-sync` for an external scheduler. `docs/DECISIONS.md`
   #20. **Open ops step**: point an actual scheduler (Coolify scheduled task, k8s CronJob,
   or an external pinger) at `/api/tms-sync` nightly with `TMS_SYNC_CRON_SECRET` — that
   wiring is a deployment decision, not something built into the app.
4. ✅ **TMS booking import + conflict rule** (§6B) — the baseline schedulers plan against.
   `lib/db/tms/booking-import.ts`, `/admin/tms-bookings`, `POST /api/tms-booking-import`.
   `docs/DECISIONS.md` #21. Own `booking_ref`/`source`/`tms_booking_id` columns landed here
   (not deferred further). The Excel-migration bookings were soft-deleted first (client
   call — test data, not needed now TMS access exists) so they don't collide with TMS's
   real bookings.
5. ✅ **Modality tab strip + hard company scoping** (§2) wired to real synced data. The
   modality pills previously updated client state only — `app/(planner)/page.tsx` fetched
   one modality's data server-side and never re-fetched on pill click, so switching
   modalities didn't change what the grid showed. Fixed by making both modality and company
   URL-driven (`?modality=`, `?company=`) so the server always renders what's actually
   selected. Company scoping is now enforced server-side on every query and mutation, never
   trusted from the client — `lib/auth/company-access.ts`, `docs/DECISIONS.md` #22.
   `super_admin` gets an "any company" picker (only rendered when there's more than one
   company to choose between); every other role is hard-locked to the one company their own
   TMS `company_id` resolves to. Verified against real synced data: MRI/Mammography/
   Cardiac/Cath Labs/Endoscopy sheets correctly render their units with zero bookings — TMS
   itself has all 1,368 of InHealth's current bookings on CT units only, confirmed directly
   against TMS's MySQL `bookings` table, so the empty non-CT sheets are real, not a bug.
6. **Pad grouping UI** (§5) — fast-follow, non-blocking.
7. **Publish → TMS API** (§2, phase 2) — once Quest ships the endpoint.

Steps 1–5 are done. 6–7 follow.

---

## 10. Resolved (2026-07-27)

All four confirmed with the client:

1. **Permission mapping (§7)** — **adopted.** TMS-derived tiers: `enable_scheduling_access=0`
   → no access; `read_only` → `viewer`; `admin` → `scheduler` + status management. Local
   `super_admin` stays app-only. Role is refreshed from TMS on each login. Overrides part of
   `docs/DECISIONS.md` #17 — add a new decision entry noting the supersession.
2. **Booking-import conflict rule (§6B)** — **flag as a clash.** A TMS re-import never
   silently overwrites an unpublished local edit; the row surfaces in the existing clash UI
   for the scheduler to resolve.
3. **Booking-ref format (§4.3)** — **`FP-000123`**, single global zero-padded sequence, no
   per-year reset.
4. **Sync cadence (§6A)** — **nightly cron + manual "Sync now" button** on `/admin`.

Next: log a `docs/DECISIONS.md` entry for the #17 supersession (item 1), then start the
build order in §9 at step 1 (booking statuses as admin-managed data).

---

## 11. Multi-company support for super_admin (2026-07-27)

Client clarified (2026-07-27): "clients should never mix" is correct and unchanged — every
non-super_admin role stays hard-locked to exactly one company, enforced server-side
(`docs/DECISIONS.md` #22). But `super_admin` needs to actually be able to switch and view
each company individually, never a blended view — client's own words: "a super admin can
view any company... they will only see the compan[y's] stuff they are viewing at the
time... never a mix of the two."

Until now only InHealth (TMS `company_id` 3) was synced — `TMS_INHEALTH_COMPANY_ID` was
hardcoded throughout `lib/db/tms/{queries,sync,booking-import}.ts`. The `CompanyAccess`
permission model built in step 5 already supported this (`super_admin` = `{kind:"any"}`),
but there was nothing else for a super_admin to switch to — making it real meant
generalizing TMS sync beyond one company, done below.

**Resolved (2026-07-27) — which companies to sync:** `companies.enable_scheduling = 1`,
client-confirmed directly ("only companies with scheduling enabled... this may only be
InHealth at the moment but there will be more"), even though today that only returns 2 —
InHealth (id 3) and "Quest Power" (id 150) — and doesn't include the client's own example,
"Alliance Medical RG" (TMS id 59, `enable_scheduling = 0`). Built and verified for real
(`docs/DECISIONS.md` #23): `listSchedulingEnabledTmsCompanies()` in
`lib/db/tms/queries.ts`; `runTmsSync`/`runTmsBookingImport` loop over every company it
returns. Ran live against InHealth + Quest Power: 1 new company linked, 25 units + 52 sites
added, including two real same-name-different-company collisions ("LCS Tesco Harrow", "LCS
Asda Slough (C&S)") that resolved into two distinct site rows correctly rather than
crashing — which only worked because `sites.name`'s uniqueness had to be fixed from global
to per-company first (migration `0010`; it was the one place company-scoping had been
missed, since it never mattered while only one company existed). Booking import correctly
found nothing new to bring in for Quest Power — its one TMS booking spans 2026-06-01 to
2026-06-03, and the multi-day-booking guard (this app is one-booking-per-day) already
skips it, same as it always would have for InHealth.

Manually triggering sync/import (and viewing run history) is now **`super_admin`-only** —
a run now touches every scheduling-enabled company in one go, so a company-scoped `admin`
triggering it, or reading its cross-company counts, would exceed their own boundary. Moved
off the shared admin nav into the `super_admin`-only section
(`app/admin/layout.tsx`).

Also closed while this was being wired up: several admin read-queries
(`getPendingSites`, `searchApprovedSites`, `getAllSitesBasic`, `getAuditLog`,
`lib/db/admin-queries.ts`) had no company filter at all — invisible while there was only
one company, a real leak (other companies' site names, audit history) once a second one
existed. All four now take `companyId: number | null` (`null` = every company, valid only
for `super_admin`). `saveBooking`'s site resolution (`lib/actions/bookings.ts`) had the
same gap on both its "existing site by id" and free-text lookup paths — fixed the same way.

---

## 12. Client feedback backlog (2026-07-27, meeting notes via David Emerson)

Secondhand meeting notes relayed by a team member, not yet a spec — triaged against the
current build before any of this is scheduled.

**Already done, no work needed:**
- Separate FP per modality — step 5's modality tab strip (§9).
- Undo — `lib/actions/undo.ts`.
- Easy click-and-drag of multiple bookings — "Select" mode + batch drag,
  `components/planner/planner-grid.tsx`.

**Scoped and ready to build:**
- **Only `confirmed` bookings can be published to the live schedule** — anything "in
  discussion" (bidding, tbc, etc.) must not be publishable. `publishBookings` currently has
  no status gate at all (`lib/actions/publish.ts`). Likely list: `confirmed` plus the two
  calendar-derived confirmed-adjacent statuses (`weekend`, `bankholiday`) — to be confirmed
  before building, since it's a live workflow restriction.
- **Red days retained for historic reporting, never deleted** — already true structurally
  (nothing hard-deletes, `docs/DECISIONS.md`); this is a design constraint for the
  utilisation report below, not standalone work.

**New features needing a design decision before building:**
- **"Nearest unit" suggestion when swapping** — no distance/geocoding data exists yet;
  needs a definition of "nearest" (site-to-site distance? last unit used at that site?
  something else).
- **MRI availability column, 3 scanner sub-types** — CT's single "available units" count
  doesn't generalize to MRI's multiple scanner sub-types; needs a sub-type field on units
  the schema doesn't have yet.
- **Email + red-box alert on a schedule conflict** — the in-app "red box" half already
  exists (TMS import conflicts, `docs/DECISIONS.md` #21). Email is new. **Deferred per the
  client's own instruction** ("we can wire up brevo later") — Brevo is the intended
  provider but isn't integrated into the app at all yet.
- **Site/location booking history** — client's own framing: "nice to have," lower priority.
- **Utilisation report** — doesn't exist yet as a feature; the red-days-retention and
  month-end-red-column-exclusion notes are scoping details for this report, not separate
  tasks.

**Needs clarification because it's flagged critical:**
- **"Horizontal view — key thing!"** — today's grid already runs units across the top,
  dates down the side. Need to confirm with the client what "horizontal" means here before
  guessing at a redesign (e.g. the opposite orientation — units down the side, dates across
  the top, like a classic Gantt chart — vs. something else about the current layout).
