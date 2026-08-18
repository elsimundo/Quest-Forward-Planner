CREATE TABLE "tag_category_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tms_tag_id" integer NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
ALTER TABLE "tag_category_assignments" ADD CONSTRAINT "tag_category_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tag_category_assignments_tag_category_unique" ON "tag_category_assignments" USING btree ("tms_tag_id","category");