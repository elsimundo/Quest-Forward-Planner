import { redirect } from "next/navigation";
import { getRecentTmsSyncRuns } from "@/lib/db/admin-queries";
import { TmsSyncPanel } from "@/components/admin/tms-sync-panel";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function TmsSyncPage() {
  // super_admin-only — a run spans every scheduling-enabled company at once
  // (docs/TMS_INTEGRATION_PLAN.md §11), so a company-scoped admin has no business
  // triggering it or seeing its cross-company counts.
  const actor = await requireRole(["super_admin"]);
  if (!actor) redirect("/login");
  const runs = await getRecentTmsSyncRuns();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">TMS sync</h1>
      <p className="mt-1 max-w-[640px] text-[13px] text-[#757575]">
        Mirrors every scheduling-enabled TMS company&apos;s units, sites, and unit↔modality
        tags into this app, read-only. A TMS row that&apos;s gone or soft-deleted is
        soft-deleted here too; nothing this app owns (descriptions, display order,
        capability requirements) is touched. Runs nightly via an external scheduler hitting{" "}
        <code>/api/tms-sync</code>, or on demand below.
      </p>

      <TmsSyncPanel runs={runs} />
    </div>
  );
}
