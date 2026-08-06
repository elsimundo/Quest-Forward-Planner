CREATE TABLE IF NOT EXISTS "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"identifier" text,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"ip_address" text,
	"user_agent" text,
	"details" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
