"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setSiteRequirement, removeSiteRequirement } from "@/lib/actions/admin/site-requirements";

type Requirement = { id: number; requirementKey: string; required: boolean };
type Site = { id: number; name: string };

export function SiteRequirementsPanel({
  sites,
  knownKeys,
  requirementsBySite,
}: {
  sites: Site[];
  knownKeys: string[];
  requirementsBySite: Record<number, Requirement[]>;
}) {
  const [siteQuery, setSiteQuery] = useState("");
  const [activeSite, setActiveSite] = useState<Site | null>(null);

  const filtered = siteQuery.trim().length >= 1 ? sites.filter((s) => s.name.toLowerCase().includes(siteQuery.trim().toLowerCase())).slice(0, 20) : [];

  return (
    <div className="mt-5 flex gap-6">
      <div className="w-[280px] shrink-0">
        <input
          value={siteQuery}
          onChange={(e) => setSiteQuery(e.target.value)}
          placeholder="Search sites…"
          className="w-full rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
        />
        <div className="mt-2 max-h-[520px] overflow-y-auto rounded-xl border border-[#e6e6e6]">
          {filtered.map((s) => {
            const count = (requirementsBySite[s.id] ?? []).length;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSite(s)}
                className="flex w-full items-center justify-between border-b border-[#f7f9fc] px-3.5 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-[#f7f9fc] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
                style={{ background: activeSite?.id === s.id ? "#f0f7ff" : undefined }}
              >
                <span className="truncate text-[#333333]">{s.name}</span>
                {count > 0 && <span className="ml-2 shrink-0 text-xs text-[#757575]">{count}</span>}
              </button>
            );
          })}
          {siteQuery.trim().length >= 1 && filtered.length === 0 && (
            <div className="px-3.5 py-4 text-center text-xs text-[#9a9a9a]">No matching sites.</div>
          )}
          {siteQuery.trim().length === 0 && (
            <div className="px-3.5 py-4 text-center text-xs text-[#9a9a9a]">Search for a site to manage.</div>
          )}
        </div>
      </div>

      <div className="flex-1">
        {activeSite ? (
          <SiteRequirementsEditor
            key={activeSite.id}
            site={activeSite}
            knownKeys={knownKeys}
            initialRequirements={requirementsBySite[activeSite.id] ?? []}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center text-sm text-[#9a9a9a]">
            Pick a site on the left to set its required capabilities.
          </div>
        )}
      </div>
    </div>
  );
}

function SiteRequirementsEditor({
  site,
  knownKeys,
  initialRequirements,
}: {
  site: Site;
  knownKeys: string[];
  initialRequirements: Requirement[];
}) {
  const [requirements, setRequirements] = useState(initialRequirements);
  const [newKey, setNewKey] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const availableKeys = knownKeys.filter((k) => !requirements.some((r) => r.requirementKey === k));

  async function handleAdd() {
    if (!newKey) return;
    setPending(true);
    const result = await setSiteRequirement({ siteId: site.id, requirementKey: newKey, required: true });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Added ${newKey} to ${site.name}`);
    setRequirements((prev) => [...prev, { id: result.id, requirementKey: newKey, required: true }]);
    setNewKey("");
    router.refresh();
  }

  async function handleToggle(req: Requirement) {
    setPending(true);
    const result = await setSiteRequirement({ siteId: site.id, requirementKey: req.requirementKey, required: !req.required });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRequirements((prev) => prev.map((r) => (r.id === req.id ? { ...r, required: !r.required } : r)));
    router.refresh();
  }

  async function handleRemove(req: Requirement) {
    setPending(true);
    const result = await removeSiteRequirement({ id: req.id });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRequirements((prev) => prev.filter((r) => r.id !== req.id));
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-[14px] font-bold text-[#333333]">{site.name}</h2>
      <p className="mt-1 text-xs text-[#757575]">
        Required capabilities drive the drawer&apos;s mismatch warning (SPEC.md §2a) — matched
        against each unit&apos;s spec sheet by name.
      </p>

      <div className="mt-4 flex flex-col gap-1.5">
        {requirements.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] px-3.5 py-2.5">
            <span className="flex-1 text-[13px] text-[#333333]">{r.requirementKey}</span>
            <label className="flex items-center gap-1.5 text-xs text-[#757575]">
              <input
                type="checkbox"
                checked={r.required}
                disabled={pending}
                onChange={() => void handleToggle(r)}
              />
              Required
            </label>
            <button
              onClick={() => void handleRemove(r)}
              disabled={pending}
              className="text-xs text-[#b13a3a] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
            >
              Remove
            </button>
          </div>
        ))}
        {requirements.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#e6e6e6] px-3.5 py-3 text-xs text-[#9a9a9a]">
            No requirements set — this site accepts any unit with no capability warnings.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <select
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1 rounded-lg border border-[#e6e6e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
        >
          <option value="">Pick a capability…</option>
          {availableKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!newKey || pending}
          className="rounded-full bg-[#1a3d69] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          Add
        </button>
      </div>
    </div>
  );
}
