"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TmsBookingTag } from "@/lib/db/tms/queries";
import type { TagCategoryAssignmentRow } from "@/lib/db/admin-queries";
import { TAG_CATEGORIES, type TagCategory } from "@/lib/db/schema";
import { setTagCategory } from "@/lib/actions/admin/tag-categories";

const CATEGORY_LABEL: Record<TagCategory, string> = {
  generator: "Generator",
  parking: "Parking",
};

export function TagCategoriesPanel({
  tags,
  assignments,
}: {
  tags: TmsBookingTag[];
  assignments: TagCategoryAssignmentRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistic local view keyed "tagId:category" — the server call is the source of
  // truth (router.refresh() reconciles it), this just makes a checkbox click feel instant
  // rather than waiting a round trip for the row it's in to re-render.
  const [localOverrides, setLocalOverrides] = useState<Map<string, boolean>>(new Map());

  const assignedSet = new Set(assignments.map((a) => `${a.tmsTagId}:${a.category}`));
  function isAssigned(tagId: number, category: TagCategory): boolean {
    const key = `${tagId}:${category}`;
    return localOverrides.has(key) ? localOverrides.get(key)! : assignedSet.has(key);
  }

  function toggle(tagId: number, category: TagCategory, enabled: boolean) {
    const key = `${tagId}:${category}`;
    setLocalOverrides((prev) => new Map(prev).set(key, enabled));
    startTransition(async () => {
      const result = await setTagCategory({ tmsTagId: tagId, category, enabled });
      if (!result.ok) {
        toast.error(result.error);
        setLocalOverrides((prev) => new Map(prev).set(key, !enabled));
        return;
      }
      router.refresh();
    });
  }

  if (tags.length === 0) {
    return <p className="mt-5 text-[13px] text-[#757575]">No tags configured in TMS for this company.</p>;
  }

  return (
    <div className="mt-5 max-w-[760px] overflow-hidden rounded-xl border border-[#e6e6e6]">
      <div className="grid grid-cols-[1fr_repeat(2,90px)] items-center gap-2 border-b bg-[#f7f9fc] px-4 py-2 text-[11px] font-medium tracking-wide text-[#757575] uppercase">
        <span>Tag</span>
        {TAG_CATEGORIES.map((c) => (
          <span key={c} className="text-center">
            {CATEGORY_LABEL[c]}
          </span>
        ))}
      </div>
      <div className="divide-y divide-[#f0f2f5]">
        {tags.map((t) => (
          <div key={t.id} className="grid grid-cols-[1fr_repeat(2,90px)] items-center gap-2 px-4 py-2.5">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.hexColour }} />
              <span className="truncate text-[13px] text-[#333333]" title={t.description ?? t.name}>
                {t.name}
              </span>
            </span>
            {TAG_CATEGORIES.map((c) => (
              <span key={c} className="flex justify-center">
                <input
                  type="checkbox"
                  checked={isAssigned(t.id, c)}
                  disabled={isPending}
                  onChange={(e) => toggle(t.id, c, e.target.checked)}
                  aria-label={`${t.name} — ${CATEGORY_LABEL[c]}`}
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
