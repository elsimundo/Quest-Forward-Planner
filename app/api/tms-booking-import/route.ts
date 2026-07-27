import { NextResponse } from "next/server";
import { runTmsBookingImport } from "@/lib/db/tms/booking-import";

// Webhook for an external scheduler — same pattern and secret as app/api/tms-sync/route.ts
// (see that file for why this app needs an external trigger rather than an in-process
// timer). Run this AFTER the reference sync — booking import resolves units/sites purely
// from already-synced local rows and skips anything it can't resolve.
export async function POST(request: Request) {
  const secret = process.env.TMS_SYNC_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "TMS_SYNC_CRON_SECRET is not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runId, summary } = await runTmsBookingImport(null);
    return NextResponse.json({ ok: true, runId, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
