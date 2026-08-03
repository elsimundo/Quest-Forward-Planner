"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { siteCapabilityRequirements, sites } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { companyAllowed } from "@/lib/auth/company-access";
import { logCompanyAccessDenied } from "@/lib/audit/security-log";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export type SiteRequirementResult = { ok: true; id: number } | { ok: false; error: string };

// Upsert on (site_id, requirement_key) — SPEC.md §2a. Not soft-deleted: this is pure
// config (like unit_specs), not an audit-relevant business record.
export async function setSiteRequirement(input: {
  siteId: number;
  requirementKey: string;
  required: boolean;
}): Promise<SiteRequirementResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit site requirements." };

  const key = input.requirementKey.trim();
  if (!key) return { ok: false, error: "Pick a capability." };

  // Hard company scoping (docs/DECISIONS.md #22) — siteCapabilityRequirements has no
  // company_id of its own, so check the site it's attached to.
  const [site] = await db.select({ companyId: sites.companyId }).from(sites).where(and(eq(sites.id, input.siteId), isNull(sites.deletedAt))).limit(1);
  if (!site) return { ok: false, error: "Site not found." };
  if (!companyAllowed(actor.companyAccess, site.companyId)) {
    logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: site.companyId, resource: "setSiteRequirement" });
    return { ok: false, error: "Site not found." };
  }

  const [row] = await db
    .insert(siteCapabilityRequirements)
    .values({ siteId: input.siteId, requirementKey: key, required: input.required })
    .onConflictDoUpdate({
      target: [siteCapabilityRequirements.siteId, siteCapabilityRequirements.requirementKey],
      set: { required: input.required },
    })
    .returning({ id: siteCapabilityRequirements.id });

  revalidatePath("/admin/site-requirements");
  revalidatePath("/");
  return { ok: true, id: row.id };
}

export type RemoveResult = { ok: true } | { ok: false; error: string };

export async function removeSiteRequirement(input: { id: number }): Promise<RemoveResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to edit site requirements." };

  const [row] = await db
    .select({ companyId: sites.companyId })
    .from(siteCapabilityRequirements)
    .innerJoin(sites, eq(sites.id, siteCapabilityRequirements.siteId))
    .where(eq(siteCapabilityRequirements.id, input.id))
    .limit(1);
  if (!row) return { ok: true }; // already gone — same idempotent behaviour as before
  if (!companyAllowed(actor.companyAccess, row.companyId)) {
    logCompanyAccessDenied({ userId: actor.id, requestedCompanyId: row.companyId, resource: "removeSiteRequirement" });
    return { ok: false, error: "Requirement not found." };
  }

  await db.delete(siteCapabilityRequirements).where(eq(siteCapabilityRequirements.id, input.id));
  revalidatePath("/admin/site-requirements");
  revalidatePath("/");
  return { ok: true };
}
