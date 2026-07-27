import mysql from "mysql2/promise";

// Own pool, deliberately separate from lib/db/mysql-auth.ts's — that one is scoped to the
// login path (highest blast-radius code in the app if broken); this one is scoped to the
// reference sync (lib/db/tms/sync.ts). Both point at the same TMS database via the same
// env var, but keeping them independent means a bug in sync query logic can't touch login.
//
// Same iron rule as mysql-auth.ts: TMS is read-only, always. Every query run against this
// pool, from any module under lib/db/tms/, MUST be a SELECT — never write to TMS.
const DATABASE_URL = process.env.MYSQL_AUTH_DATABASE_URL;
const CONNECT_TIMEOUT_MS = parseInt(process.env.MYSQL_CONNECT_TIMEOUT ?? "3000", 10);

let pool: mysql.Pool | null = null;

export function getTmsPool(): mysql.Pool {
  if (!DATABASE_URL) {
    throw new Error("MYSQL_AUTH_DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = mysql.createPool({ uri: DATABASE_URL, connectTimeout: CONNECT_TIMEOUT_MS });
  }
  return pool;
}
