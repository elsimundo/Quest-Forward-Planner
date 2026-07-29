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
// back to. Keep in sync with the reference mock-up's STATUSES object if that changes.
export const SEED_STATUSES: Record<Status, SeedStatus> = {
  confirmed: { label: "Confirmed", bg: "#ffffff", bar: "#214b7f", text: "#333333", border: "#e6e6e6", editable: true, calendarDerived: false, billable: true, publishable: true },
  likely: { label: "Likely — awaiting confirmation", bg: "#e9f4ec", bar: "#3d7f53", text: "#28563a", border: "#cfe6d6", editable: true, calendarDerived: false, billable: false, publishable: false },
  tbc: { label: "Site to be confirmed", bg: "#fdf1e7", bar: "#f17f42", text: "#9a4d1e", border: "#f6ddc8", editable: true, calendarDerived: false, billable: false, publishable: false },
  bidding: { label: "Bidding for contract", bg: "#f9ebeb", bar: "#b13a3a", text: "#7c2a2a", border: "#efd3d3", editable: true, calendarDerived: false, billable: false, publishable: false },
  service: { label: "Corrective works / service", bg: "#e8f4fb", bar: "#2b7bb9", text: "#1f5a87", border: "#cfe6f5", editable: true, calendarDerived: false, billable: false, publishable: false },
  cancelled: { label: "Cancelled by customer — chargeable", bg: "#f9ebf6", bar: "#c355ac", text: "#7d2f6c", border: "#eed2e8", editable: true, calendarDerived: false, billable: true, publishable: false },
  weekend: { label: "Weekend confirmed", bg: "#eef0f4", bar: "#8b94a3", text: "#4a5261", border: "#dde1e8", editable: false, calendarDerived: true, billable: true, publishable: true },
  bankholiday: { label: "Bank holiday", bg: "#fbf4e2", bar: "#e0a826", text: "#7a5c10", border: "#f1e3bb", editable: false, calendarDerived: true, billable: true, publishable: true },
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
