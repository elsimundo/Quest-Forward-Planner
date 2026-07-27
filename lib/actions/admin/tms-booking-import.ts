"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { runTmsBookingImport, type BookingImportSummary } from "@/lib/db/tms/booking-import";

// Same super_admin-only gate as the reference sync, same reason — see
// lib/actions/admin/tms-sync.ts.
const IMPORT_ROLES = ["super_admin"] as const;

export type TriggerImportResult = { ok: true; summary: BookingImportSummary } | { ok: false; error: string };

export async function triggerTmsBookingImport(): Promise<TriggerImportResult> {
  const actor = await requireRole([...IMPORT_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to run the TMS booking import." };

  try {
    const { summary } = await runTmsBookingImport(actor.id);
    revalidatePath("/admin/tms-bookings");
    revalidatePath("/");
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed." };
  }
}
