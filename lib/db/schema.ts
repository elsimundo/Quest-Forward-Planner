import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  date,
  uniqueIndex,
  uuid,
  jsonb,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const ROLES = ["viewer", "scheduler", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Nullable — TMS owns the real password once §13.1's auth integration is wired in
  // (DECISIONS.md #17). Unset for any user whose identity is verified against TMS;
  // still used for the (now rare) locally-authenticated fallback path, if any.
  passwordHash: text("password_hash"),
  role: text("role", { enum: ROLES }).notNull().default("viewer"),
  tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
  // "Deactivate staff" (SPEC.md §7) follows the same soft-delete pattern as every other
  // destructive-looking action in the app (§2c) — never a hard DELETE. A deactivated
  // user can't sign in (see verifyCredentials) but their history (booking_events,
  // audit trail) stays attributable.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: integer("deleted_by").references((): AnyPgColumn => users.id),
});

// ── Reference data — mirrored from TMS once §13.1's read-sync exists;
// hand-seeded from the migration script until then. See SPEC.md §2, §2d.

export const modalities = pgTable("modalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").notNull().default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const units = pgTable("units", {
  id: text("id").primaryKey(),
  modalityId: integer("modality_id")
    .notNull()
    .references(() => modalities.id),
  displayOrder: integer("display_order").notNull().default(0),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
});

export const unitSpecs = pgTable(
  "unit_specs",
  {
    id: serial("id").primaryKey(),
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id),
    key: text("key").notNull(),
    value: text("value"),
  },
  (table) => [uniqueIndex("unit_specs_unit_key_unique").on(table.unitId, table.key)],
);

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
});

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // Free text, not an enum — the LHC/CDC/yard taxonomy itself is unconfirmed
  // with the client (SPEC.md §13 Q7). Don't encode a guessed taxonomy here.
  kind: text("kind"),
  companyId: integer("company_id").references(() => companies.id),
  tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
  pendingReview: boolean("pending_review").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const siteCapabilityRequirements = pgTable(
  "site_capability_requirements",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.id),
    requirementKey: text("requirement_key").notNull(),
    required: boolean("required").notNull().default(true),
  },
  (table) => [uniqueIndex("site_capability_requirements_site_key_unique").on(table.siteId, table.requirementKey)],
);

// ── Planner data — owned by this app. See SPEC.md §2, §2c (soft deletes), §3 (statuses).

export const STATUSES = [
  "confirmed",
  "weekend",
  "likely",
  "bidding",
  "service",
  "tbc",
  "cancelled",
  "bankholiday",
] as const;
export type Status = (typeof STATUSES)[number];

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id),
    date: date("date", { mode: "string" }).notNull(),
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.id),
    status: text("status", { enum: STATUSES }).notNull(),
    notes: text("notes"),
    // Not in SPEC §2's table, but §11 explicitly requires optimistic-lock reconciliation
    // against updated_at — added because the mechanism it describes needs somewhere to
    // live. See docs/DECISIONS.md.
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: integer("published_by").references(() => users.id),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: integer("updated_by")
      .notNull()
      .references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: integer("deleted_by").references(() => users.id),
  },
  (table) => [
    // One *live* booking per unit per day — a soft-deleted row doesn't block a
    // new one taking its place (SPEC.md §2c).
    uniqueIndex("bookings_unit_date_live_unique")
      .on(table.unitId, table.date)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const BOOKING_ACTIONS = [
  "create",
  "update",
  "delete",
  "move",
  "swap",
  "overwrite",
  "publish",
  "unpublish",
] as const;
export type BookingAction = (typeof BOOKING_ACTIONS)[number];

export const bookingEvents = pgTable("booking_events", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id")
    .notNull()
    .references(() => users.id),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  action: text("action", { enum: BOOKING_ACTIONS }).notNull(),
  batchId: uuid("batch_id").notNull(),
  bookingBefore: jsonb("booking_before"),
  bookingAfter: jsonb("booking_after"),
});

// Append-only audit trail for role changes — SPEC.md §7: "every change is still written
// to booking_events-style audit logging (actor, target user, old role, new role,
// timestamp) so 'who made X an admin' is always answerable." Kept as its own table
// rather than folded into booking_events, which is specifically about bookings.
export const userRoleEvents = pgTable("user_role_events", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id")
    .notNull()
    .references(() => users.id),
  targetUserId: integer("target_user_id")
    .notNull()
    .references(() => users.id),
  oldRole: text("old_role", { enum: ROLES }).notNull(),
  newRole: text("new_role", { enum: ROLES }).notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
