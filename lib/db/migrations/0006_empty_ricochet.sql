-- Units get a surrogate integer PK instead of using the TMS registration ("CT17") as the
-- primary key — registrations are only unique WITHIN a company, not globally
-- (docs/TMS_INTEGRATION_PLAN.md §4.1). This also adds company_id to units/sites/bookings
-- (hard company scoping, §2) and replaces units.modality_id with a unit_modalities m2m
-- join table, since a unit can carry more than one modality (§4.2). Hand-written rather
-- than drizzle-kit-generated: a primary-key type change with 15k+ dependent booking rows
-- needs a careful backfill-then-rename sequence, not a blind ALTER COLUMN ... TYPE.
-- See docs/DECISIONS.md and docs/TMS_INTEGRATION_PLAN.md §4 for the full reasoning.

-- ── Phase A: new columns on units, no constraints dropped yet ──

ALTER TABLE "units" ADD COLUMN "registration" text;
UPDATE "units" SET "registration" = "id";
ALTER TABLE "units" ALTER COLUMN "registration" SET NOT NULL;

ALTER TABLE "units" ADD COLUMN "company_id" integer;
-- Every unit/site/booking here is InHealth's TMS company (id 3) — the only company this
-- app handles today (docs/TMS_INTEGRATION_PLAN.md §2: "InHealth company_id = 3 ONLY").
INSERT INTO "companies" ("name") VALUES ('InHealth') ON CONFLICT ("name") DO NOTHING;
UPDATE "units" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'InHealth');
ALTER TABLE "units" ALTER COLUMN "company_id" SET NOT NULL;

-- The new surrogate key. Values are just distinct positive integers assigned by the
-- sequence — no meaning beyond identity.
ALTER TABLE "units" ADD COLUMN "id_new" serial;

-- ── Phase B: backfill the FK columns on tables that reference units, via the OLD text id ──

ALTER TABLE "bookings" ADD COLUMN "unit_id_new" integer;
UPDATE "bookings" b SET "unit_id_new" = u."id_new" FROM "units" u WHERE u."id" = b."unit_id";

ALTER TABLE "unit_specs" ADD COLUMN "unit_id_new" integer;
UPDATE "unit_specs" s SET "unit_id_new" = u."id_new" FROM "units" u WHERE u."id" = s."unit_id";

-- ── Phase C: unit_modalities, backfilled from the old single-valued units.modality_id ──

CREATE TABLE "unit_modalities" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"modality_id" integer NOT NULL
);
INSERT INTO "unit_modalities" ("unit_id", "modality_id")
SELECT "id_new", "modality_id" FROM "units" WHERE "modality_id" IS NOT NULL;

-- ── Phase D: fail loudly rather than silently lose or misassign data ──

DO $$
DECLARE bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count FROM "bookings" WHERE "unit_id_new" IS NULL;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'migration 0006: % bookings row(s) failed to map to a unit', bad_count;
  END IF;
  SELECT count(*) INTO bad_count FROM "unit_specs" WHERE "unit_id_new" IS NULL;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'migration 0006: % unit_specs row(s) failed to map to a unit', bad_count;
  END IF;
END $$;

-- ── Phase E: drop old FKs/indexes/columns, promote the new ones into place ──

ALTER TABLE "bookings" DROP CONSTRAINT "bookings_unit_id_units_id_fk";
DROP INDEX "bookings_unit_date_live_unique";
ALTER TABLE "unit_specs" DROP CONSTRAINT "unit_specs_unit_id_units_id_fk";
DROP INDEX "unit_specs_unit_key_unique";
ALTER TABLE "units" DROP CONSTRAINT "units_modality_id_modalities_id_fk";

ALTER TABLE "bookings" DROP COLUMN "unit_id";
ALTER TABLE "unit_specs" DROP COLUMN "unit_id";
ALTER TABLE "units" DROP COLUMN "modality_id";

ALTER TABLE "units" DROP CONSTRAINT "units_pkey";
ALTER TABLE "units" DROP COLUMN "id";
ALTER TABLE "units" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "units" ADD PRIMARY KEY ("id");

ALTER TABLE "bookings" RENAME COLUMN "unit_id_new" TO "unit_id";
ALTER TABLE "bookings" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "unit_specs" RENAME COLUMN "unit_id_new" TO "unit_id";
ALTER TABLE "unit_specs" ALTER COLUMN "unit_id" SET NOT NULL;

-- ── Phase F: recreate FKs and indexes against the new integer id ──

ALTER TABLE "units" ADD CONSTRAINT "units_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "units_company_registration_live_unique" ON "units" USING btree ("company_id","registration") WHERE "units"."deleted_at" is null;

ALTER TABLE "unit_modalities" ADD CONSTRAINT "unit_modalities_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "unit_modalities" ADD CONSTRAINT "unit_modalities_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "unit_modalities_unit_modality_unique" ON "unit_modalities" USING btree ("unit_id","modality_id");

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "bookings_unit_date_live_unique" ON "bookings" USING btree ("unit_id","date") WHERE "bookings"."deleted_at" is null;

ALTER TABLE "unit_specs" ADD CONSTRAINT "unit_specs_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "unit_specs_unit_key_unique" ON "unit_specs" USING btree ("unit_id","key");

-- ── Phase G: sites.company_id — backfill and lock down ──

UPDATE "sites" SET "company_id" = (SELECT "id" FROM "companies" WHERE "name" = 'InHealth') WHERE "company_id" IS NULL;
ALTER TABLE "sites" ALTER COLUMN "company_id" SET NOT NULL;

-- ── Phase H: bookings.company_id / modality_id — denormalised for the sheet query and the
-- one-live-booking-per-unit-per-day index (docs/TMS_INTEGRATION_PLAN.md §4.3) ──

ALTER TABLE "bookings" ADD COLUMN "company_id" integer;
ALTER TABLE "bookings" ADD COLUMN "modality_id" integer;

-- Derived from the unit's own company, not re-looked-up by name — keeps the invariant
-- "a booking's company always matches its unit's company" explicit in the backfill itself.
UPDATE "bookings" b SET "company_id" = u."company_id" FROM "units" u WHERE u."id" = b."unit_id";

-- Every unit here has exactly one row in unit_modalities today (single-modality CT fleet,
-- verified before writing this migration), so this join yields exactly one match per
-- booking. This is a one-time backfill for the CT-only launch data — it is NOT how a
-- booking's modality gets decided once units can carry multiple modalities; from here on,
-- modality_id is supplied and validated explicitly at booking-save time (lib/actions/bookings.ts).
UPDATE "bookings" b SET "modality_id" = um."modality_id" FROM "unit_modalities" um WHERE um."unit_id" = b."unit_id";

DO $$
DECLARE bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count FROM "bookings" WHERE "company_id" IS NULL OR "modality_id" IS NULL;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'migration 0006: % bookings row(s) failed to backfill company_id/modality_id', bad_count;
  END IF;
END $$;

ALTER TABLE "bookings" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "bookings" ALTER COLUMN "modality_id" SET NOT NULL;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE no action ON UPDATE no action;
