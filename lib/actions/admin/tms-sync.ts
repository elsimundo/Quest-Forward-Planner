"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { runTmsSync, type TmsSyncSummary } from "@/lib/db/tms/sync";

// super_admin-only (docs/TMS_INTEGRATION_PLAN.md §11) — a single run now syncs EVERY
// scheduling-enabled TMS company in one go, not just the caller's own, so a company-scoped
// `admin` triggering it (or seeing its per-company counts in the result) would be acting
// and seeing outside their own company's boundary. Was `["admin", "super_admin"]` back when
// this only ever touched InHealth.
const SYNC_ROLES = ["super_admin"] as const;

export type TriggerSyncResult = { ok: true; summary: TmsSyncSummary } | { ok: false; error: string };

export async function triggerTmsSync(): Promise<TriggerSyncResult> {
  const actor = await requireRole([...SYNC_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to run the TMS sync." };

  try {
    const { summary } = await runTmsSync(actor.id);
    revalidatePath("/admin/tms-sync");
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed." };
  }
}
