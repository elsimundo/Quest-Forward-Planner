"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// super_admin-only (docs/DECISIONS.md #22) — everyone else is hard-locked server-side to
// their own company and never sees this. Only rendered at all when there's a real choice
// (app/(planner)/page.tsx only passes >0 companies here for a super_admin).
export function CompanyPicker({
  companies,
  activeCompanyId,
}: {
  companies: { id: number; name: string }[];
  activeCompanyId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(id: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("company", String(id));
    // Switching company invalidates whatever modality was selected — that modality may
    // not even exist for the new company — so let the page re-resolve a sensible default
    // (CT, or the new company's first modality) rather than carrying a stale one over.
    params.delete("modality");
    router.push(`${pathname}?${params.toString()}`);
  }

  if (companies.length <= 1) return null;

  return (
    <select
      value={activeCompanyId}
      onChange={(e) => onChange(Number(e.target.value))}
      title="Viewing as super admin — pick a company"
      className="rounded-full border border-white/25 bg-transparent px-3.5 py-1.5 text-[13px] text-white/85 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id} className="text-[#333333]">
          {c.name}
        </option>
      ))}
    </select>
  );
}
