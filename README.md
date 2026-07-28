# Quest CT Forward Planner

A scheduling app for assigning Quest's mobile CT scanner fleet to site locations on
specific days — replacing the client's Excel "CT Forward Planner" workbook with a proper
web tool, while keeping the mental model (dates × units grid, colour-coded statuses) the
team already knows.

**Note:** "CT" is the launch scope, not a ceiling — Quest runs the same pattern for MRI
and other fleets on separate Excel sheets, and the app/schema are built to support
additional modalities without a rebuild. See `SPEC.md` §2d.

Full functional scope lives in [`SPEC.md`](./SPEC.md). This README is about running and
navigating the codebase, not what it does.

## Stack

- **Next.js** (App Router) + React + TypeScript
- **PostgreSQL** + **Drizzle ORM**
- **Auth.js** (`Credentials` provider — see `docs/DECISIONS.md` #4)
- **shadcn/ui**, themed with the Quest Medical design system
- **pnpm**, deployed as a **Docker** image on **Coolify**

See `docs/ARCHITECTURE.md` for how these fit together and `docs/DECISIONS.md` for why
each was chosen over the alternatives.

## Getting started

```bash
pnpm install
cp .env.example .env        # fill in local DB connection string, etc.
pnpm db:migrate              # apply Drizzle migrations
pnpm db:create-user -- --name "Jane Doe" --email jane@quest.co.uk --password *** --role super_admin
pnpm dev                     # http://localhost:3000
```

Requires a local Postgres instance (or point `.env` at a Coolify/remote dev database).

**Populating it with data.** There is no seed script — all real data comes from TMS
(`docs/TMS_INTEGRATION_PLAN.md`). Point `MYSQL_AUTH_DATABASE_URL` at the read-only TMS
database, then run the reference sync at `/admin/tms-sync` (companies, units, sites)
followed by the booking import at `/admin/tms-booking-import`. The Excel workbook that
used to seed local environments was removed on 2026-07-28 — see `docs/DECISIONS.md` #27.
Don't reintroduce a spreadsheet or hand-written seeding path; an empty table means TMS
has nothing to give, which is information worth seeing rather than papering over.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Local dev server |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm db:generate` | Generate a Drizzle migration from `lib/db/schema.ts` |
| `pnpm db:migrate` | Apply pending Drizzle migrations |
| `pnpm db:studio` | Drizzle Studio — inspect the DB visually |
| `pnpm db:create-user` | Bootstrap a local `users` row (SPEC.md §1 — seeded manually for the pilot team) |
| `pnpm lint` / `pnpm typecheck` | Standard checks — run before opening a PR |

A test-suite script lands once a test framework is chosen — not yet in `package.json`.

## Project structure

```
app/                  Next.js App Router routes
  (planner)/            the main grid view
  admin/                admin page — reference data, roles, audit log (§7 super_admin+)
  api/                  route handlers, if any aren't Server Actions
components/           UI components (shadcn primitives + app-specific)
lib/
  db/                   Drizzle schema, client, migrations
  auth/                 Auth.js config, the swappable credential-verification function
docs/                 Architecture, decisions, database reference (see below)
reference/            Client-approved mock-up — the UX source of truth
design-system/        Quest Medical brand tokens and component reference
SPEC.md               Full functional specification
CLAUDE.md             Orientation for AI assistants working in this repo
```

## Documentation map

| Document | Answers |
|---|---|
| [`SPEC.md`](./SPEC.md) | What does this app do, exactly? |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | How is it put together? |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Why this choice and not that one? |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | What does the schema actually look like? |
| [`docs/TMS_WRITE_BACK.md`](./docs/TMS_WRITE_BACK.md) | How do published bookings reach TMS, and what's blocking it? |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How do I work in this repo day to day? |
| [`CLAUDE.md`](./CLAUDE.md) | Orientation for AI coding assistants |

## Status

Pre-build — `SPEC.md` and the reference mock-up are client-approved; implementation has
not started. See `SPEC.md` §13 for open client questions still to resolve.
