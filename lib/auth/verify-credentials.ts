import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";
import { getTmsUserByUsername } from "@/lib/db/mysql-auth";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { NoSchedulingAccessError, AccountDeactivatedError, RateLimitedError } from "@/lib/auth/errors";

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
    await db.update(users).set({ tmsSyncedAt: new Date() }).where(eq(users.id, existing.id));
    localUser = existing;
  } else {
    // First time this TMS identity has logged in here — provision a starting role. TMS's
    // `superuser` permission_group defaults to `admin` here; everyone else starts as
    // `viewer`. This is a one-time default at provisioning, NOT an ongoing sync — role
    // stays local always (see module comment), so a super_admin's later change to this
    // person's role is never silently overwritten by their TMS tag on a future login.
    const name = [tmsUser.forename, tmsUser.surname].filter(Boolean).join(" ") || tmsUser.username;
    const startingRole: Role = tmsUser.permissionGroup?.toLowerCase() === "superuser" ? "admin" : "viewer";
    const [created] = await db
      .insert(users)
      .values({ name, email, passwordHash: null, role: startingRole, tmsSyncedAt: new Date() })
      .returning();
    localUser = created;
  }

  return {
    id: String(localUser.id),
    name: localUser.name,
    email: localUser.email,
    role: localUser.role,
  };
}
