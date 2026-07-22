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
| Source data to migrate | `data/CT_Forward_Planner_23012025.xlsx` |

## Ground rules

- **`SPEC.md` is authoritative for scope.** If an instruction here or in chat conflicts
  with it, flag the conflict rather than silently picking one.
- **The reference mock-up is authoritative for UX.** It's already been through several
  rounds of client review (multi-select, drag-and-drop, undo/redo, clash resolution,
  publish/lock). Re-implement its behaviour faithfully in the real stack rather than
  reinterpreting it — most of the hard UX decisions are already made and tested.
- **Nothing hard-deletes.** Every destructive-looking action (clear, overwrite, retiring
  a unit) is a soft delete (`deleted_at`) — see `SPEC.md` §2c and `docs/DECISIONS.md`.
  If you're about to write a `DELETE` statement against `bookings`, `units`, `sites`, or
  `companies`, stop — that's very likely a bug.
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
