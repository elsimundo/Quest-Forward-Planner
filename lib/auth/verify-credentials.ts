import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type VerifiedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// The only place that knows how a login is actually checked. Today it's the local
// `users` table; once TMS read-access exists (SPEC.md §13.1) this is the one function
// that gets repointed there — sessions, route protection, and roles (always local,
// per DECISIONS.md #4) don't change.
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<VerifiedUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase().trim()), isNull(users.deletedAt)))
    .limit(1);

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
