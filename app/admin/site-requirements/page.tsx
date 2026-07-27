import { redirect } from "next/navigation";
import { getAllSitesBasic, getAllSiteCapabilityRequirementsBySite, getKnownSpecKeys } from "@/lib/db/admin-queries";
import { SiteRequirementsPanel } from "@/components/admin/site-requirements-panel";
import { requireRole } from "@/lib/auth/require-role";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export const dynamic = "force-dynamic";

export default async function SiteRequirementsPage() {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) redirect("/login");
  const companyId = actor.companyAccess.kind === "any" ? null : actor.companyAccess.companyId;

  const [sites, knownKeys, requirementsBySite] = await Promise.all([
    getAllSitesBasic(companyId),
    getKnownSpecKeys(),
    getAllSiteCapabilityRequirementsBySite(),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">Site requirements</h1>
      <p className="mt-1 text-[13px] text-[#757575]">
        Set which capabilities each site requires — units missing one show a warning in the
        drawer, but it never blocks the booking.
      </p>

      <SiteRequirementsPanel sites={sites} knownKeys={knownKeys} requirementsBySite={requirementsBySite} />
    </div>
  );
}
