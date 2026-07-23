"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, userRoleEvents, ROLES, type Role } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/require-role";

const SUPER_ADMIN_ONLY = ["super_admin"] as const;

async function countActiveSuperAdmins(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], excludeUserId?: number) {
  const conditions = [eq(users.role, "super_admin" as Role), isNull(users.deletedAt)];
  if (excludeUserId) conditions.push(ne(users.id, excludeUserId));
  return tx.$count(users, and(...conditions));
}

export type UserActionResult = { ok: true } | { ok: false; error: string };

// Identity and password live in TMS now (SPEC.md §13.1, DECISIONS.md #17) — a person logs
// in with their real TMS credentials, and verifyCredentials auto-provisions their local
// row as `viewer` on first login if none exists. This action is for the case where a
// super_admin wants to *pre-authorize* someone with a higher role before their first TMS
// login, so they land with the right access immediately instead of defaulting to viewer.
// No password: there's nothing local to set a password for.
export async function createStaffUser(input: { name: string; email: string; role: Role }): Promise<UserActionResult> {
  const actor = await requireRole([...SUPER_ADMIN_ONLY]);
  if (!actor) return { ok: false, error: "Only a super admin can pre-authorize staff." };

  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  if (!name || !email) return { ok: false, error: "Name and email are required." };
  if (!ROLES.includes(input.role)) return { ok: false, error: "Invalid role." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { ok: false, error: "A user with that email already exists." };

  await db.insert(users).values({ name, email, passwordHash: null, role: input.role });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRole(input: { userId: number; role: Role }): Promise<UserActionResult> {
  const actor = await requireRole([...SUPER_ADMIN_ONLY]);
  if (!actor) return { ok: false, error: "Only a super admin can change roles." };
  if (!ROLES.includes(input.role)) return { ok: false, error: "Invalid role." };

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, input.userId), isNull(users.deletedAt)))
      .limit(1);
    if (!target) return { ok: false, error: "User not found." };
    if (target.role === input.role) return { ok: true };

    // Guard against locking everyone out of user management entirely.
    if (target.role === "super_admin" && input.role !== "super_admin") {
      const remaining = await countActiveSuperAdmins(tx, target.id);
      if (remaining === 0) {
        return { ok: false, error: "Can't remove the last super admin — promote someone else first." };
      }
    }

    await tx.update(users).set({ role: input.role }).where(eq(users.id, target.id));
    await tx.insert(userRoleEvents).values({
      actorId: actor.id,
      targetUserId: target.id,
      oldRole: target.role,
      newRole: input.role,
    });

    revalidatePath("/admin/users");
    return { ok: true };
  });
}

export type SetActiveResult = UserActionResult;

export async function setUserActive(input: { userId: number; active: boolean }): Promise<SetActiveResult> {
  const actor = await requireRole([...SUPER_ADMIN_ONLY]);
  if (!actor) return { ok: false, error: "Only a super admin can deactivate staff." };
  if (input.userId === actor.id && !input.active) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!target) return { ok: false, error: "User not found." };

    if (!input.active && target.role === "super_admin" && !target.deletedAt) {
      const remaining = await countActiveSuperAdmins(tx, target.id);
      if (remaining === 0) {
        return { ok: false, error: "Can't deactivate the last super admin — promote someone else first." };
      }
    }

    await tx
      .update(users)
      .set(input.active ? { deletedAt: null, deletedBy: null } : { deletedAt: new Date(), deletedBy: actor.id })
      .where(eq(users.id, target.id));

    revalidatePath("/admin/users");
    return { ok: true };
  });
}
