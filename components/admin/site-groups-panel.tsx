"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSiteGroup, setSiteParent, searchSitesToGroup } from "@/lib/actions/admin/site-groups";

type SiteGroup = { id: number; name: string; children: { id: number; name: string }[] };

export function SiteGroupsPanel({ companyId, groups }: { companyId: number; groups: SiteGroup[] }) {
  const router = useRouter();
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const name = newGroupName.trim();
    if (!name) return;
    setCreating(true);
    const result = await createSiteGroup(companyId, name);
    setCreating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Created "${name}" — add pads to it below`);
    setNewGroupName("");
    router.refresh();
  }

  return (
    <div className="mt-5">
      <div className="flex items-end gap-2.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#333333]">New group name</label>
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g. Kent & Canterbury Hospital"
            className="w-[280px] rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
          />
        </div>
        <button
          onClick={() => void handleCreate()}
          disabled={!newGroupName.trim() || creating}
          className="rounded-full bg-[#1a3d69] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
        >
          Create group
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {groups.map((g) => (
          <GroupCard key={g.id} companyId={companyId} group={g} />
        ))}
        {groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#e6e6e6] p-8 text-center text-sm text-[#9a9a9a]">
            No groups yet — create one above, then add pad sites to it.
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ companyId, group }: { companyId: number; group: SiteGroup }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const handle = setTimeout(async () => {
      const results = await searchSitesToGroup(companyId, query, group.id);
      setMatches(results.filter((m) => !group.children.some((c) => c.id === m.id)));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, companyId, group.id, group.children]);

  async function handleAdd(siteId: number, name: string) {
    setPending(true);
    const result = await setSiteParent(siteId, group.id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Added ${name} to ${group.name}`);
    setQuery("");
    setMatches([]);
    router.refresh();
  }

  async function handleRemove(siteId: number, name: string) {
    setPending(true);
    const result = await setSiteParent(siteId, null);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Removed ${name} from ${group.name}`);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[#e6e6e6] p-4">
      <h2 className="text-[14px] font-bold text-[#333333]">{group.name}</h2>

      <div className="mt-3 flex flex-col gap-1.5">
        {group.children.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] px-3.5 py-2">
            <span className="flex-1 text-[13px] text-[#333333]">{c.name}</span>
            <button
              onClick={() => void handleRemove(c.id, c.name)}
              disabled={pending}
              className="text-xs text-[#b13a3a] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b7bb9]"
            >
              Remove
            </button>
          </div>
        ))}
        {group.children.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#e6e6e6] px-3.5 py-3 text-xs text-[#9a9a9a]">
            No pads in this group yet.
          </div>
        )}
      </div>

      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setMatches([]);
          }}
          placeholder="Search a site to add as a pad…"
          className="w-full rounded-lg border border-[#e6e6e6] px-3 py-2 text-[13px] outline-none focus:border-[#2b7bb9]"
        />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-md">
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={() => void handleAdd(m.id, m.name)}
                className="block w-full border-b px-3.5 py-2.5 text-left text-[13px] text-[#333333] last:border-b-0 hover:bg-[#f7f9fc] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2b7bb9]"
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
