CREATE TABLE "booking_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"color_bg" text NOT NULL,
	"color_bar" text NOT NULL,
	"color_text" text NOT NULL,
	"color_border" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"editable" boolean DEFAULT true NOT NULL,
	"calendar_derived" boolean DEFAULT false NOT NULL,
	"billable" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "booking_statuses_key_unique" UNIQUE("key")
);
--> statement-breakpoint
-- Seed the eight client-approved statuses (lib/statuses.ts SEED_STATUSES) BEFORE the FK
-- below, so the 15k+ existing bookings that already reference these keys stay valid.
INSERT INTO "booking_statuses"
	("key", "label", "color_bg", "color_bar", "color_text", "color_border", "display_order", "editable", "calendar_derived", "billable", "active")
VALUES
	('confirmed', 'Confirmed', '#ffffff', '#214b7f', '#333333', '#e6e6e6', 0, true, false, true, true),
	('likely', 'Likely — awaiting confirmation', '#e9f4ec', '#3d7f53', '#28563a', '#cfe6d6', 1, true, false, false, true),
	('tbc', 'Site to be confirmed', '#fdf1e7', '#f17f42', '#9a4d1e', '#f6ddc8', 2, true, false, false, true),
	('bidding', 'Bidding for contract', '#f9ebeb', '#b13a3a', '#7c2a2a', '#efd3d3', 3, true, false, false, true),
	('service', 'Corrective works / service', '#e8f4fb', '#2b7bb9', '#1f5a87', '#cfe6f5', 4, true, false, false, true),
	('cancelled', 'Cancelled by customer — chargeable', '#f9ebf6', '#c355ac', '#7d2f6c', '#eed2e8', 5, true, false, true, true),
	('weekend', 'Weekend confirmed', '#eef0f4', '#8b94a3', '#4a5261', '#dde1e8', 6, false, true, true, true),
	('bankholiday', 'Bank holiday', '#fbf4e2', '#e0a826', '#7a5c10', '#f1e3bb', 7, false, true, true, true);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_status_booking_statuses_key_fk" FOREIGN KEY ("status") REFERENCES "public"."booking_statuses"("key") ON DELETE no action ON UPDATE no action;