CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"tms_synced_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
