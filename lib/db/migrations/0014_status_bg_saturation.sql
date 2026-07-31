-- Strengthens booking_statuses.color_bg so the chip's FILL is the status indicator
-- (docs/DECISIONS.md #38). The chip's site-name label is now a fixed neutral #333333, so the
-- fill is the only status signal left on a grid cell — and at the old ~7% tints it couldn't
-- carry that job: `cancelled`'s #f9ebf6 and `confirmed`'s plain #ffffff are the same colour to
-- anyone scanning a wall of cells for "what is this unit doing".
--
-- Each new value is that status's own `color_bar` mixed 28% over white — one derivation, not
-- eight hand-picked tints. See the note above SEED_STATUSES in lib/statuses.ts for why 28% is
-- a ceiling (the #333333 label needs the fill light enough to stay AAA, and the 14% blue sync
-- wash of #31/#32 needs room to still read as a shift). Keep the two in step if it's retuned.
--
-- `confirmed` is deliberately NOT touched and stays pure white: it's most of the grid, and the
-- blue sync wash needs a white base to read against.
--
-- Each UPDATE is guarded on the current value being the original seed colour, because
-- color_bg is admin-editable at runtime (/admin/booking-statuses). A status somebody has
-- already recoloured by hand keeps their colour rather than being silently reset to ours.
UPDATE "booking_statuses" SET "color_bg" = '#c9dbcf' WHERE "key" = 'likely'      AND "color_bg" = '#e9f4ec';
--> statement-breakpoint
UPDATE "booking_statuses" SET "color_bg" = '#fbdbca' WHERE "key" = 'tbc'         AND "color_bg" = '#fdf1e7';
--> statement-breakpoint
UPDATE "booking_statuses" SET "color_bg" = '#e9c8c8' WHERE "key" = 'bidding'     AND "color_bg" = '#f9ebeb';
--> statement-breakpoint
UPDATE "booking_statuses" SET "color_bg" = '#c4daeb' WHERE "key" = 'service'     AND "color_bg" = '#e8f4fb';
--> statement-breakpoint
UPDATE "booking_statuses" SET "color_bg" = '#eecfe8' WHERE "key" = 'cancelled'   AND "color_bg" = '#f9ebf6';
--> statement-breakpoint
UPDATE "booking_statuses" SET "color_bg" = '#dfe1e5' WHERE "key" = 'weekend'     AND "color_bg" = '#eef0f4';
--> statement-breakpoint
UPDATE "booking_statuses" SET "color_bg" = '#f6e7c2' WHERE "key" = 'bankholiday' AND "color_bg" = '#fbf4e2';
