CREATE SEQUENCE "public"."booking_ref_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "tms_booking_import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"summary" jsonb,
	"triggered_by" integer
);
--> statement-breakpoint

-- booking_ref is added nullable, backfilled (nextval() evaluates once per row in an
-- UPDATE, so every existing booking gets its own distinct FP-NNNNNN — physical scan order
-- isn't guaranteed to match id order, but nothing requires that, only uniqueness), then
-- locked down — an existing 15k+ row table can't take a fresh NOT NULL column with no
-- default in one step.
ALTER TABLE "bookings" ADD COLUMN "booking_ref" text;--> statement-breakpoint
UPDATE "bookings" SET "booking_ref" = 'FP-' || lpad(nextval('booking_ref_seq')::text, 6, '0')
WHERE "booking_ref" IS NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "booking_ref" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "bookings" ADD COLUMN "source" text DEFAULT 'planner' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tms_booking_id" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tms_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tms_imported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tms_conflict_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tms_booking_import_runs" ADD CONSTRAINT "tms_booking_import_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booking_ref_unique" UNIQUE("booking_ref");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tms_booking_id_unique" UNIQUE("tms_booking_id");
