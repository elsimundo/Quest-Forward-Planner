-- Adds sites.tms_pad_id — TMS `pads.id` for a site that represents a pad rather than a
-- location. Dormant on arrival: TMS's `pads` table is empty and no booking in TMS (any
-- company) sets `pad_id`, so this is null on every row and stays that way until a company
-- actually starts using pads. Added now at the client's request so the planner is ready for
-- one that does — docs/TMS_WRITE_BACK.md §6.
--
-- Unique, matching tms_location_id: at most one local site may represent a given TMS pad.
-- Mutually exclusive with tms_location_id in practice (a site is a location or a pad, never
-- both), but deliberately NOT enforced with a CHECK yet — there's no data on either side of
-- that rule to validate it against, and a constraint written blind is a constraint written
-- wrong. Add it when pads go live.
ALTER TABLE "sites" ADD COLUMN "tms_pad_id" integer;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tms_pad_id_unique" UNIQUE("tms_pad_id");
