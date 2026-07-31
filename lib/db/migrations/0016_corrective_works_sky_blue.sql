-- Supersedes 0015 same-session: the user saw teal live and preferred staying in the blue
-- family after all — hue-shifted enough off the app's own accent (#2b7bb9) to stop reading as
-- the same colour as the "not yet in TMS" sync wash, rather than shifted to a different hue
-- entirely. See docs/DECISIONS.md #41 (updated in place, not re-numbered — it's one decision
-- that got refined before anyone but this session saw it, not two).
--
-- New values, same #38 derivation (bar mixed 28%/16% over white for bg/border): bar #2f9fd6,
-- bg #c5e4f4, text #0a5273 (6.39:1 against the new bg — AAA), border #def0f8. RGB distance from
-- the wash accent #2b7bb9 is ~46 (vs 0 before) — enough that a plain Corrective Works cell and
-- a washed Confirmed cell are no longer the same colour family, while an unpublished Corrective
-- Works booking washing toward #2b7bb9 still lands recognisably close to its own resting colour
-- rather than jumping hue entirely, which was the whole tradeoff flagged when teal was offered
-- as the alternative.
--
-- Guarded on 0015's teal values, not the original blue — this is a second step, not a redo of
-- the first. A fresh database applies 0014 -> 0015 (blue -> teal) -> 0016 (teal -> sky blue) in
-- order and ends up here regardless. An admin who recoloured Corrective Works by hand in the
-- brief window teal was live keeps their own colour, same guarding principle as 0014/0015.
UPDATE "booking_statuses"
SET "color_bg" = '#c5e4f4', "color_bar" = '#2f9fd6', "color_text" = '#0a5273', "color_border" = '#def0f8'
WHERE "key" = 'service'
  AND "color_bg" = '#bfe4e0' AND "color_bar" = '#1a9e8f' AND "color_text" = '#0d5b50' AND "color_border" = '#cdeae6';
