"use client";

import { createContext, useContext, useMemo } from "react";
import type { TmsBookingTag } from "@/lib/db/tms/queries";

// Threads TMS's live `booking_tags` catalogue (docs/DECISIONS.md #51) to the planner's
// cells, drawer, and bulk-edit drawer — same reasoning as status-context.tsx: several
// components deep in the grid need it and nothing in between cares. Unlike the status
// catalogue this isn't admin-managed data of ours; it's read fresh from TMS on every page
// load and passed down as-is.
const TagCatalogContext = createContext<TagCatalog | null>(null);

export type TagCatalog = {
  all: TmsBookingTag[];
  /** Undefined for a tag id TMS no longer returns (deactivated/removed since it was picked). */
  get(id: number): TmsBookingTag | undefined;
};

export function TagCatalogProvider({ tags, children }: { tags: TmsBookingTag[]; children: React.ReactNode }) {
  const catalog = useMemo<TagCatalog>(() => {
    const byId = new Map(tags.map((t) => [t.id, t]));
    return { all: tags, get: (id) => byId.get(id) };
  }, [tags]);
  return <TagCatalogContext.Provider value={catalog}>{children}</TagCatalogContext.Provider>;
}

export function useTagCatalog(): TagCatalog {
  const ctx = useContext(TagCatalogContext);
  if (!ctx) throw new Error("useTagCatalog must be used within a TagCatalogProvider");
  return ctx;
}
