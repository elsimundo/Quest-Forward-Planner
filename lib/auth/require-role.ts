import { eq, isNull, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";
import { getCompanyAccess, type CompanyAccess } from "@/lib/auth/company-access";
import { logUnauthorizedAccess } from "@/lib/audit/security-log";

export type AuthedUser = { id: number; name: string; role: Role; companyAccess: CompanyAccess };

// Re-checks the CURRENT role from the DB rather than trusting the session's JWT claim,
// which can go stale between issue and a role change made elsewhere — every mutation
// endpoint must do this independently (SPEC.md §11), not rely on session.user.role.
// Also excludes deactivated accounts (users.deletedAt) — a still-valid JWT shouldn't let
// a deactivated user keep mutating until it expires.
//
// `companyAccess` is resolved fresh here too (docs/DECISIONS.md #22) — a mutation that
// touches a specific company's data (a booking, a site) must additionally check
// `companyAllowed(actor.companyAccess, targetCompanyId)` before writing. Callers that
// don't touch per-company resources (e.g. managing the global booking-statuses catalogue)
// can ignore the field.
export async function requireRole(allowed: Role[]): Promise<AuthedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.id, Number(session.user.id)), isNull(users.deletedAt)))
    .limit(1);
  if (!user) return null;
  if (!allowed.includes(user.role)) {
    await logUnauthorizedAccess({
      userId: user.id,
      reason: "wrong_role",
      details: { requiredOneOf: allowed, actualRole: user.role },
    });
    return null;
  }
  const companyAccess = await getCompanyAccess(user.id, user.role);
  // Shouldn't happen — login already rejects anyone without company access — but a role
  // could theoretically change between login and this check, so fail closed, not open.
  if (!companyAccess) {
    await logUnauthorizedAccess({ userId: user.id, reason: "no_company_access" });
    return null;
  }
  return { ...user, companyAccess };
}
