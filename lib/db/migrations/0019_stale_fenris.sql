CREATE TABLE "generator_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "generator_providers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
-- Seed the three client-requested providers (lib/generator-providers.ts SEED_PROVIDERS).
INSERT INTO "generator_providers"
	("key", "label", "color", "display_order", "active")
VALUES
	('quest_power', 'Quest Power', '#e0a826', 0, true),
	('hunts', 'Hunts', '#6a4c93', 1, true),
	('hss', 'HSS', '#2ab3c0', 2, true);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "generator_provider_key" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "generator_provider_other" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_generator_provider_key_generator_providers_key_fk" FOREIGN KEY ("generator_provider_key") REFERENCES "public"."generator_providers"("key") ON DELETE no action ON UPDATE no action;