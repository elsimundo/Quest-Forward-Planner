import type { Status } from "@/lib/db/schema";

// Publishability is DATA, not a constant — it lives on `booking_statuses.publishable`
// (migration 0012) so an admin can change it without a code change, at the client's request
// (docs/TMS_WRITE_BACK.md §3.3). This replaced a hardcoded PUBLISHABLE_STATUS_KEYS list.
//
// Read it from the status catalogue (`StatusView.publishable`) on both sides — the server
// gate in lib/actions/publish.ts and the client's eligibility counts in
// components/planner/planner-grid.tsx — so the "Publish N" button can never promise more
// than the server will actually publish. Don't reintroduce a hardcoded list: the whole
// point is that the two sides read one source.
//
// The seed values below reproduce the original client-confirmed rule (docs/DECISIONS.md
// #24): `confirmed` plus its two calendar-derived forms, since weekend/bank holiday are
// just a confirmed booking's label for that day, not a separate in-discussion state.

// The client-approved render palette for a status, matching
// reference/quest-ct-forward-planner.jsx. As of the TMS work the live values come from the
// admin-managed `bookingStatuses` table (docs/DECISIONS.md #18); the map below is the SEED
// those rows are created from, and doubles as a render fallback for any status key the
// catalogue somehow doesn't cover (e.g. a status retired mid-session but still on screen).
export type StatusView = {
  key: string;
  label: string;
  bg: string;
  bar: string;
  text: string;
  border: string;
  editable: boolean;
  calendarDerived: boolean;
  displayOrder: number;
  // May a booking in this status be forwarded to TMS? See the note at the top of this file.
  publishable: boolean;
  // false = retired; still renders on historical bookings but not offered in the picker.
  active: boolean;
};

type SeedStatus = {
  label: string;
  bg: string;
  bar: string;
  text: string;
  border: string;
  editable: boolean;
  calendarDerived: boolean;
  billable: boolean;
  publishable: boolean;
};

// Ordered seed catalogue — the single source the migration seeds from and the code falls
// back to.
//
// `bg` is the status indicator, and it is the ONLY status indicator on a grid chip
// (docs/DECISIONS.md #38). Each one is its own `bar` colour mixed 28% over white — a single
// derivation rather than eight hand-picked tints, so the palette stays internally consistent
// and a status added later can follow the same rule. The original values were the same bars at
// roughly 7%, which is where the problem was: at that strength `cancelled`'s pale pink and
// `confirmed`'s plain white are indistinguishable in a wall of cells, so the saturated `text`
// colour had quietly become the real indicator instead of the fill.
//
// 28% is a ceiling as much as a target. It has to stay light enough for the chip's fixed
// #333333 label (every value below clears 8:1, i.e. AAA) and light enough that the sync wash
// — 14% of the blue accent mixed *into* this bg, docs/DECISIONS.md #31/#32 — is still a
// visible shift rather than a change to an already-saturated colour. Raising it much past 28%
// starts eating the wash. Retune the ratio here and in migration 0014 together.
//
// `confirmed` deliberately stays pure white: it's the overwhelming majority of the grid, so
// tinting it would make everything loud and leave nothing to read the exceptions against — and
// the blue sync wash needs a white base to read against most of all, since "Confirmed here but
// not yet in TMS" is the single most common thing that wash has to say.
//
// NOTE: `bg` is admin-editable data at runtime (`booking_statuses.color_bg`); this map is the
// SEED plus the render fallback. Changing a value here does NOT change an existing database —
// that needs a migration, and migration 0014 is the one that moved the live rows to these.
export const SEED_STATUSES: Record<Status, SeedStatus> = {
  confirmed: { label: "Confirmed", bg: "#ffffff", bar: "#214b7f", text: "#333333", border: "#e6e6e6", editable: true, calendarDerived: false, billable: true, publishable: true },
  likely: { label: "Likely — awaiting confirmation", bg: "#c9dbcf", bar: "#3d7f53", text: "#28563a", border: "#cfe6d6", editable: true, calendarDerived: false, billable: false, publishable: false },
  tbc: { label: "Site to be confirmed", bg: "#fbdbca", bar: "#f17f42", text: "#9a4d1e", border: "#f6ddc8", editable: true, calendarDerived: false, billable: false, publishable: false },
  bidding: { label: "Bidding for contract", bg: "#e9c8c8", bar: "#b13a3a", text: "#7c2a2a", border: "#efd3d3", editable: true, calendarDerived: false, billable: false, publishable: false },
  service: { label: "Corrective works / service", bg: "#c5e4f4", bar: "#2f9fd6", text: "#0a5273", border: "#def0f8", editable: true, calendarDerived: false, billable: false, publishable: false },
  cancelled: { label: "Cancelled by customer — chargeable", bg: "#eecfe8", bar: "#c355ac", text: "#7d2f6c", border: "#eed2e8", editable: true, calendarDerived: false, billable: true, publishable: false },
  weekend: { label: "Weekend confirmed", bg: "#dfe1e5", bar: "#8b94a3", text: "#4a5261", border: "#dde1e8", editable: false, calendarDerived: true, billable: true, publishable: true },
  bankholiday: { label: "Bank holiday", bg: "#f6e7c2", bar: "#e0a826", text: "#7a5c10", border: "#f1e3bb", editable: false, calendarDerived: true, billable: true, publishable: true },
};

// Seed order: editable statuses first in their intended picker order, then the two
// calendar-derived ones. Array index drives `display_order` at seed time.
export const SEED_STATUS_ORDER: Status[] = [
  "confirmed",
  "likely",
  "tbc",
  "bidding",
  "service",
  "cancelled",
  "weekend",
  "bankholiday",
];

// The default a fresh booking takes — one of the keys the app reasons about structurally
// regardless of what admins do to the rest of the catalogue.
export const DEFAULT_STATUS_KEY: Status = "confirmed";

function seedView(key: Status): StatusView {
  const s = SEED_STATUSES[key];
  return {
    key,
    label: s.label,
    bg: s.bg,
    bar: s.bar,
    text: s.text,
    border: s.border,
    editable: s.editable,
    calendarDerived: s.calendarDerived,
    displayOrder: SEED_STATUS_ORDER.indexOf(key),
    publishable: s.publishable,
    active: true,
  };
}

// Render fallback for a key the live catalogue doesn't include — a seed view if it's one of
// the eight, otherwise a neutral grey chip so an unknown status never crashes a cell.
export function fallbackStatusView(key: string): StatusView {
  if ((SEED_STATUS_ORDER as string[]).includes(key)) return seedView(key as Status);
  return {
    key,
    label: key,
    bg: "#f2f2f2",
    bar: "#9a9a9a",
    text: "#555555",
    border: "#e0e0e0",
    editable: true,
    calendarDerived: false,
    displayOrder: 999,
    // An unrecognised status is never publishable — forwarding to TMS is the consequential
    // direction, so an unknown key fails closed rather than open.
    publishable: false,
    active: true,
  };
}

// A lookup over the live catalogue with the fallback baked in — the shape client components
// consume. `all` is display-ordered; `get` never returns undefined.
export type StatusCatalog = {
  all: StatusView[];
  get: (key: string) => StatusView;
};

export function makeStatusCatalog(views: StatusView[]): StatusCatalog {
  const byKey = new Map(views.map((v) => [v.key, v]));
  return {
    all: [...views].sort((a, b) => a.displayOrder - b.displayOrder),
    get: (key: string) => byKey.get(key) ?? fallbackStatusView(key),
  };
}

// Half-strength status colour for chip borders (no left bar — team decision, SPEC §4).
export function tintBorder(hex: string, alpha = 0.5): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Blends `hex` toward `into` by `ratio` (0..1) and returns a solid hex colour — unlike
// tintBorder's rgba, this needs to be opaque because it's used as a chip's own fill, not an
// overlay on top of one. Used for the "not yet in TMS" background wash
// (docs/DECISIONS.md #31): every status keeps its own colour family, just visibly shifted,
// rather than a single flat colour stamped over all eight.
export function mixHex(hex: string, into: string, ratio: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(into.slice(1), 16);
  const mix = (shift: number) => {
    const av = (a >> shift) & 255;
    const bv = (b >> shift) & 255;
    return Math.round(av * (1 - ratio) + bv * ratio)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(16)}${mix(8)}${mix(0)}`;
}
