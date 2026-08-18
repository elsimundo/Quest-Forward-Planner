"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tagCategoryAssignments, TAG_CATEGORIES, type TagCategory } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";

// Designating a tag as generator/parking/etc is an admin job, same tier as every other
// admin-managed catalogue in this app (docs/DECISIONS.md #18).
const ADMIN_ROLES = ["admin", "super_admin"] as const;

export type TagCategoryActionResult = { ok: true } | { ok: false; error: string };

// Add or remove one (tag, category) pairing — a plain toggle, not a soft-deletable row:
// this is an admin preference about what a TMS tag MEANS, not booking data, so CLAUDE.md's
// soft-delete rule (scoped to bookings/units/sites/companies) doesn't apply here.
export async function setTagCategory(input: {
  tmsTagId: number;
  category: TagCategory;
  enabled: boolean;
}): Promise<TagCategoryActionResult> {
  const actor = await requireRole([...ADMIN_ROLES]);
  if (!actor) return { ok: false, error: "You don't have permission to manage tag categories." };

  if (!(TAG_CATEGORIES as readonly string[]).includes(input.category)) {
    return { ok: false, error: "Invalid category." };
  }
  if (!Number.isInteger(input.tmsTagId)) {
    return { ok: false, error: "Invalid tag." };
  }

  if (input.enabled) {
    await db
      .insert(tagCategoryAssignments)
      .values({ tmsTagId: input.tmsTagId, category: input.category, createdBy: actor.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(tagCategoryAssignments)
      .where(and(eq(tagCategoryAssignments.tmsTagId, input.tmsTagId), eq(tagCategoryAssignments.category, input.category)));
  }

  revalidatePath("/admin/tag-categories");
  // The grid cell (generator badge) and any future downstream export render from this.
  revalidatePath("/");
  return { ok: true };
}
