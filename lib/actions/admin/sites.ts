"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bookings, sites } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { searchApprovedSites } from "@/lib/db/admin-queries";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export async function searchMergeTargets(query: string, excludeId: number) {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return [];
  return searchApprovedSites(query, excludeId);
}

export type ApproveSiteResult = { ok: true } | { ok: false; error: string };

// Approve a site created via free-text in the drawer (SPEC.md §7). With `mergeIntoSiteId`,
// treats it as a duplicate/typo: every live booking pointing at it is repointed to the
// canonical site, and the duplicate is soft-deleted (never a hard delete, §2c). Without
// it, the site is simply confirmed as a genuine new site (pending_review cleared).
export async function approvePendingSite(input: {
  siteId: number;
  mergeIntoSiteId?: number;
}): Promise<ApproveSiteResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to review sites." };

  return db.transaction(async (tx) => {
    const [site] = await tx
      .select()
      .from(sites)
      .where(and(eq(sites.id, input.siteId), isNull(sites.deletedAt)))
      .limit(1);
    if (!site) return { ok: false, error: "Site not found." };
    if (!site.pendingReview) return { ok: false, error: "That site isn't pending review." };

    if (input.mergeIntoSiteId) {
      const [target] = await tx
        .select()
        .from(sites)
        .where(and(eq(sites.id, input.mergeIntoSiteId), isNull(sites.deletedAt)))
        .limit(1);
      if (!target) return { ok: false, error: "The site to merge into wasn't found." };

      // Repointing site_id doesn't touch (unit_id, date), so this can't collide with the
      // partial unique index — a plain UPDATE is safe here (unlike booking-moves.ts).
      await tx.update(bookings).set({ siteId: target.id }).where(eq(bookings.siteId, site.id));
      await tx
        .update(sites)
        .set({ deletedAt: new Date(), pendingReview: false })
        .where(eq(sites.id, site.id));
    } else {
      await tx.update(sites).set({ pendingReview: false }).where(eq(sites.id, site.id));
    }

    revalidatePath("/admin/pending-sites");
    revalidatePath("/");
    return { ok: true };
  });
}

// Reject a pending site — for junk/spurious entries. Blocked while live bookings still
// point at it, since silently un-booking someone's work isn't this action's job; the
// admin should merge those into the correct site first (or clear them from the grid).
export async function rejectPendingSite(input: { siteId: number }): Promise<ApproveSiteResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to review sites." };

  return db.transaction(async (tx) => {
    const [site] = await tx
      .select()
      .from(sites)
      .where(and(eq(sites.id, input.siteId), isNull(sites.deletedAt)))
      .limit(1);
    if (!site) return { ok: false, error: "Site not found." };
    if (!site.pendingReview) return { ok: false, error: "That site isn't pending review." };

    const count = await tx.$count(bookings, and(eq(bookings.siteId, site.id), isNull(bookings.deletedAt)));
    if (count > 0) {
      return {
        ok: false,
        error: `${count} booking${count > 1 ? "s" : ""} still use this site — merge it into the correct site instead of rejecting.`,
      };
    }

    await tx.update(sites).set({ deletedAt: new Date(), pendingReview: false }).where(eq(sites.id, site.id));
    revalidatePath("/admin/pending-sites");
    return { ok: true };
  });
}
