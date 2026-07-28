-- Adds booking_statuses.publishable — "may a booking in this status be forwarded to TMS?"
-- Replaces the hardcoded PUBLISHABLE_STATUS_KEYS list in lib/statuses.ts (docs/DECISIONS.md
-- #24) with admin-editable data, at the client's request (docs/TMS_WRITE_BACK.md §3.3).
--
-- Seeded to reproduce today's behaviour EXACTLY, so nothing changes on deploy: true for
-- `confirmed` and its two calendar-derived forms, false for everything still in discussion
-- (bidding, tbc, likely, service, cancelled). The default is false so that any status added
-- later — including ones an admin creates — has to be opted into publishing deliberately.
ALTER TABLE "booking_statuses" ADD COLUMN "publishable" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "booking_statuses" SET "publishable" = true WHERE "key" IN ('confirmed', 'weekend', 'bankholiday');
