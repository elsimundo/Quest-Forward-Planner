// Runs on container start (see Dockerfile CMD). Plain JS/ESM, no drizzle-kit or TS
// tooling needed at runtime — just drizzle-orm + postgres, already prod dependencies.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./lib/db/migrations" });
await sql.end();
console.log("Migrations applied");
