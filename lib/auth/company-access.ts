import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, companies, type Role } from "@/lib/db/schema";

// Hard company scoping (docs/TMS_INTEGRATION_PLAN.md §2, docs/DECISIONS.md #22):
// `super_admin` may act on any company (a picker in the planner UI); everyone else is
// locked to exactly the one local company matching their own TMS company_id — never a
// client-supplied value. Re-derived from the DB on every check, same reasoning as
// requireRole re-checking role instead of trusting the session (SPEC.md §11).
export type CompanyAccess = { kind: "any" } | { kind: "fixed"; companyId: number };

export async function getCompanyAccess(userId: number, role: Role): Promise<CompanyAccess | null> {
  if (role === "super_admin") return { kind: "any" };

  const [user] = await db.select({ tmsCompanyId: users.tmsCompanyId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.tmsCompanyId) return null;

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.tmsCompanyId, user.tmsCompanyId))
    .limit(1);
  if (!company) return null;

  return { kind: "fixed", companyId: company.id };
}

// True if `access` permits acting on a resource belonging to `companyId`.
export function companyAllowed(access: CompanyAccess, companyId: number): boolean {
  return access.kind === "any" || access.companyId === companyId;
}
