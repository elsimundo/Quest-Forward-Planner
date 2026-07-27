"use client";

import { createContext, useContext, useMemo } from "react";
import { makeStatusCatalog, type StatusCatalog, type StatusView } from "@/lib/statuses";

// Threads the admin-managed status catalogue (docs/DECISIONS.md #18) to the planner's cells,
// drawer, legend, and toolbar so their colours/labels come from the DB, not a hardcoded map.
// A context rather than prop-drilling: five components deep in the grid need it and nothing
// in between cares.
const StatusCatalogContext = createContext<StatusCatalog | null>(null);

export function StatusCatalogProvider({
  statuses,
  children,
}: {
  statuses: StatusView[];
  children: React.ReactNode;
}) {
  const catalog = useMemo(() => makeStatusCatalog(statuses), [statuses]);
  return <StatusCatalogContext.Provider value={catalog}>{children}</StatusCatalogContext.Provider>;
}

export function useStatusCatalog(): StatusCatalog {
  const ctx = useContext(StatusCatalogContext);
  if (!ctx) throw new Error("useStatusCatalog must be used within a StatusCatalogProvider");
  return ctx;
}

// Convenience for the common single-key lookup.
export function useStatusView(key: string): StatusView {
  return useStatusCatalog().get(key);
}
