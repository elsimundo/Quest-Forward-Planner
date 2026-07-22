# Architecture

How the Quest CT Forward Planner is put together. For *what* it does, see `SPEC.md`; for
*why* a given approach was chosen, see `DECISIONS.md`. This document is the middle layer:
how the pieces connect.

## System overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (scheduler / admin)                                     │
│  Next.js app — grid, drawer, admin page                          │
└───────────────────────────┬───────────────────────────────────────┘
                              │ Server Actions / route handlers
┌───────────────────────────▼───────────────────────────────────────┐
│  Next.js server (Docker, on Coolify)                              │
│  • Auth.js — session + role check on every mutation                │
│  • Drizzle ORM                                                    │
└───────────────────────────┬───────────────────────────────────────┘
                              │
┌───────────────────────────▼───────────────────────────────────────┐
│  PostgreSQL (Coolify-managed)                                     │
│  modalities · units · sites · companies · users · bookings ·      │
│  booking_events                                                     │
└─────────────────────────────────────────────────────────────────┘

     (future, deferred — see SPEC.md §13.1)
┌─────────────────────────────────────────────────────────────────┐
│  TMS (external system, read-only reference data + write target    │
│  for published bookings — mechanism TBD)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Core data flow: booking a unit

1. User clicks an empty cell in the grid → drawer opens with site/status/notes fields.
2. Save → a Server Action validates input, re-checks the actor's *current* role from the
   DB (not the session's JWT claim), writes a `bookings` row (or updates one), and appends
   a `booking_events` entry in the same transaction.
3. **Not optimistic in this slice** — the Save/Clear buttons show a disabled/loading state
   and wait for the Server Action's response, rather than applying the change to the grid
   immediately and rolling back on failure. SPEC.md §11 describes true optimistic updates;
   this is a deliberate v1 simplification, revisit if the ~one round-trip latency proves
   annoying in practice.
4. On success, the Server Action calls `revalidatePath("/")` (server-side cache
   invalidation) **and** the client explicitly calls `router.refresh()` — both are needed.
   `revalidatePath` alone does not cause an already-mounted client page to re-fetch; only
   `router.refresh()` does that. Every future mutation (drag-and-drop, publish/unpublish)
   needs this same pair, not just the first one.
5. Other open sessions pick up the change on their next poll cycle (~10s — see
   `DECISIONS.md` #5).

## Core data flow: moving/swapping bookings

Multi-select and drag-and-drop are entirely client-side interaction state (which cells
are selected, drag preview) until drop, at which point the **whole batch** is sent as one
request:

- One `booking_events` row per moved booking, all sharing a `batch_id`.
- The move (or swap) happens inside a single DB transaction — either all bookings in the
  batch move, or none do. This is what makes atomic undo possible: undoing a batch is
  "apply the inverse of every event with this `batch_id`," done as one transaction too.
- Clash detection (is the target slot occupied?) is checked server-side at commit time,
  not just client-side at drag time — the client-side green/red preview is a UX
  convenience, never the source of truth for whether a move is actually allowed. Two
  users dragging into the same slot at once must not both succeed.

## Publish/lock lifecycle

See `SPEC.md` §2b for the full behaviour. Architecturally: `published_at` is a field on
`bookings`, not a separate table or state machine library — the lifecycle is exactly two
states (draft / published) plus one transition each way, which doesn't warrant more
machinery than a nullable timestamp and a role check on the transition.

## Soft deletes

See `SPEC.md` §2c. Architecturally, this means:

- Every Drizzle query against `bookings`, `units`, `sites`, `companies`, `modalities` filters
  `deleted_at IS NULL` — enforced via a query helper/wrapper, not repeated by hand in
  every call site (easy to forget one and leak a "deleted" row into a view otherwise).
- Postgres partial unique indexes (`WHERE deleted_at IS NULL`) do the "one live booking
  per unit-day" enforcement — see `docs/DATABASE.md`.

## Auth & permissions

- Auth.js session on every request; role (`viewer` / `scheduler` / `admin` /
  `super_admin`) is read from the session and re-validated server-side on every mutation
  — never trust a role claim the client sends.
- The `Credentials` provider's verification step is isolated behind a single function
  (`lib/auth/verify-credentials.ts` or similar) so swapping the identity source from the
  local `users` table to TMS later is a one-file change — see `DECISIONS.md` #4.

## Reference data sync (future)

Not built in v1 (`SPEC.md` §13.1, §14). When it lands, `units` / `sites` / `companies` /
`modalities`
become a **mirror**, not a master — writes to those tables happen only via the sync job,
never from app UI (except the `sites` free-text creation path, which stays local and
flows into TMS's own review process once that exists). Design the sync job idempotent
(safe to re-run) and log its runs the same way `booking_events` logs user actions.

## Multi-modality

See `SPEC.md` §2d and `DECISIONS.md` #9. Architecturally, "modality" (CT, MRI, …) is a
scoping field on `units`, not a parallel set of tables or a separate app instance — every
other table (`bookings`, `booking_events`, `unit_specs`) is keyed off `unit_id` and
inherits the scope for free. The grid's modality switcher is purely a filter on which
units populate the columns; the interaction code (selection, drag-and-drop, clash
resolution, undo/redo, publish) has no modality-specific branches anywhere and shouldn't
grow any — if you find yourself writing `if (modality === 'CT')` in interaction logic
rather than in a capability/spec lookup, that's a sign the modality boundary has leaked
somewhere it shouldn't.

## Frontend structure

- **Grid** is virtualised (row virtualisation) — the source data spans thousands of days;
  never render the full range at once.
- **Interaction state** (selection set, drag preview, undo/redo stacks) lives in
  client-side React state, not the URL or server — it's ephemeral and per-session by
  design.
- **Server state** (the actual bookings) is fetched/mutated via Server Actions, kept in
  sync with polling; consider React Query or equivalent for cache + optimistic update
  ergonomics if the hand-rolled version gets unwieldy.

## Non-goals (see `SPEC.md` §14 for the full list)

Notably: this architecture does not attempt real-time collaborative editing
(operational-transform/CRDT territory) — polling + optimistic-lock conflict handling is a
deliberate, simpler choice for a small scheduling team, not an oversight.
