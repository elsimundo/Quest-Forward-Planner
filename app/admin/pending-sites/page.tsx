import { getPendingSites } from "@/lib/db/admin-queries";
import { PendingSiteRow } from "@/components/admin/pending-site-row";

export const dynamic = "force-dynamic";

export default async function PendingSitesPage() {
  const sites = await getPendingSites();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">Pending sites</h1>
      <p className="mt-1 text-[13px] text-[#757575]">
        Sites created via free-text in the booking drawer. Approve as a genuine new site,
        merge into an existing one if it&apos;s a duplicate or typo, or reject.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {sites.map((s) => (
          <PendingSiteRow key={s.id} site={s} />
        ))}
        {sites.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center text-sm text-[#9a9a9a]">
            Nothing waiting for review.
          </div>
        )}
      </div>
    </div>
  );
}
