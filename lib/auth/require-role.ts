import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";

export type AuthedUser = { id: number; role: Role };

// Re-checks the CURRENT role from the DB rather than trusting the session's JWT claim,
// which can go stale between issue and a role change made elsewhere — every mutation
// endpoint must do this independently (SPEC.md §11), not rely on session.user.role.
export async function requireRole(allowed: Role[]): Promise<AuthedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);
  if (!user || !allowed.includes(user.role)) return null;
  return user;
}
