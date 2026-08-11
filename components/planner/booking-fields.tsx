"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchSites, getSiteChildren } from "@/lib/actions/sites";
import type { SiteMatch } from "@/lib/db/queries";
import type { SiteInput } from "@/lib/actions/bookings";
import type { StatusView } from "@/lib/statuses";

// The two fields shared by every form that writes a booking: the site type-ahead and the
// status picker. Extracted when bulk booking arrived and needed exactly the same two fields
// as the single-cell drawer.
//
// Worth the extraction rather than a second copy specifically because of the focus handling
// in SiteField below — the onMouseDown/preventDefault dance that keeps the dropdown open is
// the kind of detail a duplicate loses within a release, and losing it doesn't break loudly,
// it just makes the field feel broken.

// When the picked site has children, the dropdown swaps to a "which pad?" prompt listing
// the child sites. `bookedSiteIds` (when provided) lets each pad show a free/booked badge
// for the drawer's date, so the scheduler can see availability at a glance.
type PadPrompt = { parentName: string; children: SiteMatch[] };

export type SiteField = ReturnType<typeof useSiteField>;

export function useSiteField(
  companyId: number,
  initial: { id: number; name: string } | null,
  bookedSiteIds?: Set<number>,
) {
  const [query, setQuery] = useState(initial?.name ?? "");
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(initial);
  const [matches, setMatches] = useState<SiteMatch[]>([]);
  // Drives the dropdown's visibility directly, rather than deriving it from query length —
  // that's what lets focusing an EMPTY field browse the full site list (the client's "or a
  // dropdown list of locations" ask) alongside the existing type-ahead.
  const [open, setOpen] = useState(false);
  // Set when a picked match has pads grouped under it (docs/TMS_INTEGRATION_PLAN.md §5,
  // docs/DECISIONS.md #25) — swaps the dropdown to "which pad?".
  const [padPrompt, setPadPrompt] = useState<PadPrompt | null>(null);

  useEffect(() => {
    if (!open || selected?.name === query) return;
    // No debounce needed to browse the full list (empty query, an immediate DB read keyed
    // only on companyId) — only the type-ahead narrowing needs one. A single-character
    // query hits the same call and comes back empty (searchSites' own ≥2-char rule),
    // so it doesn't need special-casing here.
    const handle = setTimeout(
      async () => setMatches(await searchSites(companyId, query)),
      query.trim().length === 0 ? 0 : 200,
    );
    return () => clearTimeout(handle);
  }, [query, selected, companyId, open]);

  async function pick(m: SiteMatch) {
    if (m.hasChildren) {
      setPadPrompt({
        parentName: m.name,
        children: await getSiteChildren(companyId, m.id),
      });
      return;
    }
    setSelected(m);
    setQuery(m.name);
    setMatches([]);
    setPadPrompt(null);
  }

  return {
    query,
    setQuery,
    selected,
    setSelected,
    matches,
    open,
    setOpen,
    padPrompt,
    setPadPrompt,
    pick,
    bookedSiteIds,
    showMatches: !!padPrompt || (open && selected?.name !== query && matches.length > 0),
    /** What to send the server: an existing site id, or free text for a new pending-review site. */
    get siteInput(): SiteInput {
      return selected && selected.name === query ? { id: selected.id } : { name: query };
    },
  };
}

export function SiteField({ field, label = "Site location" }: { field: SiteField; label?: string }) {
  const booked = field.bookedSiteIds;
  return (
    <>
      <label className="mb-1.5 block text-[13px] font-medium text-[#333333]">{label}</label>
      <Input
        value={field.query}
        onChange={(e) => {
          field.setQuery(e.target.value);
          if (field.selected && e.target.value !== field.selected.name) field.setSelected(null);
          field.setPadPrompt(null); // typing again backs out of a "which pad?" prompt to plain search
        }}
        onFocus={() => field.setOpen(true)}
        onBlur={() => field.setOpen(false)}
        placeholder="Search, browse, or enter a new site…"
      />
      {field.showMatches && (
        <div className="mt-1.5 max-h-64 overflow-y-auto rounded-xl border">
          {field.padPrompt ? (
            <>
              <button
                type="button"
                // preventDefault keeps focus on the Input — without it, the button
                // steals focus on click, which blurs the field and closes the whole
                // dropdown instead of returning to the parent search results.
                onMouseDown={(e) => {
                  e.preventDefault();
                  field.setPadPrompt(null);
                }}
                className="block w-full border-b bg-[#f7f9fc] px-3.5 py-2 text-left text-xs text-[#757575] hover:bg-[#eef2f7] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
              >
                ← Back — which pad at {field.padPrompt.parentName}?
              </button>
              {field.padPrompt.children.map((m) => {
                const isBooked = booked?.has(m.id) ?? false;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={() => void field.pick(m)}
                    className="flex w-full items-center border-b px-3.5 py-2.5 text-left text-[13px] text-[#333333] last:border-b-0 hover:bg-[#f7f9fc] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
                  >
                    <span className="flex-1">{m.name}</span>
                    {booked && (
                      <span
                        className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isBooked ? "bg-[#fde8e8] text-[#b13a3a]" : "bg-[#e8f5e9] text-[#2e7d32]"
                        }`}
                      >
                        {isBooked ? "Booked" : "Free"}
                      </span>
                    )}
                  </button>
                );
              })}
              {field.padPrompt.children.length === 0 && (
                <div className="px-3.5 py-3 text-xs text-[#9a9a9a]">No pads found in this group.</div>
              )}
            </>
          ) : (
            field.matches.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={() => void field.pick(m)}
                className="block w-full border-b px-3.5 py-2.5 text-left text-[13px] text-[#333333] last:border-b-0 hover:bg-[#f7f9fc] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
              >
                {m.name}
                {m.hasChildren && <span className="ml-2 text-xs text-[#757575]">— has pads</span>}
              </button>
            ))
          )}
        </div>
      )}
    </>
  );
}

export function StatusPicker({
  statuses,
  value,
  onChange,
}: {
  statuses: StatusView[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <>
      <label className="mt-5 mb-2 block text-[13px] font-medium text-[#333333]">Status</label>
      <div className="flex flex-col gap-1.5">
        {statuses.map((st) => {
          const on = value === st.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => onChange(st.key)}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2b7bb9]"
              style={{
                borderColor: on ? st.bar : "#e6e6e6",
                background: on ? st.bg : "#fff",
                boxShadow: on ? `inset 3px 0 0 ${st.bar}` : "none",
              }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: st.bar }} />
              <span className="text-[13px]" style={{ color: on ? st.text : "#333333" }}>
                {st.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
