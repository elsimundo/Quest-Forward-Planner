# Cell states

Every visual state a grid cell can be in, what it means, and what you can do with it.

Written because the overlay model (`docs/TMS_WRITE_BACK.md`) added states that don't exist in
a normal booking grid — a cell can now show something that lives in TMS rather than here, and
"empty" and "occupied" stopped being the only two options. If you're changing
`components/planner/cell-chip.tsx` or the render block in `planner-grid.tsx`, read this first.

**The governing rule:** a cell's appearance must match what you can actually do with it. If a
cell is free, it must look free and accept a booking; if it's occupied, it must look occupied.
Every decision below falls out of that. It got broken twice, both times by reusing the ghost
treatment for a cell that was actually free — both are recorded at the bottom, because the
mistake is an easy one to make again.

---

## Base states

Exactly one applies to any given cell. These are mutually exclusive.

### 1. Available

Dashed grey outline, empty.

Nothing in TMS, nothing here. Click to open the drawer and book it.

### 2. Booked

Solid chip, filled with the status colour, site name in the middle.

Something is scheduled. **Four different underlying situations render identically here, on
purpose** — a scheduler is looking at "what is this unit doing that day", and the provenance
of the row isn't part of that question:

| Underlying | `tms_booking_id` | Local row? |
|---|---|---|
| Untouched TMS booking | — | none |
| A TMS booking we've edited in place | set | yes |
| A TMS booking we've moved *to* this slot | set | yes |
| A booking that only exists here | null | yes |

Drag to move, click to edit, ctrl-click to multi-select.

The distinction surfaces only where it changes what happens: the drawer, publish eligibility,
and the badges below.

### 3. Moved-away ghost

Faded (45%), dashed border, *italic* site name, `↷` on the right.

**TMS still has a booking here, but in the planner it's been moved somewhere else.** This is
the client's own request, in their words: *"I'd like for that original TMS booking to stay
where it is, but be made slightly transparent. A link would also be added to that faded out
TMS booking that would scroll the user to where that new booking is now located."*

**Two click targets.** The chip body opens the cell, exactly as clicking any other cell does —
because the slot genuinely is free, and you may well want to put different work on that unit
that day. The `↷` on the right jumps to wherever the booking now sits and flashes it amber for
two seconds.

Opening it shows the normal booking form plus a banner naming the TMS booking still sitting
here and where it went, with a link to jump. Anything you book is *in addition to* the move,
not instead of it.

It still can't be dragged, selected, edited, or published — it isn't one of our rows, it's a
rendering of TMS's current truth. And it disappears once the move is published and TMS agrees
with us.

### 4. Pending removal

Renders as **Available** (state 1) with a faint tan border and a small `⌫` in the corner.

**TMS has a booking here that we've cleared.** Until that removal is published, TMS still
shows the booking — so the mark is there to say the two systems currently disagree.

Crucially it is a *free* cell: click it and book something else. See
[the correction](#correction-cleared-cells-used-to-lie) below for why it isn't a
struck-through chip.

### 5. Published / locked

Chip with 🔒, desaturated (72% opacity, 55% saturation), cursor is a pointer not a grab.

Forwarded to TMS and locked. Not draggable and not editable. Clicking opens the drawer, which
offers **Unlock to edit** to admins only, behind a two-step confirm (`SPEC.md` §2b).

---

## Decorations

These layer on top of a base state rather than replacing it. More than one can apply.

| Mark | Where | Meaning |
|---|---|---|
| Blue-tinted fill + blue dot | whole chip / bottom-right | **TMS doesn't have this cell as shown yet** — publishing would change something here. See [Sync state](#sync-state-the-second-axis) below. |
| `⚠` | top-right | Capability mismatch — the unit doesn't meet a requirement of the site (`SPEC.md` §2a). Informational, never blocks. |
| `⇄` orange | bottom-left | **Legacy.** TMS and a local edit both changed since the last import. Belongs to the booking import being retired in Stage F and won't fire under the overlay. |
| `↻` purple | bottom-left | **TMS has changed this booking since you amended it.** Open the drawer to resolve — keep your version, or take TMS's. Blocks publishing until resolved. |
| `✓` blue | top-right | Selected in multi-select. |
| Blue ring | whole cell | The drawer is open on this cell. |
| Amber ring | whole cell | You've just jumped here from a ghost's link. Clears after 2s. |
| Green border | whole cell | Valid drop target during a drag. |
| Red border | whole cell | Drop here would clash — you'll be asked to swap or overwrite. |
| 22% opacity | whole cell | Dimmed by the status filter. |

`⇄` and `↻` share a corner, so `⇄` wins if both are ever true — they're different colours and
different symbols specifically so the retiring one is never mistaken for the new one while
both exist in the codebase.

---

## Sync state — the second axis

The base states above answer *"what is this unit doing that day?"*. There's a second, entirely
independent question — *"does TMS have this yet?"* — and the states deliberately don't answer
it. Base state 2 renders four different provenances identically on purpose.

That's right for reading a schedule and wrong for the moment before publishing, which is what
the sync marker and the changes view are for (`docs/DECISIONS.md` #29). It's derived, never
stored: `lib/planner-changes.ts` reads `origin` and `publishedAt` off the `OverlayBooking` and
returns one of four kinds, or null when TMS already agrees.

The marker is two layers, both driven by the same value (`docs/DECISIONS.md` #31, #32):

- **The fill itself** is the status colour blended 14% toward the app's blue accent
  (`#2b7bb9`, via `mixHex` in `lib/statuses.ts`) instead of the flat colour — a Confirmed
  chip that only exists in the planner is visibly *not* the same white as one TMS already
  has. A small dot alone wasn't enough for the client to trust at a glance ("adamant" about
  needing a different background), and the first version of the wash mixed toward a very
  dark navy, which reads as grey rather than blue at a light ratio — swapped to the actual
  blue accent once Dave asked for it explicitly.
- **The corner dot** stays on top of the wash, because the wash alone can't say *which* kind of
  change this is — that's still in the tooltip.

| Kind | Meaning |
|---|---|
| **new** | `origin: "local"` — exists only here; TMS has never seen it. |
| **amended** | `origin: "amended"`, same slot as TMS — edited in place. |
| **moved** | `origin: "amended"`, different slot, counted at the **destination** — the ghost it left behind is a signpost, not a second change. |
| **cleared** | Carried by the `⌫` mark instead, not the wash — the amendment is soft-deleted, so the ghost is the only thing on screen for it, and it renders through the *available*-cell path, not `CellChip`'s booking branch. |

A **published** booking returns null — `🔒` is already the stronger statement, and under
`docs/TMS_WRITE_BACK.md` §5 the amendment retires entirely once TMS accepts it. An **untouched
TMS booking** returns null because there is nothing to send.

`origin` exists because `tms_booking_id` can't answer this: it's set on untouched TMS rows
*and* on amendments of them. Ghosts are always `origin: "tms"` — a ghost renders TMS's own
truth, however much the planner disagrees with it; the disagreement is carried by
`ghostReason`.

**Applies to every status, not just Confirmed** — deliberately (`docs/DECISIONS.md` #31). Sync
state is one axis across all eight statuses (#29's whole argument), so a `Likely` booking
created here gets the same wash as a `Confirmed` one. The blend ratio is small specifically so
each status keeps its own colour identity rather than all eight converging on one "changed"
colour once tinted.

**The drawer states it too, both ways** (`docs/DECISIONS.md` #33) — not just when there's a
change. A booking that already matches TMS gets a neutral grey line saying so
(`PUBLISH_EXCLUSION_LABEL["not-a-planner-change"]`, shared with the publish dialog rather than
reworded); a pending change gets the same blue line the chip's tooltip uses. Silence on the
common case used to read as "no answer" rather than "TMS already has this" — the same failure
mode #29 fixed on the grid, just showing up one level deeper.

### The changes view

The toolbar's **Changes (n)** pill dims every cell TMS already agrees with to 22% — the same
mechanism the status filter uses — leaving only the pending changes lit, in place. It fades
rather than filters because the client asked to see how changes *affect the schedule*, and a
filtered list of changed bookings loses the empty slot a move left behind.

Moved ghosts stay lit: `GhostChip` takes no `dimmed` prop at all, so the origin of a move is
visible alongside its destination. That's deliberate, not an oversight.

**The count is over the whole loaded date range, not the visible cells** — search and status
filters don't shrink it. It answers "what have we changed", not "what can I see". The bar
alongside breaks it down by kind and hands off to the normal publish pre-flight; it does not
report publish eligibility itself, because a cleared booking has no live row for the publish
sweep to find and the two counts would disagree (`docs/DECISIONS.md` #29).

---

## What you can do in each state

| | Click to book | Click to edit | Drag | Select | Publish |
|---|---|---|---|---|---|
| Available | ✅ | — | — | — | — |
| Pending removal | ✅ | — | — | — | — |
| Booked | — | ✅ | ✅ | ✅ | ✅ |
| Moved-away ghost | ✅ (body) | ❌ | ❌ | ❌ | ❌ |
| Published / locked | — | admin unlock | ❌ | ✅ | already |

Ghosts are excluded from `bookingLookup` in `planner-grid.tsx` rather than being checked at
each call site. That single omission is what guarantees the whole ghost row of that table:
selection, dragging, the drawer and publish counts all read that map, so none of them can act
on a ghost even by accident.

---

## Publish eligibility

**Before any of this runs, both pre-flight sweeps scope to planner changes only** —
`origin !== "tms"` (see [Sync state](#sync-state-the-second-axis) above). An untouched TMS
booking was never something the planner is proposing to send, so the range sweep drops it
before classification rather than running it through the checks below at all
(`docs/DECISIONS.md` #30) — a wide date range mostly reflects TMS's own ordinary schedule, and
none of that is this dialog's business.

A remaining candidate still won't publish if any of these apply (`lib/publish-eligibility.ts`,
shared by the pre-flight preview and the server gate so they can't disagree):

1. **Already published** — routine, not reported as an exception.
2. **Unresolved TMS conflict** (`⇄`) — legacy.
3. **TMS supersedes** (`↻`) — someone must decide whose version wins first.
4. **Status isn't publishable** — out of the box that's anything other than Confirmed,
   Weekend Confirmed, or Bank Holiday. Admin-editable at `/admin/booking-statuses`.

Checked in that order, so a booking failing more than one test reports the most actionable
reason. A Confirmed booking that TMS has since changed is a *supersede* problem, not a status
problem, and saying otherwise would send someone to fix the wrong field.

One more reason exists (`not-a-planner-change`) but only ever surfaces from an explicit
multi-select of an untouched TMS booking — the range sweep never reaches it, having already
filtered the booking out. It's deliberately calmer than the four above: nothing is wrong,
there's just nothing here for the planner to send.

---

## Correction: cleared cells used to lie

Worth recording, because building this state table is what made it visible — the contradiction
had been sitting in the UI unnoticed.

A cleared TMS booking originally rendered as a **struck-through faded chip** — reusing the
ghost treatment on the reasoning that the planner and TMS disagree, so the disagreement should
stay visible. That reasoning was fine. The rendering wasn't:

- **It misreported capacity.** A chip-shaped thing in a cell reads as "occupied" when you're
  scanning a wall of cells for free units — while the availability bar above counted the same
  cell as free, because it correctly ignores ghosts. The grid contradicted itself.
- **It blocked the click.** The ghost chip is a disabled button, so a cell that the database
  would happily accept a booking into couldn't be booked. Clearing a slot to put different
  work on it is an ordinary thing to want; you'd have had to publish first.

So it became an available cell carrying a small mark. Free, bookable, still visibly at odds
with TMS. Booking over one is handled correctly too: because `tms_booking_id` is unique, the
save revives the suppressed row as an amendment of TMS's booking rather than inserting a
second row — which is the right representation of "replace what TMS has here".

The move ghost (state 3) keeps the faded-chip treatment because the client asked for it
specifically, and because it's genuinely different: it points somewhere.

---

## Correction: the moved ghost swallowed the click

Recorded for the same reason as the one above — it's the same rule, broken the same way.

The whole ghost chip was originally a single jump link, so its cell couldn't be booked. Worse
than "couldn't": a click aimed at booking the slot silently scrolled you to a *different part
of the grid*. Doing something surprising and unrelated is a worse failure than doing nothing.

The slot was already free by every other measure — the availability bar counted the unit free,
and a drag would happily drop onto it. Only the click disagreed.

It's now two sibling buttons: the body opens the cell, the `↷` jumps. That keeps the one-click
jump the client asked for while making the cell behave like every other cell in the grid.
(Siblings, not nesting — a `<button>` inside a `<button>` is invalid HTML and browsers recover
from it unpredictably.)

The faded chip itself is unchanged: the client asked for the original to stay visible, and
unlike the cleared case it carries information worth the space — *which* booking, and a way to
follow it.
