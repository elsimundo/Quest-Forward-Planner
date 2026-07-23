import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./index";
import {
  bookingEvents,
  bookings,
  sites,
  users,
  userRoleEvents,
  siteCapabilityRequirements,
  unitSpecs,
  type BookingAction,
  type Role,
} from "./schema";

// ── Audit log (SPEC.md §7 — "who moved CT38 off the Gloucester run and when") ──

export type AuditLogFilters = {
  q?: string; // free text: unit id, site name, actor name/email
  action?: BookingAction;
  from?: string; // ISO date, inclusive
  to?: string; // ISO date, inclusive
};

export type AuditLogRow = {
  id: number;
  at: Date;
  action: BookingAction;
  batchId: string;
  actorName: string;
  actorEmail: string;
  unitId: string | null;
  date: string | null;
  siteName: string | null;
};

const PAGE_SIZE = 50;

export async function getAuditLog(
  filters: AuditLogFilters,
  page: number,
): Promise<{ rows: AuditLogRow[]; hasMore: boolean }> {
  const conditions = [];
  if (filters.action) conditions.push(eq(bookingEvents.action, filters.action));
  if (filters.from) conditions.push(gte(bookingEvents.at, new Date(`${filters.from}T00:00:00Z`)));
  if (filters.to) conditions.push(lte(bookingEvents.at, new Date(`${filters.to}T23:59:59.999Z`)));
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    // Unit id and actor name/email are plain columns/jsonb text; site name requires a
    // subquery since booking_before/after only carry site_id, not the name.
    conditions.push(
      or(
        ilike(sql`coalesce(${bookingEvents.bookingAfter}->>'unitId', ${bookingEvents.bookingBefore}->>'unitId')`, q),
        ilike(users.name, q),
        ilike(users.email, q),
        sql`EXISTS (
          SELECT 1 FROM ${sites} s
          WHERE s.id = coalesce(
            (${bookingEvents.bookingAfter}->>'siteId')::int,
            (${bookingEvents.bookingBefore}->>'siteId')::int
          )
          AND s.name ILIKE ${q}
        )`,
      ),
    );
  }

  const rows = await db
    .select({
      id: bookingEvents.id,
      at: bookingEvents.at,
      action: bookingEvents.action,
      batchId: bookingEvents.batchId,
      actorName: users.name,
      actorEmail: users.email,
      unitId: sql<string | null>`coalesce(${bookingEvents.bookingAfter}->>'unitId', ${bookingEvents.bookingBefore}->>'unitId')`,
      date: sql<string | null>`coalesce(${bookingEvents.bookingAfter}->>'date', ${bookingEvents.bookingBefore}->>'date')`,
      siteId: sql<number | null>`coalesce((${bookingEvents.bookingAfter}->>'siteId')::int, (${bookingEvents.bookingBefore}->>'siteId')::int)`,
    })
    .from(bookingEvents)
    .innerJoin(users, eq(users.id, bookingEvents.actorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bookingEvents.at), desc(bookingEvents.id))
    .limit(PAGE_SIZE + 1)
    .offset(page * PAGE_SIZE);

  const hasMore = rows.length > PAGE_SIZE;
  const page_ = rows.slice(0, PAGE_SIZE);

  const siteIds = [...new Set(page_.map((r) => r.siteId).filter((x): x is number => x != null))];
  const siteNameById = new Map<number, string>();
  if (siteIds.length) {
    const siteRows = await db.select({ id: sites.id, name: sites.name }).from(sites).where(sql`${sites.id} IN (${sql.join(siteIds.map((id) => sql`${id}`), sql`, `)})`);
    for (const s of siteRows) siteNameById.set(s.id, s.name);
  }

  return {
    rows: page_.map((r) => ({
      id: r.id,
      at: r.at,
      action: r.action,
      batchId: r.batchId,
      actorName: r.actorName,
      actorEmail: r.actorEmail,
      unitId: r.unitId,
      date: r.date,
      siteName: r.siteId != null ? (siteNameById.get(r.siteId) ?? null) : null,
    })),
    hasMore,
  };
}

// ── Pending sites review (SPEC.md §7) ──

export async function getPendingSites() {
  const rows = await db
    .select({ id: sites.id, name: sites.name, kind: sites.kind })
    .from(sites)
    .where(and(eq(sites.pendingReview, true), isNull(sites.deletedAt)))
    .orderBy(asc(sites.name));

  const withCounts = await Promise.all(
    rows.map(async (s) => ({
      ...s,
      bookingCount: await db.$count(bookings, and(eq(bookings.siteId, s.id), isNull(bookings.deletedAt))),
    })),
  );
  return withCounts;
}

export async function searchApprovedSites(q: string, excludeId?: number) {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const conditions = [isNull(sites.deletedAt), eq(sites.pendingReview, false), ilike(sites.name, `%${trimmed}%`)];
  if (excludeId) conditions.push(sql`${sites.id} != ${excludeId}`);
  return db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(...conditions))
    .orderBy(asc(sites.name))
    .limit(8);
}

// ── Site capability requirements (SPEC.md §2a, §7) ──

export async function getAllSitesBasic() {
  return db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(isNull(sites.deletedAt), eq(sites.pendingReview, false)))
    .orderBy(asc(sites.name));
}

export async function getSiteRequirements(siteId: number) {
  return db
    .select({ id: siteCapabilityRequirements.id, requirementKey: siteCapabilityRequirements.requirementKey, required: siteCapabilityRequirements.required })
    .from(siteCapabilityRequirements)
    .where(eq(siteCapabilityRequirements.siteId, siteId))
    .orderBy(asc(siteCapabilityRequirements.requirementKey));
}

export async function getAllSiteCapabilityRequirementsBySite(): Promise<
  Record<number, { id: number; requirementKey: string; required: boolean }[]>
> {
  const rows = await db
    .select({
      id: siteCapabilityRequirements.id,
      siteId: siteCapabilityRequirements.siteId,
      requirementKey: siteCapabilityRequirements.requirementKey,
      required: siteCapabilityRequirements.required,
    })
    .from(siteCapabilityRequirements)
    .orderBy(asc(siteCapabilityRequirements.requirementKey));
  const bySite: Record<number, { id: number; requirementKey: string; required: boolean }[]> = {};
  for (const row of rows) {
    (bySite[row.siteId] ??= []).push({ id: row.id, requirementKey: row.requirementKey, required: row.required });
  }
  return bySite;
}

// The requirement_key vocabulary isn't fixed anywhere (SPEC.md §2a note in
// lib/capability-matching.ts) — offering the distinct unit_specs keys that actually exist
// keeps whatever an admin picks matching-capable, rather than free text that silently
// never fires a warning.
export async function getKnownSpecKeys() {
  const rows = await db.selectDistinct({ key: unitSpecs.key }).from(unitSpecs).orderBy(asc(unitSpecs.key));
  return rows.map((r) => r.key);
}

// ── Users & roles (SPEC.md §7 — super_admin only) ──

export async function getAllUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .orderBy(asc(users.name));
}

export async function getRoleEventsForUser(userId: number) {
  return db
    .select({
      id: userRoleEvents.id,
      at: userRoleEvents.at,
      oldRole: userRoleEvents.oldRole,
      newRole: userRoleEvents.newRole,
      actorName: users.name,
    })
    .from(userRoleEvents)
    .innerJoin(users, eq(users.id, userRoleEvents.actorId))
    .where(eq(userRoleEvents.targetUserId, userId))
    .orderBy(desc(userRoleEvents.at));
}

export type { Role };
