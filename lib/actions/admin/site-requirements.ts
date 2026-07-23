"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { siteCapabilityRequirements } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";

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

  await db.delete(siteCapabilityRequirements).where(eq(siteCapabilityRequirements.id, input.id));
  revalidatePath("/admin/site-requirements");
  revalidatePath("/");
  return { ok: true };
}
