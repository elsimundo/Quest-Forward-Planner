"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { searchApprovedSites } from "@/lib/db/admin-queries";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export type SiteGroupActionResult = { ok: true } | { ok: false; error: string };

// Candidates for "add a pad to this group" — scoped to ONE company, always (never "every
// company" even for super_admin, unlike the audit-style admin lists) since mixing
// same-named-but-different-company results in one picker would be genuinely confusing, not
// just a scoping technicality — the page always has a single company selected to manage.
// Not pre-filtered beyond company and approval status; setSiteParent below is the actual
// arbiter (already-a-parent, already-a-pad-somewhere-else, etc.), same "search loosely, let
// the write reject" pattern as the merge-target search in lib/actions/admin/sites.ts.
export async function searchSitesToGroup(companyId: number, query: string, excludeId?: number) {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return [];
  if (!companyAllowed(actor.companyAccess, companyId)) return [];
  return searchApprovedSites(companyId, query, excludeId);
}

// A new, purely-local parent site — organisational only, never TMS-linked and never
// booked directly (docs/TMS_INTEGRATION_PLAN.md §5, docs/DECISIONS.md #25).
export async function createSiteGroup(companyId: number, name: string): Promise<SiteGroupActionResult & { id?: number }> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to manage site groups." };
  if (!companyAllowed(actor.companyAccess, companyId)) return { ok: false, error: "Company not found." };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };

  const [existing] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.companyId, companyId), eq(sites.name, trimmed), isNull(sites.deletedAt)))
    .limit(1);
  if (existing) return { ok: false, error: "A site with that name already exists." };

  const [created] = await db.insert(sites).values({ name: trimmed, companyId, pendingReview: false }).returning({ id: sites.id });
  revalidatePath("/admin/site-groups");
  return { ok: true, id: created.id };
}

// Assign or clear a site's parent. One level only — a parent can't itself have a parent,
// and a site that already has children can't also become someone else's child — so
// "parent" and "pad" stay mutually exclusive roles, matching the drawer's "pick the parent,
// then which pad?" flow (no grandparent chains to reason about there).
export async function setSiteParent(siteId: number, parentSiteId: number | null): Promise<SiteGroupActionResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to manage site groups." };

  return db.transaction(async (tx) => {
    const [site] = await tx.select().from(sites).where(and(eq(sites.id, siteId), isNull(sites.deletedAt))).limit(1);
    if (!site) return { ok: false, error: "Site not found." };
    if (!companyAllowed(actor.companyAccess, site.companyId)) return { ok: false, error: "Site not found." };

    if (parentSiteId === null) {
      await tx.update(sites).set({ parentSiteId: null }).where(eq(sites.id, siteId));
      revalidatePath("/admin/site-groups");
      revalidatePath("/");
      return { ok: true };
    }

    if (parentSiteId === siteId) return { ok: false, error: "A site can't be its own parent." };

    const [parent] = await tx.select().from(sites).where(and(eq(sites.id, parentSiteId), isNull(sites.deletedAt))).limit(1);
    if (!parent) return { ok: false, error: "Parent site not found." };
    if (!companyAllowed(actor.companyAccess, parent.companyId)) return { ok: false, error: "Parent site not found." };
    if (parent.companyId !== site.companyId) return { ok: false, error: "Can't group sites from different companies." };
    if (parent.parentSiteId !== null) {
      return { ok: false, error: "Can't group under a site that's itself part of a group — one level only." };
    }

    const childCount = await tx.$count(sites, and(eq(sites.parentSiteId, siteId), isNull(sites.deletedAt)));
    if (childCount > 0) {
      return { ok: false, error: "This site already has its own pads grouped under it — can't also make it a pad itself." };
    }

    await tx.update(sites).set({ parentSiteId }).where(eq(sites.id, siteId));
    revalidatePath("/admin/site-groups");
    revalidatePath("/");
    return { ok: true };
  });
}
