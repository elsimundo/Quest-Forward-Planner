"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Catches genuinely unexpected failures. A TMS outage does NOT reach here — page.tsx handles
// that case explicitly with its own screen (components/planner/tms-unavailable.tsx), because
// it's an expected operational state with a specific, reassuring message. What lands here is
// the other kind: a bug.
//
// So this deliberately does NOT blame TMS or suggest the connection is at fault. Telling
// someone "try again in a moment" when the real cause is a defect just wastes their time and
// buries the report we actually need.
export default function PlannerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Next redacts server error messages before they reach the browser in production, leaving
    // only `digest` — which is the key for finding the real stack in the server logs. Logging
    // it here is what makes a user's screenshot traceable to an actual error.
    console.error("Planner error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center bg-[var(--quest-surface-alt)] p-8">
      <div className="max-w-[460px] text-center">
        <div className="text-3xl" aria-hidden>
          ⚠
        </div>
        <h1 className="mt-3 text-lg font-bold text-[#333333]">Something went wrong</h1>
        <p className="mt-2 text-[13px] leading-[19px] text-[#757575]">
          The planner hit an unexpected error loading this page. Your saved bookings
          aren&apos;t affected.
        </p>
        <div className="mt-4 flex justify-center gap-2.5">
          <Button onClick={reset}>Try again</Button>
        </div>
        {error.digest && (
          <p className="mt-4 text-[11px] text-[#9a9a9a]">
            Quote this when reporting it: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
