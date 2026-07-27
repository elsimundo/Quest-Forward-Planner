import { NextResponse } from "next/server";
import { runTmsSync } from "@/lib/db/tms/sync";

// Webhook for an EXTERNAL scheduler to trigger the nightly reference sync
// (docs/TMS_INTEGRATION_PLAN.md §6A: "nightly cron + a manual button"). This app runs as a
// single Docker container on Coolify with no built-in job scheduler (see Dockerfile), so
// "nightly cron" has to be wired up outside the app — a Coolify scheduled task, a k8s
// CronJob, or an external pinger (e.g. cron-job.org) hitting this route on a schedule.
// That wiring is an ops/deployment decision, not something this code can choose for you —
// point whichever mechanism you use at this URL with the shared secret below.
//
// No session exists for an automated caller, so this checks a shared secret instead of
// requireRole(). Set TMS_SYNC_CRON_SECRET in the deployment env and configure the
// scheduler to send it as `Authorization: Bearer <secret>`.
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
    // triggeredBy: null — this is the marker for "an automated run," not a person
    // (docs/TMS_INTEGRATION_PLAN.md §6A; see tms_sync_runs.triggered_by).
    const { runId, summary } = await runTmsSync(null);
    return NextResponse.json({ ok: true, runId, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
