import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, companies, type Role } from "@/lib/db/schema";
import { getTmsUserByUsername } from "@/lib/db/mysql-auth";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { NoSchedulingAccessError, AccountDeactivatedError, RateLimitedError, NoCompanyAccessError } from "@/lib/auth/errors";

export type VerifiedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// The only place that knows how a login is actually checked (SPEC.md §13.1, DECISIONS.md
// #4 and #17). Identity and password now live in TMS — this app never stores or checks a
// real password of its own. Roles stay local always: TMS has no concept of
// viewer/scheduler/admin/super_admin, so a matching row in our own `users` table is the
// source of truth for what someone can actually do once logged in.
export async function verifyCredentials(
  usernameOrEmail: string,
  password: string,
  clientIp: string,
): Promise<VerifiedUser | null> {
  const key = `login:${clientIp}:${usernameOrEmail.toLowerCase().trim()}`;
  const { allowed } = checkLoginRateLimit(key);
  if (!allowed) throw new RateLimitedError();

  // TMS is read-only, always — this is the only query this app ever runs against it.
  const tmsUser = await getTmsUserByUsername(usernameOrEmail);
  if (!tmsUser) return null;

  const valid = await bcrypt.compare(password, tmsUser.passwordDigest);
  if (!valid) return null;

  // Checked only *after* the password is confirmed — otherwise a wrong-password attempt
  // could be used to probe whether an account has scheduling access at all.
  if (!tmsUser.enableSchedulingAccess) throw new NoSchedulingAccessError();

  const email = tmsUser.emailAddress?.toLowerCase().trim();
  if (!email) return null; // nothing to match a local row against

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  let localUser: { id: number; name: string; email: string; role: Role };
  if (existing) {
    if (existing.deletedAt) throw new AccountDeactivatedError();
    localUser = existing;
  } else {
    // First time this TMS identity has logged in here — provision a starting role. TMS's
    // `superuser` permission_group defaults to `admin` here; everyone else starts as
    // `viewer`. This is a one-time default at provisioning, NOT an ongoing sync — role
    // stays local always (see module comment), so a super_admin's later change to this
    // person's role is never silently overwritten by their TMS tag on a future login.
    // Note: nothing here ever auto-provisions `super_admin` — that tier is only reached by
    // an existing super_admin promoting someone through the admin UI, which is exactly
    // what makes it safe to exempt super_admin from the company check below (§2).
    const name = [tmsUser.forename, tmsUser.surname].filter(Boolean).join(" ") || tmsUser.username;
    const startingRole: Role = tmsUser.permissionGroup?.toLowerCase() === "superuser" ? "admin" : "viewer";
    const [created] = await db
      .insert(users)
      .values({ name, email, passwordHash: null, role: startingRole, tmsSyncedAt: new Date() })
      .returning();
    localUser = created;
  }

  // Hard company scoping (docs/TMS_INTEGRATION_PLAN.md §2, docs/DECISIONS.md #22):
  // `super_admin` can see any company (a picker, wired in the planner page) — everyone
  // else is locked to whichever local company represents their OWN TMS company_id. A
  // company we don't have data for (including no company at all — TMS `company_id IS
  // NULL`) means nothing to show them, so login is rejected rather than admitting them to
  // an empty planner. This is re-checked from the DB on every login, never trusted from a
  // stale session — same reasoning as role (SPEC.md §11).
  if (localUser.role !== "super_admin") {
    const hasCompanyAccess =
      tmsUser.companyId !== null &&
      !!(await db.select({ id: companies.id }).from(companies).where(eq(companies.tmsCompanyId, tmsUser.companyId)).limit(1))[0];
    if (!hasCompanyAccess) throw new NoCompanyAccessError();
  }

  // Refresh tmsSyncedAt/tmsCompanyId every login, not just at provisioning — a person's
  // TMS company can change (e.g. moved between accounts), and the scoping check above
  // must always reflect their CURRENT TMS company, not the one from their first login.
  await db.update(users).set({ tmsSyncedAt: new Date(), tmsCompanyId: tmsUser.companyId }).where(eq(users.id, localUser.id));

  return {
    id: String(localUser.id),
    name: localUser.name,
    email: localUser.email,
    role: localUser.role,
  };
}
