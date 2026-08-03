import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, companies, type Role } from "@/lib/db/schema";
import { getTmsUserByUsername } from "@/lib/db/mysql-auth";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { NoSchedulingAccessError, AccountDeactivatedError, RateLimitedError, NoCompanyAccessError } from "@/lib/auth/errors";
import { logLoginFailure, logLoginSuccess } from "@/lib/audit/security-log";

export type VerifiedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// TMS's own top tier. One predicate rather than the `permission_group` string compared in two
// places, because the two places have to agree: it decides both whether the
// `enable_scheduling_access` grant is required at all (below) and what role a first-time login
// provisions into. Lives here rather than in `lib/db/mysql-auth.ts` because it's an
// access-policy question, not a question about how TMS's rows are shaped, and this module is
// meant to be the only place that knows how a login is decided.
function isTmsSuperuser(tmsUser: { permissionGroup: string | null }): boolean {
  return tmsUser.permissionGroup?.toLowerCase().trim() === "superuser";
}

// The only place that knows how a login is actually checked (SPEC.md §13.1, DECISIONS.md
// #4 and #17). Identity and password now live in TMS — this app never stores or checks a
// real password of its own. Roles stay local always: TMS has no concept of
// viewer/scheduler/admin/super_admin, so a matching row in our own `users` table is the
// source of truth for what someone can actually do once logged in.
export async function verifyCredentials(
  usernameOrEmail: string,
  password: string,
  clientIp: string,
  userAgent?: string | null,
): Promise<VerifiedUser | null> {
  const identifier = usernameOrEmail.toLowerCase().trim();
  const key = `login:${clientIp}:${identifier}`;
  const { allowed } = checkLoginRateLimit(key);
  if (!allowed) {
    await logLoginFailure({ identifier, reason: "rate_limited", ipAddress: clientIp, userAgent });
    throw new RateLimitedError();
  }

  // TMS is read-only, always — this is the only query this app ever runs against it.
  const tmsUser = await getTmsUserByUsername(usernameOrEmail);
  if (!tmsUser) {
    await logLoginFailure({ identifier, reason: "unknown_identity", ipAddress: clientIp, userAgent });
    return null;
  }

  const valid = await bcrypt.compare(password, tmsUser.passwordDigest);
  if (!valid) {
    await logLoginFailure({ identifier, reason: "invalid_password", ipAddress: clientIp, userAgent });
    return null;
  }

  // Checked only *after* the password is confirmed — otherwise a wrong-password attempt
  // could be used to probe whether an account has scheduling access at all.
  //
  // TMS `superuser` is exempt (docs/DECISIONS.md #39). `enable_scheduling_access` is a
  // per-account grant that has to be switched on for an ordinary TMS user; a superuser is
  // defined by having full access *without* needing individual grants, so requiring the grant
  // of them inverts what the tier means. In practice this is why the flag never got set on the
  // Quest-internal accounts — nobody grants a superuser a permission they already hold — and
  // the result was that the only people who could administer the planner were the ones locked
  // out of it. Ordinary users are unaffected: they still need the flag.
  if (!isTmsSuperuser(tmsUser) && !tmsUser.enableSchedulingAccess) {
    await logLoginFailure({ identifier, reason: "no_scheduling_access", ipAddress: clientIp, userAgent });
    throw new NoSchedulingAccessError();
  }

  const email = tmsUser.emailAddress?.toLowerCase().trim();
  if (!email) {
    await logLoginFailure({ identifier, reason: "no_email", ipAddress: clientIp, userAgent });
    return null; // nothing to match a local row against
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  let localUser: { id: number; name: string; email: string; role: Role };
  if (existing) {
    if (existing.deletedAt) {
      await logLoginFailure({ identifier, reason: "account_deactivated", ipAddress: clientIp, userAgent, userId: existing.id });
      throw new AccountDeactivatedError();
    }
    localUser = existing;
  } else {
    // First time this TMS identity has logged in here — provision a starting role. A TMS
    // `superuser` starts as `super_admin`; everyone else as `viewer`. This is a one-time
    // default at provisioning, NOT an ongoing sync — role stays local always (see module
    // comment), so a later role change for that person is never silently overwritten by their
    // TMS tag on a future login. Demoting a superuser in the planner therefore sticks.
    //
    // `super_admin`, not `admin`, and this REVERSED an earlier rule that nothing here ever
    // auto-provisions the top tier (docs/DECISIONS.md #17, now #39). The reason it had to
    // change: a TMS superuser has no TMS `company_id` — all 15 of them — and the company gate
    // below admits a non-`super_admin` only by matching their TMS company to a local one. So
    // `admin` was not a lesser grant of access, it was *no* access: every Quest-internal
    // account authenticated, then bounced. `super_admin` is the only role that expresses
    // "full access, no company" (#22), which is what the tier means on the TMS side.
    const name = [tmsUser.forename, tmsUser.surname].filter(Boolean).join(" ") || tmsUser.username;
    const startingRole: Role = isTmsSuperuser(tmsUser) ? "super_admin" : "viewer";
    const [created] = await db
      .insert(users)
      .values({ name, email, passwordHash: null, role: startingRole, tmsSyncedAt: new Date() })
      .returning();
    localUser = created;
  }

  // Hard company scoping (docs/TMS_INTEGRATION_PLAN.md §2, docs/DECISIONS.md #22, #40):
  // `super_admin` can see any company (a picker, wired in the planner page). So can anyone
  // whose TMS `company_id IS NULL` — that is how TMS marks **Quest's own staff**, who aren't
  // affiliated to any one client company and work across all of them. Everyone WITH a
  // company_id stays locked to whichever local company represents it, and is rejected here if
  // we hold no data for that company.
  //
  // A NULL company_id used to be rejected too, read as "no company, so nothing to show them".
  // That was backwards: it's the marker for internal staff, not for an orphaned account
  // (#40). Kept as an explicit branch rather than folded into the query, because "no company"
  // and "a company we don't sync" are opposite answers now and must not collapse.
  //
  // Re-checked from the DB on every login, never trusted from a stale session — same
  // reasoning as role (SPEC.md §11).
  const isQuestStaff = tmsUser.companyId === null;
  if (localUser.role !== "super_admin" && !isQuestStaff) {
    const hasCompanyAccess = !!(
      await db.select({ id: companies.id }).from(companies).where(eq(companies.tmsCompanyId, tmsUser.companyId!)).limit(1)
    )[0];
    if (!hasCompanyAccess) {
      await logLoginFailure({ identifier, reason: "no_company_access", ipAddress: clientIp, userAgent, userId: localUser.id });
      throw new NoCompanyAccessError();
    }
  }

  // Refresh tmsSyncedAt/tmsCompanyId every login, not just at provisioning — a person's
  // TMS company can change (e.g. moved between accounts), and the scoping check above
  // must always reflect their CURRENT TMS company, not the one from their first login.
  await db.update(users).set({ tmsSyncedAt: new Date(), tmsCompanyId: tmsUser.companyId }).where(eq(users.id, localUser.id));

  await logLoginSuccess({ userId: localUser.id, identifier, ipAddress: clientIp, userAgent });

  return {
    id: String(localUser.id),
    name: localUser.name,
    email: localUser.email,
    role: localUser.role,
  };
}
