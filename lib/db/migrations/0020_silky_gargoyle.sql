ALTER TABLE "generator_providers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- CASCADE below also drops bookings_generator_provider_key_generator_providers_key_fk,
-- the FK that referenced this table — an explicit DROP CONSTRAINT after it (drizzle-kit's
-- default generated form) fails with "constraint does not exist" since CASCADE already
-- removed it, so that statement is omitted here.
DROP TABLE "generator_providers" CASCADE;--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "generator_provider_key";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "generator_provider_other";