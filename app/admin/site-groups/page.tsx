// import { redirect } from "next/navigation";
// import { getSiteGroups } from "@/lib/db/admin-queries";
// import { listCompaniesForPicker } from "@/lib/db/queries";
// import { SiteGroupsPanel } from "@/components/admin/site-groups-panel";
// import { requireRole } from "@/lib/auth/require-role";
//
// const ADMIN_ROLES = ["admin", "super_admin"] as const;
//
// export const dynamic = "force-dynamic";
//
// export default async function SiteGroupsPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
//   const actor = await requireRole([...ADMIN_ROLES]);
//   if (!actor) redirect("/login");
//
//   // Always ONE resolved company — unlike the audit-style admin lists, mixing same-named
//   // sites from different companies in one grouping picker would be genuinely confusing,
//   // not just a scoping technicality. Mirrors app/(planner)/page.tsx's own picker pattern.
//   let companyId: number;
//   let pickableCompanies: { id: number; name: string }[] = [];
//   if (actor.companyAccess.kind === "any") {
//     pickableCompanies = await listCompaniesForPicker();
//     const sp = await searchParams;
//     const requestedId = sp.company ? Number(sp.company) : NaN;
//     const requested = pickableCompanies.find((c) => c.id === requestedId);
//     companyId = requested?.id ?? pickableCompanies[0]?.id ?? 0;
//   } else {
//     companyId = actor.companyAccess.companyId;
//   }
//
//   const groups = companyId ? await getSiteGroups(companyId) : [];
//
//   return (
//     <div className="p-6">
//       <h1 className="text-xl font-bold text-[#333333]">Site groups</h1>
//       <p className="mt-1 max-w-[640px] text-[13px] text-[#757575]">
//         Some sites are really several pads at one location (TMS gives us each pad as its own
//         site). Group pad sites under a parent here — the booking drawer will then ask
//         &quot;which pad?&quot; when a scheduler picks the parent. Grouping is purely local
//         organisation; it never changes what an existing booking&apos;s site points at.
//       </p>
//
//       {pickableCompanies.length > 1 && (
//         <form className="mt-4 flex items-center gap-2" action="/admin/site-groups">
//           <label className="text-[13px] text-[#757575]" htmlFor="company">
//             Company
//           </label>
//           <select
//             id="company"
//             name="company"
//             defaultValue={companyId}
//             className="rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
//           >
//             {pickableCompanies.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {c.name}
//               </option>
//             ))}
//           </select>
//           <button
//             type="submit"
//             className="rounded-full border border-[#e6e6e6] px-3.5 py-1.5 text-[13px] font-medium text-[#333333] hover:bg-[#f7f9fc]"
//           >
//             Switch
//           </button>
//         </form>
//       )}
//
//       {!companyId ? (
//         <div className="mt-5 rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center text-sm text-[#9a9a9a]">
//           No company configured yet.
//         </div>
//       ) : (
//         <SiteGroupsPanel companyId={companyId} groups={groups} />
//       )}
//     </div>
//   );
// }

export default function SiteGroupsPageDisabled() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">Site groups</h1>
      <p className="mt-2 text-[13px] text-[#757575]">
        This feature is currently disabled.
      </p>
    </div>
  );
}
