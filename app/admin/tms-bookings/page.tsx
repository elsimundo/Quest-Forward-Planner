import { redirect } from "next/navigation";
import { getRecentTmsBookingImportRuns } from "@/lib/db/admin-queries";
import { TmsBookingImportPanel } from "@/components/admin/tms-booking-import-panel";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function TmsBookingImportPage() {
  // super_admin-only — same reasoning as /admin/tms-sync: a run spans every
  // scheduling-enabled company at once (docs/TMS_INTEGRATION_PLAN.md §11).
  const actor = await requireRole(["super_admin"]);
  if (!actor) redirect("/login");
  const runs = await getRecentTmsBookingImportRuns();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">TMS bookings</h1>
      <p className="mt-1 max-w-[640px] text-[13px] text-[#757575]">
        Brings every scheduling-enabled TMS company&apos;s confirmed bookings into the
        planner as the baseline to plan against. Run the TMS sync first — units and sites
        are resolved from what&apos;s already synced, not looked up in TMS directly. A
        booking never gets silently overwritten: if TMS and a local edit both changed the
        same booking, it&apos;s flagged as a conflict instead, and the scheduler resolves it
        by editing and re-saving that cell as normal.
      </p>

      <TmsBookingImportPanel runs={runs} />
    </div>
  );
}
