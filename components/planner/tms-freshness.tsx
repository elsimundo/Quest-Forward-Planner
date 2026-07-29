"use client";

import { useEffect, useState } from "react";

// Stage E1: makes the 5-minute TMS refresh cycle visible, so "why hasn't my colleague's TMS
// change appeared yet?" has a visible answer instead of feeling like a bug
// (docs/TMS_WRITE_BACK.md §7, docs/OVERLAY_BUILD_PLAN.md E1/E2).
//
// The time is formatted AFTER mount, never during render. `fetchedAt` is a server value, and
// the server and the browser are not in the same timezone in production (the server runs UTC;
// the schedulers are on UK time, which is UTC+1 for most of the year). Formatting it during
// render would produce different text on each side and trip a hydration mismatch — and worse,
// would briefly show an hour-wrong time. Both sides render the same placeholder first, then
// the browser fills in its own local time.
export function TmsFreshness({ fetchedAtIso }: { fetchedAtIso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const at = new Date(fetchedAtIso);
    const render = () => {
      const ageMs = Date.now() - at.getTime();
      const mins = Math.floor(ageMs / 60_000);
      const clock = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLabel(mins < 1 ? `${clock} · just now` : `${clock} · ${mins}m ago`);
    };
    render();
    // Re-render the age each half-minute. The underlying data doesn't change here — the grid's
    // own ~10s poll does that — this only keeps the "Nm ago" honest between those refreshes.
    const id = setInterval(render, 30_000);
    return () => clearInterval(id);
  }, [fetchedAtIso]);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap text-[#9a9a9a]"
      title="When the planner last read the live schedule from TMS. TMS data refreshes every 5 minutes; your own unpublished changes update immediately."
    >
      <span aria-hidden className="text-[9px] leading-none">
        ●
      </span>
      TMS {label ?? "—"}
    </span>
  );
}
