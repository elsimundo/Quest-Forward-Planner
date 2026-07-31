import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, companies, type Role } from "@/lib/db/schema";

// Hard company scoping (docs/TMS_INTEGRATION_PLAN.md §2, docs/DECISIONS.md #22, #40).
// Two groups get `{kind:"any"}` — `super_admin`, and anyone whose TMS `company_id IS NULL`,
// which is how TMS marks **Quest's own staff** (they aren't affiliated to a single client
// company and work across all of them). Everyone else is locked to exactly the one local
// company matching their own TMS company_id — never a client-supplied value.
//
// `{kind:"any"}` is still never a *blended* view: the planner renders one company at a time
// via the picker. It means "may switch to any", not "sees them all at once".
//
// Re-derived from the DB on every check, same reasoning as requireRole re-checking role
// instead of trusting the session (SPEC.md §11).
export type CompanyAccess = { kind: "any" } | { kind: "fixed"; companyId: number };

export async function getCompanyAccess(userId: number, role: Role): Promise<CompanyAccess | null> {
  if (role === "super_admin") return { kind: "any" };

  const [user] = await db.select({ tmsCompanyId: users.tmsCompanyId }).from(users).where(eq(users.id, userId)).limit(1);
  // No such user row is a denial; a user row that simply has no TMS company is Quest staff.
  // These were one condition (`!user?.tmsCompanyId`) and had to be split — they now return
  // opposite answers, and the falsy test would also have mis-read a company_id of 0.
  if (!user) return null;
  if (user.tmsCompanyId === null) return { kind: "any" };

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
