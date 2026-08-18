import { sql } from "drizzle-orm";
import {
  pgTable,
  pgSequence,
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
  // TMS users.company_id for THIS PERSON — refreshed on every login, distinct from
  // companies.tmsCompanyId (which tracks which TMS company a *local company row*
  // represents). Drives hard company scoping (docs/TMS_INTEGRATION_PLAN.md §2,
  // docs/DECISIONS.md #22): a non-super_admin is locked server-side to whichever local
  // company has this same tmsCompanyId — never a client-supplied value. Null for a Quest-
  // internal TMS account (e.g. `superuser`) with no specific company affiliation.
  tmsCompanyId: integer("tms_company_id"),
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

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // TMS companies.id — InHealth is 3 (docs/TMS_INTEGRATION_PLAN.md §2). Null until the
  // first sync run links this row; the app only ever handles one company today.
  tmsCompanyId: integer("tms_company_id").unique(),
  tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
});

// `id` is a surrogate key, NOT the registration — TMS registrations ("CT17") are only
// unique *within* a company, not globally (docs/TMS_INTEGRATION_PLAN.md §4.1: TMS has
// "CT4" under both InHealth and Canon). Display identity lives in `registration`.
export const units = pgTable(
  "units",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    registration: text("registration").notNull(),
    // TMS units.id — the sync's upsert key. Null for a unit that only exists locally
    // (shouldn't happen once sync is the source of truth, but nothing in the app assumes
    // it's set). Never written by anything except the sync (lib/db/tms/sync.ts).
    tmsUnitId: integer("tms_unit_id").unique(),
    displayOrder: integer("display_order").notNull().default(0),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("units_company_registration_live_unique")
      .on(table.companyId, table.registration)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// Many-to-many, matching TMS's own unit_modalities (docs/TMS_INTEGRATION_PLAN.md §4.2) — a
// unit can carry more than one modality (e.g. a unit that scans both CT and MRI) and then
// appears as a row on both sheets. Replaces the old single units.modality_id column.
export const unitModalities = pgTable(
  "unit_modalities",
  {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    modalityId: integer("modality_id")
      .notNull()
      .references(() => modalities.id),
  },
  (table) => [uniqueIndex("unit_modalities_unit_modality_unique").on(table.unitId, table.modalityId)],
);

export const unitSpecs = pgTable(
  "unit_specs",
  {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    key: text("key").notNull(),
    value: text("value"),
  },
  (table) => [uniqueIndex("unit_specs_unit_key_unique").on(table.unitId, table.key)],
);

// name unique *within* a company, not globally (same reasoning as `units.registration`
// above, docs/TMS_INTEGRATION_PLAN.md §11) — two different companies can genuinely have a
// same-named location (confirmed live in TMS: "LCS Tesco Harrow" exists under both InHealth
// and Quest Power), so a global unique constraint would crash multi-company sync outright.
export const sites = pgTable(
  "sites",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    // Free text, not an enum — the LHC/CDC/yard taxonomy itself is unconfirmed
    // with the client (SPEC.md §13 Q7). Don't encode a guessed taxonomy here.
    kind: text("kind"),
    // NOT NULL — every site belongs to a company. Hard company scoping is a security
    // boundary, not a convenience (docs/TMS_INTEGRATION_PLAN.md §2, §11).
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    // TMS locations.id — the sync's upsert key. Null for a site created locally via the
    // booking drawer's free-text flow (pendingReview) — those are never touched by sync.
    tmsLocationId: integer("tms_location_id").unique(),
    // TMS `pads.id`, for a site that represents a PAD rather than a location. Dormant today
    // and null on every row: TMS's `pads` table is empty and no booking in TMS — any company
    // — sets `pad_id`. Added now because the client wants the planner to work for a company
    // that starts using pads later (docs/TMS_WRITE_BACK.md §6).
    //
    // Mutually exclusive with `tmsLocationId`: a site is either a TMS location or a TMS pad,
    // never both. Not enforced by a constraint (nothing populates either path for pads yet);
    // if pads ever go live, add the CHECK then, when there's real data to validate against.
    //
    // The models differ in shape, which is why this is a separate column rather than reusing
    // `tmsLocationId`: TMS puts `location_id` AND `pad_id` on a booking, whereas ours points
    // at a single `site_id` that may itself be a pad (via `parentSiteId`). Publish translates
    // between the two — see the build plan's D2.
    tmsPadId: integer("tms_pad_id").unique(),
    town: text("town"),
    postcode: text("postcode"),
    nominalCode: text("nominal_code"),
    tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
    pendingReview: boolean("pending_review").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    // Pad grouping (docs/TMS_INTEGRATION_PLAN.md §5, docs/DECISIONS.md #25) — nullable
    // self-reference, one level only (a parent's own parentSiteId must stay null, enforced
    // in lib/actions/admin/site-groups.ts, not the DB). Null for every site until an admin
    // explicitly groups it. TMS has no concept of this; it's purely local organisation on
    // top of sites TMS already gave us as flat, independently-bookable rows — grouping
    // never changes what an existing booking's site_id points at.
    parentSiteId: integer("parent_site_id").references((): AnyPgColumn => sites.id),
  },
  (table) => [
    uniqueIndex("sites_company_name_live_unique")
      .on(table.companyId, table.name)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// One row per read-only reference sync run (lib/db/tms/sync.ts) — the audit trail for
// "what did the last sync actually change," per docs/TMS_INTEGRATION_PLAN.md §6A ("show
// the diff... so a surprise mass-change is visible"). Never soft-deleted or edited.
export const TMS_SYNC_STATUSES = ["running", "success", "error"] as const;
export type TmsSyncStatus = (typeof TMS_SYNC_STATUSES)[number];

export const tmsSyncRuns = pgTable("tms_sync_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status", { enum: TMS_SYNC_STATUSES }).notNull().default("running"),
  error: text("error"),
  // { companies: {added,updated,removed}, units: {...}, sites: {...}, unitModalities: {added} }
  summary: jsonb("summary"),
  // Null for an automated (cron/webhook) run — see app/api/tms-sync/route.ts.
  triggeredBy: integer("triggered_by").references(() => users.id),
});

// One row per TMS booking import run (lib/db/tms/booking-import.ts, docs/DECISIONS.md #21)
// — a separate log from tms_sync_runs because this is a materially higher-stakes operation
// (it touches live, possibly scheduler-edited booking data, not just reference data) and
// its summary shape is different (created/refreshed/conflicts/skipped, not added/updated/
// removed per entity). Kept as its own independently-triggerable step for the same reason.
export const tmsBookingImportRuns = pgTable("tms_booking_import_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status", { enum: TMS_SYNC_STATUSES }).notNull().default("running"),
  error: text("error"),
  // { created, refreshed, unchanged, conflicts: [{unitRegistration,date,siteName}], skipped: [{reason,count}] }
  summary: jsonb("summary"),
  triggeredBy: integer("triggered_by").references(() => users.id),
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

// The eight *seed* statuses. As of the TMS integration work (docs/TMS_INTEGRATION_PLAN.md
// §3, docs/DECISIONS.md #18) the catalogue of statuses is admin-managed DATA in
// `bookingStatuses`, not a fixed enum — TMS's own booking_status table is obsolete and the
// client wants their own set. These keys survive as the ones the app reasons about
// structurally: the two calendar-derived ones (weekend/bankholiday) that a user can never
// pick, and the default a fresh booking takes. Admins may add, retire, recolour, and
// relabel statuses beyond these; hence `Status` is the seed union, but a booking's status
// is a free `text` key into the catalogue, not constrained to this list.
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

// Admin-managed status catalogue. Keyed by a stable `key` slug that bookings reference and
// that the calendar-derived logic keys off — labels/colours/order are all editable without
// touching code. Seeded from lib/statuses.ts so nothing changes visually at launch.
export const bookingStatuses = pgTable("booking_statuses", {
  id: serial("id").primaryKey(),
  // Stable identity a booking points at and code can special-case (weekend/bankholiday).
  // Immutable once created — admins relabel via `label`, not by changing the key.
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  // The four-part render palette, matching reference/quest-ct-forward-planner.jsx and
  // lib/statuses.ts's STATUS_CONFIG. Stored so the client-approved colours are editable.
  colorBg: text("color_bg").notNull(),
  colorBar: text("color_bar").notNull(),
  colorText: text("color_text").notNull(),
  colorBorder: text("color_border").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  // User-selectable in the booking drawer. false for calendar-derived statuses, which the
  // app assigns from the date, never the scheduler (SPEC.md §3, §5).
  editable: boolean("editable").notNull().default(true),
  // weekend / bankholiday: assigned by the app from the calendar, not pickable.
  calendarDerived: boolean("calendar_derived").notNull().default(false),
  // Mirrors TMS's booking_statuses.billable — informational for now, drives future export.
  billable: boolean("billable").notNull().default(false),
  // May a booking in this status be forwarded to TMS? Replaces the hardcoded
  // PUBLISHABLE_STATUS_KEYS list (docs/DECISIONS.md #24) at the client's request
  // (docs/TMS_WRITE_BACK.md §3.3) so publishability is admin-editable alongside labels and
  // colours rather than needing a code change. Seeded true for confirmed/weekend/bankholiday
  // in migration 0012 — exactly the old behaviour — and false for everything still "in
  // discussion". New statuses default false: publishing to TMS is the consequential
  // direction, so it should be opted into deliberately.
  publishable: boolean("publishable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  // Soft delete, per CLAUDE.md — a retired status keeps rendering on historical bookings.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Tag categories (docs/DECISIONS.md, supersedes the standalone `generator_providers`
// catalogue) — TMS's own `booking_tags` already carries supplier/facility-shaped tags
// ("Quest Generator", a future parking tag, etc, docs/DECISIONS.md #51), so rather than a
// second parallel catalogue per concept, admins just designate a SUBSET of the live tag
// catalogue as meaning something structural. Generic over category from day one: generator
// was the first, parking is the second (planned — data destined for a downstream app), and
// the shape adds a new category with no schema change, just a new entry in TAG_CATEGORIES.
export const TAG_CATEGORIES = ["generator", "parking"] as const;
export type TagCategory = (typeof TAG_CATEGORIES)[number];

// No local tags table to FK against (same reasoning as `bookings.tag_ids`) — this just
// flags a TMS `booking_tags.id` as belonging to a category; the tag's own name/colour
// (fetched live) drive the label and swatch everywhere this renders. A tag can belong to
// more than one category (unique per tag+category pair, not per tag).
export const tagCategoryAssignments = pgTable(
  "tag_category_assignments",
  {
    id: serial("id").primaryKey(),
    tmsTagId: integer("tms_tag_id").notNull(),
    category: text("category", { enum: TAG_CATEGORIES }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: integer("created_by").references(() => users.id),
  },
  (table) => [uniqueIndex("tag_category_assignments_tag_category_unique").on(table.tmsTagId, table.category)],
);

// Backs bookings.booking_ref ("FP-000123") — a single global, never-reset sequence
// (docs/TMS_INTEGRATION_PLAN.md §4.3: "FP-000123", decided over a per-year reset because
// that just buys ambiguity across years for no benefit). Every booking gets one, whether
// created locally or imported from TMS, so every row the app shows has one consistent
// handle distinct from TMS's own "BK:A…" numbers.
export const bookingRefSeq = pgSequence("booking_ref_seq", { startWith: 1, increment: 1 });

export const BOOKING_SOURCES = ["planner", "tms"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    // "FP-000123" — see bookingRefSeq above. Minted once at create time (lib/db/booking-ref.ts),
    // never regenerated.
    bookingRef: text("booking_ref").notNull().unique(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    // Denormalised from the unit at write time (docs/TMS_INTEGRATION_PLAN.md §4.3) — the
    // one-live-booking-per-unit-per-day index and the modality-sheet query both need these
    // without a join. Never trust these from the client: companyId is derived from the
    // unit server-side, and modalityId is validated against the unit's actual tagged
    // modalities (unit_modalities) before a save is accepted.
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    modalityId: integer("modality_id")
      .notNull()
      .references(() => modalities.id),
    date: date("date", { mode: "string" }).notNull(),
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.id),
    // Free-text key into the admin-managed `bookingStatuses` catalogue (not the old fixed
    // enum) — see the note on STATUSES above and docs/DECISIONS.md #18.
    status: text("status")
      .notNull()
      .references(() => bookingStatuses.key),
    notes: text("notes"),
    // TMS booking_tags.id values selected for this booking (docs/DECISIONS.md #51). No
    // local tags table to FK against — the catalogue is queried live from TMS
    // (lib/db/tms/queries.ts:listTmsBookingTags), company-scoped, same convention as
    // listTmsUnits/listTmsLocations. A flat array, mirroring TMS's own flat
    // booking_tag_ids array on `bookings`.
    tagIds: integer("tag_ids").array().notNull().default(sql`'{}'::integer[]`),
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

    // ── TMS booking import (docs/TMS_INTEGRATION_PLAN.md §6B, docs/DECISIONS.md #21) ──
    source: text("source", { enum: BOOKING_SOURCES }).notNull().default("planner"),
    // TMS bookings.id — the import's upsert key. Null for a booking created here in the
    // planner that hasn't (yet, or ever) matched a TMS booking.
    tmsBookingId: integer("tms_booking_id").unique(),
    // TMS's own updated_at, as of the last time the import successfully wrote this row —
    // the import's signal for "has TMS changed this since we last looked."
    tmsUpdatedAt: timestamp("tms_updated_at", { withTimezone: true }),
    // When the import last wrote to this row. Comparing this against `updatedAt` above is
    // how the import tells "has a scheduler edited this locally since we last imported it"
    // — updatedAt only advances past tmsImportedAt when something *other than* the import
    // itself touched the row.
    tmsImportedAt: timestamp("tms_imported_at", { withTimezone: true }),
    // Set when an import run finds BOTH sides changed since the last import — the
    // never-silently-overwrite rule (§6B). Never auto-cleared by the import; a scheduler
    // clears it by deliberately interacting with the booking again — editing and
    // re-saving it (lib/actions/bookings.ts) or moving it (lib/actions/booking-moves.ts)
    // — either of which is the "I've looked at this" signal.
    tmsConflictAt: timestamp("tms_conflict_at", { withTimezone: true }),
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

// ── Security audit log (docs/ISO-27001-TESTING-AUDITING-GUIDE.md §5) — distinct from
// booking_events/user_role_events, which record WHAT changed in the app's own data.
// This table records security-relevant EVENTS about who is trying to get in: logins
// (success/failure), and access denied by requireRole. userId is nullable because a
// failed login often has no matching local user row at all (unknown TMS identity,
// wrong password before any user is resolved).
export const SECURITY_EVENT_ACTIONS = ["login", "logout", "unauthorized_access"] as const;
export type SecurityEventAction = (typeof SECURITY_EVENT_ACTIONS)[number];

export const SECURITY_EVENT_STATUSES = ["success", "failure"] as const;
export type SecurityEventStatus = (typeof SECURITY_EVENT_STATUSES)[number];

export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
  // The username/email that was attempted, even when it never resolved to a user row —
  // needed to investigate a wrong-password or unknown-identity login attempt.
  identifier: text("identifier"),
  action: text("action", { enum: SECURITY_EVENT_ACTIONS }).notNull(),
  status: text("status", { enum: SECURITY_EVENT_STATUSES }).notNull(),
  // Machine-readable reason, e.g. "rate_limited", "no_scheduling_access", "wrong_role".
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"),
});
