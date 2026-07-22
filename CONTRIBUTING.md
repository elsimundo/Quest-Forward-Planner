# Contributing

Working conventions for this repo. For *what* to build see `SPEC.md`; for *why* a
technical choice was made see `docs/DECISIONS.md`.

## Local setup

```bash
pnpm install
cp .env.example .env          # fill in DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL
pnpm db:migrate                # apply Drizzle migrations
pnpm db:create-user -- --name "Jane Doe" --email jane@quest.co.uk --password *** --role super_admin
pnpm dev                       # http://localhost:3000
```

Requires a local Postgres instance (`createdb quest_ct_forward_planner_dev`, or point
`.env` at a remote dev database).

## Before opening a PR

```bash
pnpm lint
pnpm typecheck
pnpm build
```

All three must pass. If the schema changed, `docs/DATABASE.md` must be updated in the
same PR — not as a follow-up.

## Non-negotiables

These come from `SPEC.md` and `docs/DECISIONS.md` and apply to every change, not just
the slice that first introduced them:

- **Never write a raw `DELETE`** against `bookings`, `units`, `sites`, `companies`, or
  `modalities`. Every destructive-looking action is a soft delete (`deleted_at`) — see
  `SPEC.md` §2c. If you find yourself reaching for `DELETE FROM`, stop and re-read that
  section.
- **Every write to `bookings` writes a matching `booking_events` row**, in the same
  transaction. Adding a new kind of mutation means adding its `action` value to
  `docs/DATABASE.md` and making sure undo handles it.
- **Every query filters `deleted_at IS NULL`** unless it's explicitly an admin/audit view
  that needs soft-deleted rows. Prefer a shared query helper over repeating the filter by
  hand at each call site.
- **Permissions are re-checked server-side on every mutation.** UI role-gating is a
  convenience; the actual boundary is the mutation endpoint re-validating the caller's
  current role (see `auth.ts` and `lib/auth/verify-credentials.ts` — session role is for
  UI/routing, not authorization decisions).
- **No CT-specific assumptions in shared interaction code.** Selection, drag-and-drop,
  clash resolution, undo/redo, and publish are keyed off `unit_id`/`date` and must stay
  modality-agnostic — see `docs/ARCHITECTURE.md`'s "Multi-modality" section.
- **Docs move with the code.** If the schema changes, update `docs/DATABASE.md` in the
  same PR. If you make a decision `docs/DECISIONS.md` doesn't cover, add an entry there
  too — don't let docs drift from what's actually built.

## Design & components

- Reuse `components/ui/*` (shadcn) rather than hand-rolling equivalents — override the
  underlying component (as already done for `Button`/`Input`'s pill radius and the
  outline-style `destructive` variant) so every consumer gets the fix, rather than
  patching call sites individually.
- Match `reference/quest-ct-forward-planner.jsx` for layout, colours, and interaction
  behaviour — it's client-approved. Re-implement its behaviour faithfully; don't
  redesign it.
- Brand tokens live in `design-system/tokens/*.css`, wired into `app/globals.css`. Don't
  hardcode a Quest colour/spacing value that already has a token.

## Git

- One reviewable slice per PR, roughly matching the build order in `CLAUDE.md`.
- Don't introduce a schema migration in the same PR as an unrelated feature.
