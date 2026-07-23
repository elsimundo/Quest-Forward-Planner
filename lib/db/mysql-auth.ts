import mysql from "mysql2/promise";

// TMS is a read-only system of record for identity (SPEC.md §1, §13.1). Every query in
// this file MUST be a SELECT — never write to this connection, under any circumstance.
const DATABASE_URL = process.env.MYSQL_AUTH_DATABASE_URL;
const CONNECT_TIMEOUT_MS = parseInt(process.env.MYSQL_CONNECT_TIMEOUT ?? "3000", 10);

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!DATABASE_URL) {
    throw new Error("MYSQL_AUTH_DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = mysql.createPool({ uri: DATABASE_URL, connectTimeout: CONNECT_TIMEOUT_MS });
  }
  return pool;
}

export type TmsUser = {
  id: number;
  username: string;
  emailAddress: string | null;
  passwordDigest: string;
  companyId: number | null;
  companyName: string | null;
  forename: string | null;
  surname: string | null;
  permissionGroup: string | null;
  schedulingPermissionGroup: string | null;
  enableSchedulingAccess: boolean;
};

// Case-sensitive username OR case-insensitive email lookup, matching TMS's own login
// convention. Excludes soft-deleted TMS users (deleted_at) — TMS has its own deactivation
// concept, independent of ours.
export async function getTmsUserByUsername(usernameOrEmail: string): Promise<TmsUser | null> {
  const pool = getPool();
  const trimmed = usernameOrEmail.trim();

  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT
        u.id,
        u.username,
        u.email_address,
        u.password_digest,
        u.company_id,
        u.forename,
        u.surname,
        u.permission_group,
        u.scheduling_permission_group,
        u.enable_scheduling_access,
        c.company_name
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE (u.username = ? OR LOWER(u.email_address) = LOWER(?))
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [trimmed, trimmed],
  );

  if (!rows.length) return null;
  const row = rows[0];

  return {
    id: row.id,
    username: row.username,
    emailAddress: row.email_address ?? null,
    passwordDigest: row.password_digest,
    companyId: row.company_id ?? null,
    companyName: row.company_name ?? null,
    forename: row.forename ?? null,
    surname: row.surname ?? null,
    permissionGroup: row.permission_group ?? null,
    schedulingPermissionGroup: row.scheduling_permission_group ?? null,
    enableSchedulingAccess: !!row.enable_scheduling_access,
  };
}
