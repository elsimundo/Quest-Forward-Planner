You're starting implementation of the Quest CT Forward Planner — a scheduling app that
replaces a client's Excel workbook for assigning mobile CT scanner units to site
locations on specific days.

**Note before you start**: "CT" is the v1 launch scope, not the architecture. Quest runs
the same forward-planner pattern for MRI and other fleets on separate but structurally
identical spreadsheets. The schema is modality-generic from day one (`SPEC.md` §2d,
`docs/DECISIONS.md` #9) so a second modality is a data-seeding task later, not a rebuild
— keep it that way as you build; don't let CT-specific assumptions leak into shared
interaction code (drawer, drag-and-drop, publish) even though only CT ships first.

Before writing any code, read in this order:

1. `CLAUDE.md` — orientation, ground rules, where everything lives.
2. `SPEC.md` — full functional spec. This is authoritative for scope. Read it in full,
   not just the sections that sound relevant — several sections (soft deletes §2c, the
   publish/lock lifecycle §2b, the 4-tier roles §7) affect the data model from day one
   and are easy to bolt on badly if skipped early.
3. `reference/quest-ct-forward-planner.jsx` — a working, client-approved mock-up. This is
   authoritative for UX and interaction behaviour: the grid layout, status colours,
   multi-select rules, drag-and-drop with clash resolution, undo/redo, and the publish
   dialog are all already designed and tested. Re-implement this behaviour faithfully in
   the real stack — don't redesign the interactions from scratch.
4. `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DATABASE.md` — how it's put
   together, why each major technical choice was made, and the schema reference. Skim
   `DECISIONS.md` in particular before second-guessing a stack choice — the reasoning
   and rejected alternatives are already recorded there.
5. `CONTRIBUTING.md` — working conventions, including: keep docs updated in the same PR
   as the code that makes them necessary, never write a raw `DELETE` against the core
   tables (soft deletes only), and every mutation must re-check permissions server-side.

Then confirm your understanding back to me in a short summary before scaffolding anything
— I want to catch any misreading of the spec before code exists, not after.

## Build order

Work in slices, each one reviewable on its own, roughly in this order:

1. **Project scaffold** — Next.js (App Router) + TypeScript + pnpm, Drizzle + Postgres
   connection, Auth.js wired to a local `users` table (per `DECISIONS.md` #4), shadcn/ui
   installed and themed from the `design-system/` package. Dockerfile for Coolify.
2. **Schema + migration** — the tables in `docs/DATABASE.md`, including the
   `modalities` table, soft-delete columns, and the partial unique index on `bookings`.
   Seed a single `"CT"` modality row before migrating. Then the one-off script to migrate
   `data/CT_Forward_Planner_23012025.xlsx` into it — flag the four undocumented fill
   colours (SPEC §13 Q5) back to me rather than guessing a mapping.
3. **Read-only grid** — render the planner grid against real data: sticky headers, status
   chips, availability bar, search/filter, and the modality switcher control (SPEC §4) —
   even with only one "CT" tab live, build the control now rather than adding it when
   MRI lands. Match the mock-up's look exactly using the design-system tokens.
4. **Editing** — the booking drawer, single and bulk edit, capability-matching warnings
   (§2a).
5. **Selection, drag-and-drop, clash resolution, undo/redo** — this is the most
   interaction-heavy slice; lean hard on the reference JSX for exact behaviour.
6. **Publish/lock workflow** — the range-publish dialog, selection-publish, the
   locked/read-only drawer state, unlock action (§2b).
7. **Admin page** — reference data, site requirements, pending-site review, users &
   roles (role-assignment gated to `super_admin` only — §7), audit log viewer.
8. **Polish** — loading/empty states, error/conflict toasts, permission enforcement
   audit across every mutation, deploy to Coolify staging.

Stop and check in with me between slices rather than pushing straight through all eight —
I'd rather correct course after slice 3 than after slice 8.

## Things to flag back to me rather than deciding yourself

- Anything in `SPEC.md` §13 (open client questions) that a build decision would force you
  to silently assume an answer to.
- Any place the reference mock-up and `SPEC.md` seem to disagree.
- Any schema change once migrations have been applied anywhere beyond your local machine.

Go ahead and start with step 1 of the reading list.
