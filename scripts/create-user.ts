// Pre-authorizes a local `users` row so a super_admin/admin can grant a role ahead of
// someone's first TMS login (SPEC.md §13.1, DECISIONS.md #17). Identity and password live
// in TMS now — nobody logs in with a locally-set password, so none is collected here.
// Usage: pnpm db:create-user -- --name "Jane Doe" --email jane@quest.co.uk --role super_admin
import "dotenv/config";
import { db } from "../lib/db";
import { ROLES, users, type Role } from "../lib/db/schema";

function readArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const name = readArg("--name");
  const email = readArg("--email")?.toLowerCase().trim();
  const role = (readArg("--role") ?? "viewer") as Role;

  if (!name || !email) {
    console.error('Usage: pnpm db:create-user -- --name "Jane Doe" --email jane@quest.co.uk --role super_admin');
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`--role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash: null, role })
    .returning({ id: users.id, email: users.email, role: users.role });

  console.log(`Pre-authorized user #${created.id} — ${created.email} (${created.role})`);
  console.log("They sign in with their existing TMS username and password.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
