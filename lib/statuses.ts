import type { Status } from "@/lib/db/schema";

// Exact colours from reference/quest-ct-forward-planner.jsx's STATUSES object — this is
// the client-approved palette, not a reinterpretation. Keep in sync if that file changes.
export const STATUS_CONFIG: Record<Status, { label: string; bg: string; bar: string; text: string; border: string }> = {
  confirmed: { label: "Confirmed", bg: "#ffffff", bar: "#214b7f", text: "#333333", border: "#e6e6e6" },
  weekend: { label: "Weekend confirmed", bg: "#eef0f4", bar: "#8b94a3", text: "#4a5261", border: "#dde1e8" },
  likely: { label: "Likely — awaiting confirmation", bg: "#e9f4ec", bar: "#3d7f53", text: "#28563a", border: "#cfe6d6" },
  bidding: { label: "Bidding for contract", bg: "#f9ebeb", bar: "#b13a3a", text: "#7c2a2a", border: "#efd3d3" },
  service: { label: "Corrective works / service", bg: "#e8f4fb", bar: "#2b7bb9", text: "#1f5a87", border: "#cfe6f5" },
  tbc: { label: "Site to be confirmed", bg: "#fdf1e7", bar: "#f17f42", text: "#9a4d1e", border: "#f6ddc8" },
  cancelled: { label: "Cancelled by customer — chargeable", bg: "#f9ebf6", bar: "#c355ac", text: "#7d2f6c", border: "#eed2e8" },
  bankholiday: { label: "Bank holiday", bg: "#fbf4e2", bar: "#e0a826", text: "#7a5c10", border: "#f1e3bb" },
};

export const STATUS_ORDER: Status[] = [
  "confirmed",
  "likely",
  "tbc",
  "bidding",
  "service",
  "cancelled",
  "weekend",
  "bankholiday",
];

// Statuses a scheduler can pick in the drawer (SPEC.md §5) — weekend/bankholiday are
// calendar-derived, not user-selectable. Not used in this read-only slice, but kept
// alongside STATUS_CONFIG since the drawer (slice 4) needs the same source of truth.
export const EDITABLE_STATUSES: Status[] = ["confirmed", "likely", "tbc", "bidding", "service", "cancelled"];

// Half-strength status colour for chip borders (no left bar — team decision, SPEC §4).
export function tintBorder(hex: string, alpha = 0.5): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
