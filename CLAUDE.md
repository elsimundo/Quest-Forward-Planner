# CLAUDE.md — working in this repo

This file orients Claude Code (or any AI assistant) picking up this project. Read this
first, then the file it points you to for the task at hand.

## What this is

Quest CT Forward Planner — replaces a client's Excel scheduling workbook with a web app
for assigning mobile CT scanner units to site locations on specific days, with a
publish/lock workflow for forwarding confirmed schedules to Quest's TMS system.

**"CT" is the v1 launch scope, not the architecture.** Quest runs the same
forward-planner pattern for MRI and other fleets on separate but structurally identical
spreadsheets. The schema and app are built modality-generic from day one (`SPEC.md` §2d,
`docs/DECISIONS.md` #9) so adding a second modality later is a seeding task, not a
rebuild — don't reintroduce CT-specific assumptions into shared code (interaction logic,
the drawer, publish workflow) even though only CT ships first.

## Where things live

| Need to know... | Read... |
|---|---|
| What to build, exact behaviour, data model | `SPEC.md` — the single source of truth for scope |
| How pieces fit together, why they're structured this way | `docs/ARCHITECTURE.md` |
| Why a specific technical choice was made | `docs/DECISIONS.md` |
| Exact table/column definitions, migrations, seeding | `docs/DATABASE.md` |
| Local dev setup, conventions, PR workflow | `CONTRIBUTING.md` |
| Approved visual design, exact interaction behaviour | `reference/quest-ct-forward-planner.jsx` — a working mock-up, client-approved. Match its layout, colours, and interaction patterns; don't redesign from scratch. |
| Brand tokens (colour, type, spacing, components) | `design-system/` — the Quest Medical design system package |
| Where the real data comes from | `docs/TMS_INTEGRATION_PLAN.md` — TMS is the sole source of units, sites, and bookings |
| How published bookings get *back* to TMS | `docs/TMS_WRITE_BACK.md` — the model, and the API questions blocking it. **Nothing writes to TMS today; the connection is read-only.** |

## Ground rules

- **`SPEC.md` is authoritative for scope.** If an instruction here or in chat conflicts
  with it, flag the conflict rather than silently picking one.
- **The reference mock-up is authoritative for UX.** It's already been through several
  rounds of client review (multi-select, drag-and-drop, undo/redo, clash resolution,
  publish/lock). Re-implement its behaviour faithfully in the real stack rather than
  reinterpreting it — most of the hard UX decisions are already made and tested.
- **TMS is the only source of real data.** The client's Excel workbook was test data and
  is *gone* — the file, the migration script, and every row it ever wrote were removed on
  2026-07-28 at the client's request, because Excel-derived rows sitting next to real TMS
  rows made it impossible to tell which was which (`docs/DECISIONS.md` #27). Don't
  re-import it, don't re-add a spreadsheet seeding path, and don't hand-seed
  `units`/`sites`/`bookings` to make a local environment look populated. If a table is
  empty, that is the honest state — TMS either has the data or it doesn't, and "TMS
  doesn't have it" is a client question, not a gap to fill with invented rows.
- **Nothing hard-deletes.** Every destructive-looking action (clear, overwrite, retiring
  a unit) is a soft delete (`deleted_at`) — see `SPEC.md` §2c and `docs/DECISIONS.md`.
  If you're about to write a `DELETE` statement against `bookings`, `units`, `sites`, or
  `companies`, stop — that's very likely a bug. (The one-off Excel purge above was an
  explicit, client-authorised exception — not a precedent.)
- **Every mutation goes through the audit log** (`booking_events`). If you add a new kind
  of write to `bookings`, add a matching `action` value and make sure undo works for it.
- **Permissions are enforced server-side, always.** UI role-gating is a convenience, not
  the boundary — every mutation endpoint re-checks role independently.
- **Update the docs as you go.** If you make a decision `docs/DECISIONS.md` doesn't
  cover, add an entry. If the schema changes, update `docs/DATABASE.md` in the same PR.
  Docs that drift from the code are worse than no docs — treat them as part of the
  change, not a follow-up.

## Open questions

`SPEC.md` §13 lists unresolved client questions (TMS integration mechanics, whether
`bidding` counts as available capacity, double-booking policy, etc.). Don't silently
assume an answer to one of these mid-build — flag it back to the user, the same way this
spec was built by asking rather than guessing.
