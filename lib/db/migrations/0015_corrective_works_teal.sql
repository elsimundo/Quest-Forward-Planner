-- Recolours "Corrective works / service" off the app's own blue accent, onto teal.
--
-- That status's bar/bg were #2b7bb9/#c4daeb — the exact same hue as the "not yet in TMS" sync
-- wash (docs/DECISIONS.md #31/#32, itself the app's blue accent #2b7bb9 mixed into a status's
-- own bg). #38/#39's background-saturation work made status fills the primary visual signal,
-- which made this pre-existing collision actually visible: a washed Confirmed cell and a plain
-- Corrective Works cell read as the same colour family. Reported directly by the user.
--
-- New values, one derivation matching #38 (a bar colour mixed 28% over white for bg): bar
-- #1a9e8f, bg #bfe4e0, text #0d5b50 (5.85:1 against the new bg — AA, close to AAA), border
-- #cdeae6. Teal rather than a paler blue: a paler version of #2b7bb9 stays in the same hue
-- family as the wash and would keep partially colliding, including when a Corrective Works
-- booking is itself unpublished and gets washed toward blue. Teal has zero collision risk under
-- any circumstance and isn't used by any other status.
--
-- Guarded on the current value being the pre-recolour value, same reasoning as 0014:
-- color_bg/bar/text/border are admin-editable at runtime, so a status already recoloured by
-- hand keeps its colour rather than being silently reset.
UPDATE "booking_statuses"
SET "color_bg" = '#bfe4e0', "color_bar" = '#1a9e8f', "color_text" = '#0d5b50', "color_border" = '#cdeae6'
WHERE "key" = 'service'
  AND "color_bg" = '#c4daeb' AND "color_bar" = '#2b7bb9' AND "color_text" = '#1f5a87' AND "color_border" = '#cfe6f5';
