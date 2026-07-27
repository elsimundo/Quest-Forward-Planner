CREATE TABLE "tms_sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"summary" jsonb,
	"triggered_by" integer
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tms_company_id" integer;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "tms_location_id" integer;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "town" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "postcode" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "nominal_code" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "tms_unit_id" integer;--> statement-breakpoint
ALTER TABLE "tms_sync_runs" ADD CONSTRAINT "tms_sync_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tms_company_id_unique" UNIQUE("tms_company_id");--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tms_location_id_unique" UNIQUE("tms_location_id");--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_tms_unit_id_unique" UNIQUE("tms_unit_id");