CREATE TABLE "generator_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"tms_tag_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "generator_tags_tms_tag_id_unique" UNIQUE("tms_tag_id")
);
--> statement-breakpoint
ALTER TABLE "generator_tags" ADD CONSTRAINT "generator_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;