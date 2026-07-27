"use server";

import { searchSites as searchSitesQuery, type SiteMatch } from "@/lib/db/queries";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { ROLES } from "@/lib/db/schema";

// Any signed-in role may search sites (it's a read, gated by login itself) — but hard
// company scoping (docs/DECISIONS.md #22) still applies. `companyId` is which company the
// CALLER'S PAGE is currently viewing (fixed for most roles, super_admin-picked otherwise —
// see app/(planner)/page.tsx) — validated here against the actor's actual access, never
// trusted outright, so a non-super_admin can't search into a company they aren't scoped to.
export async function searchSites(companyId: number, query: string): Promise<SiteMatch[]> {
  const actor = await requireRole([...ROLES]);
  if (!actor) return [];
  if (!companyAllowed(actor.companyAccess, companyId)) return [];
  return searchSitesQuery(companyId, query);
}
