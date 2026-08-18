import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./index";
import {
  bookingEvents,
  bookings,
  bookingStatuses,
  tagCategoryAssignments,
  sites,
  users,
  userRoleEvents,
  siteCapabilityRequirements,
  unitSpecs,
  tmsSyncRuns,
  tmsBookingImportRuns,
  securityEvents,
  type BookingAction,
  type Role,
  type TagCategory,
  type TmsSyncStatus,
  type SecurityEventAction,
  type SecurityEventStatus,
} from "./schema";
import type { TmsSyncSummary } from "./tms/sync";
import type { BookingImportSummary } from "./tms/booking-import";

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
  // `null` means "every company" — only valid for a super_admin's `{kind:"any"}` access
  // (docs/DECISIONS.md #22); every other caller passes their one fixed company id.
  // `booking_events` has no plain company_id column — company lives inside the JSON
  // snapshot (every booking carries its own companyId), same source the existing
  // unitLabelSql/siteName lookups already read from.
  companyId: number | null,
  filters: AuditLogFilters,
  page: number,
): Promise<{ rows: AuditLogRow[]; hasMore: boolean }> {
  const conditions = [];
  if (companyId !== null) {
    conditions.push(
      sql`coalesce((${bookingEvents.bookingAfter}->>'companyId')::int, (${bookingEvents.bookingBefore}->>'companyId')::int) = ${companyId}`,
    );
  }
  if (filters.action) conditions.push(eq(bookingEvents.action, filters.action));
  if (filters.from) conditions.push(gte(bookingEvents.at, new Date(`${filters.from}T00:00:00Z`)));
  if (filters.to) conditions.push(lte(bookingEvents.at, new Date(`${filters.to}T23:59:59.999Z`)));
  // Unit display label — every write site enriches its snapshot with `unitRegistration`
  // (docs/TMS_INTEGRATION_PLAN.md §4.1: bookings.unit_id is a numeric surrogate now, not a
  // human label). Falls back to the legacy `unitId` field for events logged before that
  // enrichment existed — those already hold a text registration like "CT17" directly.
  const unitLabelSql = sql<string | null>`coalesce(
    ${bookingEvents.bookingAfter}->>'unitRegistration', ${bookingEvents.bookingBefore}->>'unitRegistration',
    ${bookingEvents.bookingAfter}->>'unitId', ${bookingEvents.bookingBefore}->>'unitId'
  )`;

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    // Unit label and actor name/email are plain columns/jsonb text; site name requires a
    // subquery since booking_before/after only carry site_id, not the name.
    conditions.push(
      or(
        ilike(unitLabelSql, q),
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
      unitId: unitLabelSql,
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

// `companyId: null` means "every company" — only valid for a super_admin's `{kind:"any"}`
// access (docs/DECISIONS.md #22); every other caller passes their one fixed company id.
export async function getPendingSites(companyId: number | null) {
  const conditions = [eq(sites.pendingReview, true), isNull(sites.deletedAt)];
  if (companyId !== null) conditions.push(eq(sites.companyId, companyId));
  const rows = await db
    .select({ id: sites.id, name: sites.name, kind: sites.kind })
    .from(sites)
    .where(and(...conditions))
    .orderBy(asc(sites.name));

  const withCounts = await Promise.all(
    rows.map(async (s) => ({
      ...s,
      bookingCount: await db.$count(bookings, and(eq(bookings.siteId, s.id), isNull(bookings.deletedAt))),
    })),
  );
  return withCounts;
}

export async function searchApprovedSites(companyId: number | null, q: string, excludeId?: number) {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const conditions = [isNull(sites.deletedAt), eq(sites.pendingReview, false), ilike(sites.name, `%${trimmed}%`)];
  if (companyId !== null) conditions.push(eq(sites.companyId, companyId));
  if (excludeId) conditions.push(sql`${sites.id} != ${excludeId}`);
  return db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(...conditions))
    .orderBy(asc(sites.name))
    .limit(8);
}

// ── Pad grouping (docs/TMS_INTEGRATION_PLAN.md §5, docs/DECISIONS.md #25) ──

export type SiteGroupRow = { id: number; name: string; children: { id: number; name: string }[] };

const hasChildrenForGroups = sql<boolean>`EXISTS (
  SELECT 1 FROM sites AS child WHERE child.parent_site_id = sites.id AND child.deleted_at IS NULL
)`;

// A "group" is a parentless site that's either locally-created (no tmsLocationId — a
// pure group wrapper) or already has children (a site with pads grouped under it).
// TMS-synced sites without children are excluded — they're regular sites, not groups.
export async function getSiteGroups(companyId: number | null): Promise<SiteGroupRow[]> {
  const parentConditions = [isNull(sites.deletedAt), isNull(sites.parentSiteId)];
  if (companyId !== null) parentConditions.push(eq(sites.companyId, companyId));
  const parents = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(...parentConditions, or(isNull(sites.tmsLocationId), hasChildrenForGroups)))
    .orderBy(asc(sites.name));

  const parentIds = parents.map((p) => p.id);
  const childRows = parentIds.length
    ? await db
        .select({ id: sites.id, name: sites.name, parentSiteId: sites.parentSiteId })
        .from(sites)
        .where(and(inArray(sites.parentSiteId, parentIds), isNull(sites.deletedAt)))
        .orderBy(asc(sites.name))
    : [];
  const childrenByParent = new Map<number, { id: number; name: string }[]>();
  for (const c of childRows) {
    const arr = childrenByParent.get(c.parentSiteId as number) ?? [];
    arr.push({ id: c.id, name: c.name });
    childrenByParent.set(c.parentSiteId as number, arr);
  }
  return parents.map((p) => ({ ...p, children: childrenByParent.get(p.id) ?? [] }));
}

// ── Site capability requirements (SPEC.md §2a, §7) ──

export async function getAllSitesBasic(companyId: number | null) {
  const conditions = [isNull(sites.deletedAt), eq(sites.pendingReview, false)];
  if (companyId !== null) conditions.push(eq(sites.companyId, companyId));
  return db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(...conditions))
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

// ── Booking statuses admin (docs/DECISIONS.md #18) ──

export type AdminBookingStatus = {
  id: number;
  key: string;
  label: string;
  colorBg: string;
  colorBar: string;
  colorText: string;
  colorBorder: string;
  displayOrder: number;
  editable: boolean;
  calendarDerived: boolean;
  billable: boolean;
  publishable: boolean;
  active: boolean;
  // How many live bookings currently use this status — retiring one with usage > 0 hides it
  // from the picker but keeps it rendering on those bookings.
  usageCount: number;
};

export async function listBookingStatusesForAdmin(): Promise<AdminBookingStatus[]> {
  const usage = db
    .select({ status: bookings.status, n: sql<number>`count(*)`.as("n") })
    .from(bookings)
    .where(isNull(bookings.deletedAt))
    .groupBy(bookings.status)
    .as("usage");

  const rows = await db
    .select({
      id: bookingStatuses.id,
      key: bookingStatuses.key,
      label: bookingStatuses.label,
      colorBg: bookingStatuses.colorBg,
      colorBar: bookingStatuses.colorBar,
      colorText: bookingStatuses.colorText,
      colorBorder: bookingStatuses.colorBorder,
      displayOrder: bookingStatuses.displayOrder,
      editable: bookingStatuses.editable,
      calendarDerived: bookingStatuses.calendarDerived,
      billable: bookingStatuses.billable,
      publishable: bookingStatuses.publishable,
      active: bookingStatuses.active,
      usageCount: sql<number>`coalesce(${usage.n}, 0)`,
    })
    .from(bookingStatuses)
    .leftJoin(usage, eq(usage.status, bookingStatuses.key))
    .where(isNull(bookingStatuses.deletedAt))
    .orderBy(asc(bookingStatuses.displayOrder));

  return rows.map((r) => ({ ...r, usageCount: Number(r.usageCount) }));
}

// ── Tag categories admin (docs/DECISIONS.md — generator was the first, parking the
// second). Every (tag, category) pairing an admin has designated, keyed for a quick
// lookup against the live TMS tag list the admin page renders alongside it. ──

export type TagCategoryAssignmentRow = { tmsTagId: number; category: TagCategory };

export async function listTagCategoryAssignments(): Promise<TagCategoryAssignmentRow[]> {
  return db.select({ tmsTagId: tagCategoryAssignments.tmsTagId, category: tagCategoryAssignments.category }).from(tagCategoryAssignments);
}

// ── TMS reference sync (docs/TMS_INTEGRATION_PLAN.md §6A) ──

export type TmsSyncRunRow = {
  id: number;
  startedAt: Date;
  finishedAt: Date | null;
  status: TmsSyncStatus;
  error: string | null;
  summary: TmsSyncSummary | null;
  triggeredByName: string | null;
};

export async function getRecentTmsSyncRuns(limit = 10): Promise<TmsSyncRunRow[]> {
  const rows = await db
    .select({
      id: tmsSyncRuns.id,
      startedAt: tmsSyncRuns.startedAt,
      finishedAt: tmsSyncRuns.finishedAt,
      status: tmsSyncRuns.status,
      error: tmsSyncRuns.error,
      summary: tmsSyncRuns.summary,
      triggeredByName: users.name,
    })
    .from(tmsSyncRuns)
    .leftJoin(users, eq(users.id, tmsSyncRuns.triggeredBy))
    .orderBy(desc(tmsSyncRuns.id))
    .limit(limit);
  return rows.map((r) => ({ ...r, summary: r.summary as TmsSyncSummary | null, triggeredByName: r.triggeredByName ?? null }));
}

// ── TMS booking import (docs/TMS_INTEGRATION_PLAN.md §6B) ──

export type TmsBookingImportRunRow = {
  id: number;
  startedAt: Date;
  finishedAt: Date | null;
  status: TmsSyncStatus;
  error: string | null;
  summary: BookingImportSummary | null;
  triggeredByName: string | null;
};

export async function getRecentTmsBookingImportRuns(limit = 10): Promise<TmsBookingImportRunRow[]> {
  const rows = await db
    .select({
      id: tmsBookingImportRuns.id,
      startedAt: tmsBookingImportRuns.startedAt,
      finishedAt: tmsBookingImportRuns.finishedAt,
      status: tmsBookingImportRuns.status,
      error: tmsBookingImportRuns.error,
      summary: tmsBookingImportRuns.summary,
      triggeredByName: users.name,
    })
    .from(tmsBookingImportRuns)
    .leftJoin(users, eq(users.id, tmsBookingImportRuns.triggeredBy))
    .orderBy(desc(tmsBookingImportRuns.id))
    .limit(limit);
  return rows.map((r) => ({ ...r, summary: r.summary as BookingImportSummary | null, triggeredByName: r.triggeredByName ?? null }));
}

// ── Security events (docs/ISO-27001-COMPLIANCE.md — admin browse of security_events) ──

export type SecurityEventRow = {
  id: number;
  at: Date;
  userId: number | null;
  identifier: string | null;
  action: SecurityEventAction;
  status: SecurityEventStatus;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  userName: string | null;
  userEmail: string | null;
};

export type SecurityEventFilters = {
  q?: string;
  action?: SecurityEventAction;
  status?: SecurityEventStatus;
  from?: string;
  to?: string;
};

export async function getSecurityEvents(
  filters: SecurityEventFilters,
  page: number,
): Promise<{ rows: SecurityEventRow[]; hasMore: boolean }> {
  const conditions = [];
  if (filters.action) conditions.push(eq(securityEvents.action, filters.action));
  if (filters.status) conditions.push(eq(securityEvents.status, filters.status));
  if (filters.from) conditions.push(gte(securityEvents.at, new Date(`${filters.from}T00:00:00Z`)));
  if (filters.to) conditions.push(lte(securityEvents.at, new Date(`${filters.to}T23:59:59.999Z`)));
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(securityEvents.identifier, q),
        ilike(users.name, q),
        ilike(users.email, q),
        ilike(securityEvents.ipAddress, q),
        ilike(securityEvents.reason, q),
      ),
    );
  }

  const rows = await db
    .select({
      id: securityEvents.id,
      at: securityEvents.at,
      userId: securityEvents.userId,
      identifier: securityEvents.identifier,
      action: securityEvents.action,
      status: securityEvents.status,
      reason: securityEvents.reason,
      ipAddress: securityEvents.ipAddress,
      userAgent: securityEvents.userAgent,
      details: securityEvents.details,
      userName: users.name,
      userEmail: users.email,
    })
    .from(securityEvents)
    .leftJoin(users, eq(users.id, securityEvents.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(securityEvents.at), desc(securityEvents.id))
    .limit(PAGE_SIZE + 1)
    .offset(page * PAGE_SIZE);

  const hasMore = rows.length > PAGE_SIZE;
  return {
    rows: rows.slice(0, PAGE_SIZE).map((r) => ({
      ...r,
      details: r.details as Record<string, unknown> | null,
    })),
    hasMore,
  };
}

export type { Role };
