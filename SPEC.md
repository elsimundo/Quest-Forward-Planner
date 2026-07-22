# Quest — CT Forward Planner · Functional Specification

**Purpose:** Replace the client's Excel "CT Forward Planner" workbook with a web app for
assigning mobile CT scanner units to site locations on specific days. The UI mimics the
spreadsheet's mental model (dates as rows, units as columns, colour-coded statuses) while
adding proper interactions, validation, history, and multi-user safety.

**Reference implementation:** `quest-ct-forward-planner.jsx` — a working single-file React
mock-up, approved by the team. Treat it as the source of truth for layout, interaction
behaviour, and visual styling. This document is the source of truth for scope and data.

**Source data:** `CT_Forward_Planner_23012025__1_.xlsx` — the client's live workbook.
Relevant tabs: `CT FP` (the planner grid, one row per day from Jan 2025, one column per
unit), `FP Key color coding` (status legend), `CT inventory checklist` (per-unit equipment
specs). A migration script must import this (see §13).

---

## 1. Stack

- **Next.js** (App Router) + **React**, **TypeScript**.
- **shadcn/ui** components, themed with the Quest Medical design system (§9).
- **PostgreSQL** — recommended over Mongo. The domain is relational (units ↔ bookings ↔
  sites), needs a uniqueness constraint per unit-day, and benefits from transactional
  swaps, `LISTEN/NOTIFY` for live updates, and an append-only audit log — all of which
  Mongo would require hand-rolling. **Drizzle** as the ORM (SQL-close, plays well with
  raw Postgres features like `LISTEN/NOTIFY`).
- **Auth.js** (self-hosted), `Credentials` provider, structured so the login-verification
  step is a single swappable function:
  - **Now**: checks against a local `users` table, seeded manually for the pilot team.
  - **Later**: once TMS read-access (below) is wired up, that same function looks up TMS
    instead — sessions, route protection, and the rest of Auth.js don't change.
  - **Roles are always local**, regardless of credential source — TMS has no concept of
    `viewer` / `scheduler` / `admin` / `super_admin`, so role assignment stays a
    Quest-app-specific field on `users` (see §7 for the tier split).
- **Live updates**: simple polling (~10s refetch) for v1 — fastest to ship, and the data
  model doesn't change if this is later upgraded to WebSockets or Postgres `LISTEN/NOTIFY`
  push once multi-scheduler contention is actually a problem worth solving.
- **Deploy**: Docker image on **Coolify**, package manager **pnpm**. Postgres can be
  Coolify's one-click database service.
  - **Environment/secrets**: local `.env` for dev (git-ignored, `.env.example` committed
    as the template); values copied into **Coolify's env var UI** for staging and
    production — never committed, never baked into the Docker image. Applies to DB
    credentials and the future TMS connection string alike.
  - **Backups**: confirm Coolify's Postgres backup schedule and retention **before real
    scheduling data goes in** — this app becomes the live source of truth for the fleet,
    so "restore to yesterday" needs to actually be possible. Combined with soft deletes
    (§2c) and the `booking_events` audit log, this gives three independent layers of
    protection against data loss: app-level undo, query-level soft delete, and
    infra-level backup restore.
  - **Domain**: not yet decided. `NEXTAUTH_URL` and cookie config should be read from an
    env var, not hardcoded, so the domain can be set per-environment (or changed later)
    without a code change.
- **TMS**: Quest's existing SQL system of record for units, sites, companies and users.
  Two integration points, both **deferred to a later phase** (§13) but designed for now:
  1. **Read** — TMS is the source of truth for reference data; the planner should treat
     its own `units`/`sites`/`companies` tables as a **synced mirror**, not the master.
  2. **Write** — once a booking is published/locked in the planner, it needs to reach
     "another system within TMS" (the client's words) that runs day-to-day scheduling.
     Mechanism (API push, scheduled sync, or export) is **not yet decided by the client**
     — flagged as an open question (§13.1).

## 2. Data model

This app plans more than CT — the client runs the same day × unit grid for MRI and other
modalities too, on separate but structurally identical sheets. The schema below is
**modality-generic from day one**: adding MRI or another fleet later is a data/admin
task (seed a new `modalities` row and its units), not a schema change or a rebuild. Only
CT is populated at launch — see §2d.

```
-- ── Reference data — mirrored from TMS (read-only sync once integration exists;
--    hand-seeded from the migration script until then). Never edited directly by
--    planner users except `sites` free-text creation (flagged for admin review).
modalities
  id serial pk, name text unique    -- "CT", "MRI", "X-Ray", … — the fleets this planner covers
  display_order int
  deleted_at timestamptz null       -- soft delete — see §2c

units
  id            text pk          -- "CT15", "RCT22", "CT45", or an MRI/other equivalent
  modality_id   fk -> modalities -- which fleet this unit belongs to
  display_order int
  description   text             -- full spec line from the sheet header
  active        bool
  deleted_at    timestamptz null  -- soft delete — see §2c
  tms_synced_at timestamptz null

unit_specs                        -- from the modality's inventory checklist tab
  unit_id fk, key text, value text   -- CT: lead_roof, cardiac, insufflator_model, injector…
                                      -- MRI (example, TBC with client): tesla_strength,
                                      -- bore_diameter, coil_types… — arbitrary key/value by
                                      -- design so each modality's spec sheet fits without a
                                      -- schema change (drives §2a matching)

companies
  id serial pk, name text unique   -- NHS Trusts, Ramsay, Circle, Spire, Healthshare, medneo…
  tms_synced_at timestamptz null

sites
  id serial pk
  name text unique                 -- "Norfolk & Norwich", "LHC Asda Wallington", …
  kind text null                   -- hospital | LHC | CDC | yard | other (client to confirm)
  company_id fk -> companies null
  tms_synced_at timestamptz null
  pending_review bool default false     -- true when created via free-text in the drawer
  deleted_at timestamptz null           -- soft delete — see §2c

site_capability_requirements       -- generalized §2a capability matching, one row per
                                    -- requirement rather than fixed CT-specific columns —
                                    -- same key/value pattern as unit_specs so it extends
                                    -- to any modality's own set of capabilities
  site_id fk -> sites
  requirement_key text              -- CT example: "cardiac" | "mako" | "insufflator"
                                     -- MRI example (TBC): "high_tesla" | "wide_bore"
  required bool default true

users
  id, name, email, role text       -- viewer | scheduler | admin | super_admin  (§7)
  tms_synced_at timestamptz null   -- if TMS ends up being the identity source

-- ── Planner data — owned by this app
bookings
  id serial pk
  unit_id fk -> units
  date date
  site_id fk -> sites
  status text                      -- see §3
  notes text null
  published_at timestamptz null    -- set when locked/forwarded — see §2b
  published_by fk -> users null
  created_by / updated_by fk -> users
  deleted_at timestamptz null      -- soft delete — see §2c. NULL = live.
  deleted_by fk -> users null
  UNIQUE (unit_id, date) WHERE deleted_at IS NULL   -- one *live* booking per unit per day
                                                     -- (see open question §13.2)

booking_events                     -- append-only audit log; powers undo + accountability
  id serial pk
  actor_id fk, at timestamptz
  action text                      -- create | update | delete | move | swap | overwrite |
                                    -- publish | unpublish
  batch_id uuid                    -- groups multi-booking operations into one undoable step
  booking_before jsonb null
  booking_after  jsonb null
```

Derived, never stored: **availability per day** = count of active units with no booking
(bookings with status `bidding` count as available — a bid is not a commitment; confirm
with client, §13.2).

### 2a. Capability matching

When a site has any row in `site_capability_requirements` and the selected unit's
`unit_specs` don't satisfy it, the drawer shows a **non-blocking warning**, not a hard
stop — e.g. "⚠ Norfolk & Norwich requires cardiac-enabled — CT23 is not." Scheduling is
still allowed (there may be a valid reason: a temporary fallback, client override), but:
- the warning is logged in `booking_events` metadata so it's auditable,
- the cell in the grid gets a small warning indicator (icon, not a colour change — colour
  is already spoken for by status) so mismatches are visible without opening every cell.

Requirements are set on the **admin page** (§7), scoped per site, not inferred
automatically. Client to confirm which capabilities actually gate site choice per
modality — CT's starting list (cardiac, MAKO, insufflator) is a guess from the inventory
sheet; MRI/other modalities will have their own set once those inventory sheets are
reviewed (§2d).

### 2b. Publish / lock lifecycle

This is a **forward planner** — bookings are worked on in draft, then locked and sent to
the downstream TMS scheduling system for day-to-day operational use. That downstream
handoff is the point past which the planner should stop being the editable source of truth
for a date.

- A booking is **unpublished** (editable freely) until a scheduler explicitly publishes it.
- **Publishing locks the booking**: `published_at`/`published_by` are set, and further
  edits are blocked in the UI for `scheduler` role.
- **`admin` role can unlock** a published booking (single action, clearly destructive
  styling, requires confirmation) — this is the safety valve for "TMS already has the old
  version, we need to fix a mistake." Unlocking clears `published_at` and logs an
  `unpublish` event; it does **not** by itself notify TMS — that's a separate concern once
  the write-integration (§13.1) exists.
- **Visual treatment**: published bookings get a small lock glyph on the chip and a
  slightly desaturated look (not a 9th status colour — status and publish-state are
  orthogonal: a booking can be `confirmed` and published, or `confirmed` and still draft).
- **Publish action, unit of work**: publish by **selecting a range of bookings** (reuse
  the existing multi-select — Shift-click/Ctrl-click/Select-mode already select sets of
  bookings) and choosing "Publish selected" from the selection bar, alongside a
  **"Publish all in visible date range"** shortcut for the common case of forwarding a
  whole week/fortnight at once. This reuses machinery already in the mock-up rather than
  inventing a new selection model — flag to client for confirmation once TMS scope is
  defined (§13.1).
- Drag-and-drop of a published/locked booking is blocked (can't accidentally move
  something already sent downstream); the clash dialog and undo still apply freely to
  unpublished bookings.

### 2c. Soft deletes — no data is ever hard-deleted

This is the source of truth for a live operational schedule, so nothing a user does in
the app should be able to permanently destroy a record:

- **"Clear" (§5) and "Overwrite" (§8) are soft deletes**: the row gets `deleted_at` /
  `deleted_by` set, not an actual `DELETE`. The unique constraint on `bookings` is scoped
  to `WHERE deleted_at IS NULL`, so a cleared slot can be rebooked normally.
- **Every query the app runs filters `deleted_at IS NULL`** by default — soft-deleted
  rows are invisible in the grid, search, and availability counts, exactly as if they
  were gone.
- **Undo still works across a soft delete**: undoing a "clear" simply clears
  `deleted_at` again — same `booking_events` batch mechanism as every other action, no
  special case needed.
- Applies to reference data too (`units`, `sites`, `companies`) — retiring a unit or
  merging a duplicate site never removes history that points at it; old bookings keep
  referencing a real (if soft-deleted) row instead of a dangling or nulled foreign key.
- **`booking_events` itself is never deleted, ever** — it's the audit trail; soft-delete
  logic doesn't apply to it because there's nothing to "undo" about a log entry.
- Nothing in the app UI ever offers a hard/permanent delete. If Quest genuinely needs to
  purge data (e.g. GDPR erasure request), that's a deliberate, logged, database-level
  operation outside the app — not a button anyone can click.

### 2d. Multi-modality architecture

The client runs the same forward-planner pattern across multiple fleets — CT is the
first one built, but MRI and others use an **identical sheet structure**: dates as rows,
units as columns, the same 8-status colour key. This spec and schema are written so that
adding a modality later is a **data task, not a rebuild**:

- **One unified app**, not separate planner instances per modality. One login, one
  admin page, one role system, one audit log — a scheduler who books both CT and MRI
  units shouldn't need two accounts or two tools. (Reasoning parallels §7's role
  design: shared infrastructure, scoped access, not duplicated systems.)
- **Modality switcher** in the grid toolbar (tab pills, e.g. "CT · MRI") — switching
  filters which units populate the grid's columns. The date rows, drawer, multi-select,
  drag-and-drop, clash resolution, undo/redo, and publish workflow are all **identical
  behaviour regardless of modality** — none of that logic is CT-specific, it's all keyed
  off `unit_id`/`date`, which already generalizes.
- **Capability matching generalizes** via `site_capability_requirements` (§2, §2a) rather
  than the CT-specific boolean columns an earlier draft of this spec had — each
  modality's own set of relevant capabilities (CT: cardiac/MAKO/insufflator; MRI: likely
  tesla strength/bore size/coil type, TBC with client) fits without a schema change.
- **v1 launch scope is still CT-only** — building the architecture modality-generic now
  costs almost nothing (a few extra columns and one join table) versus retrofitting it
  after CT-specific assumptions (like the old `requires_cardiac` columns) get baked into
  more of the codebase. But only CT data is migrated and only CT is client-facing at
  launch; MRI is added later by seeding a new `modalities` row, its `units`, and its
  `unit_specs`/`site_capability_requirements` — no new tables, no new interaction code.
- **Open with the client**: confirm the MRI (and any other modality) inventory-checklist
  equivalent of the CT sheet, its own capability list, and whether its site list overlaps
  with CT's `sites` table (likely yes — same hospitals host both) or is genuinely
  separate. Added to §13.

## 3. Status system

Eight statuses, carried over from the Excel colour key. Store as an enum; colours are a
presentation concern (tokens in §8).

| key | label | Excel origin |
|---|---|---|
| `confirmed` | Confirmed | white fill |
| `weekend` | Weekend confirmed | grey fill (both grey variants in the sheet) |
| `likely` | Likely — awaiting confirmation | green `92D050` |
| `bidding` | Bidding for contract | red `FF0000` |
| `service` | Corrective works / service (yard) | blue `00B0F0` |
| `tbc` | Site to be confirmed | orange `FFC000` |
| `cancelled` | Cancelled by customer — chargeable | pink `FA82EE` |
| `bankholiday` | Bank holiday | yellow `FFFF00` |

Rules:
- `weekend` and `bankholiday` are **calendar-derived overlays** in spirit; in v1 they are
  stored statuses (matching the sheet), but the UI should auto-suggest `weekend` when
  booking a Sat/Sun. Revisit post-launch.
- User-selectable statuses in the edit drawer: `confirmed, likely, tbc, bidding, service,
  cancelled` (not `weekend`/`bankholiday`).
- The workbook contains extra fills not in the client's legend (salmon `F8CBAD`, light
  blue `B4C6E7`, light green `E2EFDA`, `E08B8B`). **Ask the client what these mean before
  finalising the migration mapping** (§13.4). The mock-up maps `E08B8B` → `bidding` and
  ignores the pastel banding colours.

## 4. Primary view — the planner grid

Mimics the spreadsheet. See mock-up for exact styling.

- **Rows = days** (continuous calendar), **columns = units** (in `display_order`,
  filtered to the active modality — see below).
- **Modality switcher**: tab pills in the toolbar (e.g. "CT · MRI"), per §2d. Switching
  changes which units populate the columns; everything else about the grid — date rows,
  availability bar, drawer, selection, drag-and-drop, publish — behaves identically
  regardless of which modality is active. **v1 launch has only CT populated**, so the
  switcher can render with a single tab if MRI data isn't migrated yet — build the
  control, don't gate it behind a feature flag, so adding a second modality later needs
  no UI work, only data.
- **Sticky** unit header row (unit id bold + 2-line truncated spec, full spec on hover)
  and **sticky date column**.
- Date column shows: `4 Feb` + weekday name + the **availability bar** — a small capacity
  bar (free units / total) coloured green > 40%, amber > 15%, red otherwise, with the
  numeric count. Recalculates live on any change, **scoped to the active modality's
  units** (not a global count across every fleet).
- **Weekend rows** tinted; **Monday rows** get a heavier top border to mark week
  boundaries.
- **Cells**: booked → chip with status-tinted background and a half-strength
  status-coloured border (no left bar — team decision), site name clamped to 2 lines,
  tooltip with full site + status label. Empty → dashed outline, tooltip "Available —
  click to assign".
- **Legend** ("Key" toggle in toolbar) showing all 8 statuses + "Available day".
- **Toolbar**: modality switcher; search box (matches unit id, unit spec, or site name →
  filters visible unit columns); status filter pills (dim non-matching cells to ~20%
  opacity rather than hiding, so the grid shape stays stable); Undo/Redo; Select mode;
  Key.
- v1 must add (not in mock-up — the reference mock-up predates the multi-modality
  decision and shows CT only, with no switcher control): **month/date-range navigation**,
  a **"Today" jump**, and the **modality switcher** above. The mock-up shows a fixed
  4-week CT slice; production shows the full calendar with **row virtualisation**
  (7,000+ day rows in the CT source sheet alone — do not render them all).

## 5. Editing — the booking drawer

Click any cell (booked or empty) → right-side drawer (shadcn Sheet):

- Header: "New booking" / "Edit booking", unit id, long date.
- Unit spec card (from `units.description` / `unit_specs`).
- **Site location**: combobox with type-ahead over `sites` (≥2 chars, top 6), free-text
  allowed → creates a new site (flag for admin review).
- **Status**: radio list of the six user-selectable statuses, each with colour swatch.
- **Notes**: free text.
- Actions: **Save booking** (disabled until a site is set) · **Clear** (only when
  editing an existing booking). Both toast on success and write `booking_events`.

**Bulk edit**: when the drawer is opened while ≥2 bookings are selected (via the
multi-select mechanism in §6), it switches to bulk mode:
- Header reads "Edit N bookings" instead of a single unit/date.
- Fields behave as **"apply to all"**: Site and Status show a placeholder if the
  selection has mixed values ("— multiple —") rather than guessing one; leaving a field
  untouched leaves each booking's existing value alone, only touched fields get
  overwritten across the whole selection.
- Notes are **appended**, not overwritten, unless the user explicitly clears the field
  first — bulk-overwriting notes silently is a data-loss trap.
- Save applies as **one batch** in `booking_events` (same `batch_id` pattern as
  multi-drag), so it undoes in a single Ctrl/Cmd+Z.
- Locked/published bookings in a mixed selection are excluded from the edit and called
  out ("2 of 5 selected bookings are published and won't be changed").

## 6. Multi-select & drag-and-drop

Selection (booked cells only):
- **Ctrl/Cmd-click** toggles a cell into the selection (tick badge on chip).
- **Shift-click** selects the contiguous run of booked days between the last anchor and
  the clicked cell **within the same unit column**.
- **Select mode** toolbar toggle: every click selects (touch support).
- **Clicking an already-selected chip always unselects it** (no modifier — this was a
  usability fix; keep it).
- Selection bar (dark navy strip) shows count, hint text, and "Clear selection (Esc)".
- Esc clears selection / closes drawer / cancels drag / closes dialogs.

Drag-and-drop:
- Dragging any chip moves it; if it's part of a selection, the **whole set moves rigidly**
  (same day-offset and unit-offset for every member, preserving relative spacing).
  Dragging an unselected chip moves just that one (and auto-selects it for the drag).
- Live preview while dragging: every target cell highlights **green (free)** or
  **red (occupied)**.
- Drop outcomes:
  - all targets free → move applies immediately, toast summarises ("Moved 3 bookings
    (+7 days)").
  - any target outside the loaded range → reject with explanatory toast.
  - any target occupied → **clash dialog** (§7).
- Statuses and notes travel with a moved booking unchanged (client question §13.3).
- Production niceties not in the mock-up: auto-scroll while dragging near viewport edges;
  a drag ghost showing the count ("3 bookings").

## 7. Admin page

New surface, not in the mock-up. Four roles, least-privilege by design:

| Role | Can do |
|---|---|
| `viewer` | See the grid, no edits. |
| `scheduler` | Everything in §4–§6 (book, move, swap, bulk-edit) and §2b's "publish selected" / "publish upcoming" — day-to-day scheduling work. |
| `admin` | Everything a scheduler can, **plus** the admin page: reference data, site requirements, pending-site review, unlock published bookings, audit log viewer. **Cannot** change anyone's role. |
| `super_admin` | Everything `admin` can, **plus** the one thing nobody else can touch: **assigning and changing user roles.** |

The split exists so that day-to-day admin work (unlocking a booking, approving a new
site) never doubles as the ability to grant yourself or a colleague more access — role
changes are a small, rare, sensitive action kept behind its own gate, and every change is
still written to `booking_events`-style audit logging (actor, target user, old role, new
role, timestamp) so "who made X an admin" is always answerable.

- **Reference data** (modalities, units, sites, companies): view the TMS-synced mirror;
  edit locally
  only where TMS sync doesn't yet exist (until §13.1 is resolved, this is the only way to
  manage them). Once synced, most fields become read-only in the planner and editable
  only in TMS. *(`admin` and above.)*
- **Site requirements**: set `requires_cardiac` / `requires_mako` / `requires_insufflator`
  per site (drives §2a warnings). *(`admin` and above.)*
- **Pending sites review**: list of sites created via free-text in the drawer
  (`pending_review = true`) — approve (clears the flag, optionally merge into an existing
  TMS site if it's a duplicate/typo) or reject. *(`admin` and above.)*
- **Unlock published bookings**: the admin-only override from §2b, also reachable inline
  from the grid, but listed here as it's an admin capability. *(`admin` and above.)*
- **Audit log viewer**: searchable view over `booking_events` — "who moved CT38 off the
  Gloucester run and when" (this is the payoff for the append-only log design in §10).
  *(`admin` and above.)*
- **Users & roles**: invite/deactivate staff and set their role from the four above.
  **`super_admin` only** — this is the tier's defining capability, not a shared one.

## 8. Clash dialog (swap / overwrite / cancel)

Modal (shadcn Dialog) listing each clash — unit, date, site, status dot (first 5, then
"…and N more"):

- **⇄ Swap bookings** (primary): displaced bookings move into the slots the dragged
  selection vacated (each occupant to its corresponding source cell). Well-defined for
  multi-drags because the offset is uniform.
- **Overwrite** (destructive styling, crimson outline, never default-focused): replaces
  the existing bookings.
- **Cancel** (button, backdrop click, or Esc).
- Copy in dialog reassures: "Either choice can be undone (Ctrl/Cmd + Z)".
- The choice applies to **all** clashes in the drop — no per-clash granularity in v1.
- Deliberately excluded from v1 (client questions): "bump to next free day",
  "book alongside" / double-booking.

## 9. Design system (Quest Medical)

Full token set in the supplied design-system package; the essentials used by the mock-up:

- Colours: navy `#214b7f`, navy-dark `#1a3d69`, blue `#2b7bb9` (interactive), blue-dark
  `#1f5a87`, blue-tint `#f0f7ff`, crimson accent `#b13a3a`, heading `#333`, body `#757575`,
  border `#e6e6e6`, surface `#fff`, surface-alt `#f7f9fc`.
- Status chip palettes (bg / border-source / text) — copy exactly from the mock-up's
  `STATUSES` object.
- Type: Roboto (Google Fonts via `next/font`); headings 700, body 300/400; tabular-nums
  for dates and counts.
- Controls are **pill-shaped** (`border-radius: 999px`); cards 16px radius; hairline
  borders; 150–200ms colour/shadow transitions only — no heavy shadows or bounce.
- App bar: navy, "QUEST" wordmark (bold, 0.14em tracking) + divider + "Forward Planner"
  in the crimson-family accent, per the Quest house-of-brands lockup pattern.
- British English throughout (`en-GB` dates: "4 Feb", "Monday 4 February 2025").
- Toasts: navy-dark pill, bottom-centre, ~2.8s.

## 10. Undo / redo & audit

- **Ctrl/Cmd+Z** undo, **Ctrl/Cmd+Shift+Z** or **Ctrl+Y** redo; toolbar ↺/↻ buttons with
  disabled states and shortcut tooltips; shortcuts suppressed while typing in inputs.
- Every mutation (save, clear, single move, multi move, swap, overwrite) is **one
  undoable step** — multi-booking operations undo atomically (`batch_id` in
  `booking_events`).
- Toasts name the reverted action ("Undone — moved 3 bookings").
- Mock-up keeps history client-side (50 steps); production should derive undo from
  `booking_events` so it survives reloads and supports "who changed this?" queries.
- Multi-user: bookings-changed updates propagate via polling (~10s, per §1); at minimum,
  optimistic-lock on `updated_at` and surface a conflict toast if someone else edited the
  same cell first.

## 11. Concurrency, failure & loading states

Not covered by the mock-up (it's single-user, in-memory) — defaults for the real build:

- **Concurrent edits**: optimistic UI update on save/move, reconciled against
  `updated_at`. If another user changed the same booking first, the save is rejected,
  the cell **snaps back to the current server value**, and a toast explains what
  happened ("This booking was changed by [name] — refresh to see the latest"). Never
  silently overwrite a concurrent edit.
- **Undo across users**: if the booking being undone has changed since the undo step was
  recorded, the undo **fails safely** with an explanatory toast rather than clobbering
  someone else's newer edit. Same reconciliation check as any other write.
- **Live updates**: polling (~10s, per §1) — sufficient for a small scheduling team;
  revisit only if multi-scheduler contention turns out to be a real pain point.
- **Save/move failures** (network, validation, permission): optimistic change rolls back,
  cell/drawer returns to its prior state, error toast names what failed. Never leave the
  UI showing a change that didn't actually persist.
- **Permissions are enforced server-side**, always — the UI hiding a control (e.g. no
  edit button for `viewer`) is a convenience, not the security boundary. Every mutation
  endpoint re-checks role and publish-lock state independently of what the client sent.
- **Loading/empty states**: skeleton grid on first load; a unit column with zero bookings
  ever renders normally (all-dashed cells), not as an error; the admin "pending sites"
  and "audit log" lists get standard empty-state copy ("Nothing to review right now").

## 12. Non-functional

- **Performance**: virtualise rows; grid holds ~30 columns × thousands of rows.
- **Accessibility**: colour is never the only signal — tooltips and the drawer name every
  status; visible keyboard focus; the clash dialog and drawer are focus-trapped; consider
  a small status glyph/letter option if colour-blind users flag the chips.
- **Responsive**: desktop-first (ops tool), but Select mode + tap interactions must work
  on tablets; horizontal scroll with sticky date column is the mobile answer.
- **No data loss**: nothing in the app hard-deletes (§2c) — "overwrite" and "clear" are
  soft deletes, everything is undoable via `booking_events`, and infra-level Postgres
  backups on Coolify are the third layer underneath both.

## 13. Migration & open client questions

**Migration script** (one-off, keep in repo): parse `CT FP` tab → `units` from header row,
`sites` from distinct cell values (trim; the sheet has inconsistent spacing and embedded
notes like "— cancelled chargeable" in site text — strip status suffixes into status/notes),
`bookings` from non-empty cells with status decoded from fill colour per §3. Skip duplicate
date rows (the sheet contains repeated `01/02/2025` rows — keep the fullest).

Open questions to resolve with the client:
1. **TMS integration mechanics** — confirmed as out of scope for now ("not for the time
   being but maybe in the future"), but three things still need answers before §2b's
   publish action means anything beyond "lock the record":
   - How does a locked/published booking actually reach the downstream TMS scheduling
     system — API push, scheduled sync, or manual export?
   - Is the unit of publish (a selected range, via multi-select — §2b) actually how the
     client's ops team thinks about "forwarding" work, or do they expect something more
     rigid, e.g. always a full week?
   - Does TMS read-only reference sync (units/sites/companies/users) land before or after
     the write-side publish integration — this affects build order.
2. Do red `bidding` cells count as *available* capacity? (Mock-up: yes.)
3. Is one booking per unit-day a hard rule, or do relief/double bookings exist? (Drives
   the DB unique constraint and a possible "book alongside" option.)
4. When a booking is moved, does its status persist or reset (e.g. to `tbc` pending
   re-confirmation)? (Mock-up: persists.)
5. Meaning of the four undocumented fill colours (§3).
6. **Other modalities (§2d)** — get the MRI (and any other fleet's) equivalent of the
   `CT FP` and `CT inventory checklist` tabs, confirm its capability list for §2a, and
   confirm whether its sites are the same `sites` records CT already uses (same
   hospitals, shared table) or need their own. Needed before MRI can be migrated, not
   before CT launches.
7. Site taxonomy: are "LHC …", "SW …", "OR-Heyford …" prefixes meaningful categories worth
   modelling (`sites.kind`)? Yard/service locations vs customer sites?
8. **Roles** — resolved with a default 4-tier model (§7): `viewer` / `scheduler` /
   `admin` / `super_admin`, with role-assignment locked to `super_admin` only. Remaining
   question: should the risky per-booking actions (Overwrite in the clash dialog,
   publishing) be restricted to `admin`+ rather than open to every `scheduler`, or is
   trusting day-to-day schedulers with those actions (current default) fine for a small
   team? Easy to tighten later since it's a single role check per action.
9. Is the `UTILISATION` tab in scope (reporting view), or phase 2?
10. **Unit downtime vs day-level `service` status** — still unresolved (client: "not sure
    yet"). Is a unit ever taken fully offline independent of the day grid (breakdown,
    long refurbishment), needing a broader `units.status` beyond the per-day `service`
    booking status? Revisit once the client has thought it through.

## 14. Out of scope for v1 (phase-2 candidates)

Copy/paste of bookings; right-click context menu; recurring bookings ("every Sat at X");
utilisation dashboards; conflict "bump"; per-unit row view / single-unit timeline;
notifications; CSV/Excel export; client-facing read-only share links; **the actual TMS
write-integration** (§13.1) — v1 implements the publish/lock *state machine* (§2b) and
stops there; wiring it to push into TMS's downstream scheduling system is explicitly
deferred until the client defines the mechanism.
