// Bootstraps the local `users` table (SPEC.md §1: "seeded manually for the pilot team").
// Usage: pnpm db:create-user -- --name "Jane Doe" --email jane@quest.co.uk --password *** --role super_admin
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { ROLES, users, type Role } from "../lib/db/schema";

function readArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const name = readArg("--name");
  const email = readArg("--email")?.toLowerCase().trim();
  const password = readArg("--password");
  const role = (readArg("--role") ?? "viewer") as Role;

  if (!name || !email || !password) {
    console.error(
      'Usage: pnpm db:create-user -- --name "Jane Doe" --email jane@quest.co.uk --password *** --role super_admin',
    );
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`--role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash, role })
    .returning({ id: users.id, email: users.email, role: users.role });

  console.log(`Created user #${created.id} — ${created.email} (${created.role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
