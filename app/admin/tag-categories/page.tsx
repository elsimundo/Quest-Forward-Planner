import { redirect } from "next/navigation";
import { getTmsCompanyId, listCompaniesForPicker } from "@/lib/db/queries";
import { listTagCategoryAssignments } from "@/lib/db/admin-queries";
import { listTmsBookingTags } from "@/lib/db/tms/queries";
import { TagCategoriesPanel } from "@/components/admin/tag-categories-panel";
import { CompanyPicker } from "@/components/planner/company-picker";
import { requireRole } from "@/lib/auth/require-role";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export const dynamic = "force-dynamic";

export default async function TagCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) redirect("/login");

  // TMS's `booking_tags` catalogue is company-scoped (docs/DECISIONS.md #51), so — unlike
  // most admin pages here — this one needs a specific company to even list tags for. A
  // company-locked admin just gets their own; a super_admin (or Quest staff) picks one,
  // same `?company=` pattern as the planner grid.
  let companyId: number;
  let pickableCompanies: { id: number; name: string }[] = [];
  if (actor.companyAccess.kind === "any") {
    pickableCompanies = await listCompaniesForPicker();
    const { company: companyParam } = await searchParams;
    const requestedId = companyParam ? Number(companyParam) : NaN;
    const requested = pickableCompanies.find((c) => c.id === requestedId);
    companyId = requested?.id ?? pickableCompanies[0]?.id ?? 0;
  } else {
    companyId = actor.companyAccess.companyId;
  }

  const tmsCompanyId = companyId ? await getTmsCompanyId(companyId) : null;
  const [tags, assignments] = await Promise.all([
    tmsCompanyId ? listTmsBookingTags(tmsCompanyId) : Promise.resolve([]),
    listTagCategoryAssignments(),
  ]);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#333333]">Tag categories</h1>
          <p className="mt-1 max-w-[640px] text-[13px] text-[#757575]">
            Designate which of TMS&apos;s live booking tags mean something structural —
            generator required, parking required, and so on — beyond just being a tag. The
            grid shows a marker when a booking carries a generator tag; category data is
            also what a future downstream export reads.
          </p>
        </div>
        {pickableCompanies.length > 0 && <CompanyPicker companies={pickableCompanies} activeCompanyId={companyId} />}
      </div>

      {!tmsCompanyId ? (
        <p className="mt-5 text-[13px] text-[#757575]">
          This company isn&apos;t linked to a TMS company yet, so it has no tag catalogue to browse.
        </p>
      ) : (
        <TagCategoriesPanel tags={tags} assignments={assignments} />
      )}
    </div>
  );
}
