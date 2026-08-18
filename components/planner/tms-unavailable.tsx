"use client";

import { useRouter } from "next/navigation";
import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Stage E1 (docs/OVERLAY_BUILD_PLAN.md). Under the overlay model the planner holds no copy of
// TMS's bookings, so if TMS is unreachable there is genuinely nothing to show — the client
// chose a connection error over a stale grid (docs/TMS_WRITE_BACK.md §8, and Dave directly:
// "I think we just fail to load, or load display a connection error if TMS is down").
//
// Deliberately says nothing about the user's own amendments being lost, because they aren't:
// they're in our Postgres and reappear the moment TMS is back. Saying "your work is safe" is
// the single most useful thing here — the natural fear on seeing this screen is that the
// afternoon's planning went with the connection.
export function TmsUnavailable({ detail }: { detail?: string }) {
  const router = useRouter();

  return (
    <main className="flex flex-1 items-center justify-center bg-[var(--quest-surface-alt)] p-8">
      <div className="max-w-[460px] text-center">
        <div className="flex justify-center text-[#e0a826]" aria-hidden>
          <TriangleAlertIcon className="size-9" />
        </div>
        <h1 className="mt-3 text-lg font-bold text-[#333333]">Can&apos;t reach TMS</h1>
        <p className="mt-2 text-[13px] leading-[19px] text-[#757575]">
          The planner reads the live schedule straight from TMS, so it can&apos;t show the grid
          while the connection is down. This is usually temporary.
        </p>
        <p className="mt-3 rounded-[10px] bg-[#eef4ec] px-3.5 py-2.5 text-[13px] leading-[19px] text-[#2f6b3f]">
          Your own changes are safe. Anything you&apos;d planned but not yet published is stored
          here, not in TMS, and will be waiting when the connection is back.
        </p>
        <div className="mt-4 flex justify-center gap-2.5">
          <Button onClick={() => router.refresh()}>Try again</Button>
        </div>
        {detail && (
          <p className="mt-4 font-mono text-[11px] break-words text-[#9a9a9a]">{detail}</p>
        )}
      </div>
    </main>
  );
}
