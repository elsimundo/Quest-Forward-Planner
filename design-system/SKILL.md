---
name: quest-medical-design
description: Use this skill to generate well-branded interfaces and assets for Quest Medical (a UK healthcare infrastructure & diagnostic-unit asset-management group), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, logos, division assets, and UI-kit components for prototyping.
user-invocable: true
---

# Quest Medical — Design Skill

Read **readme.md** in this skill first — it is the full design guide (brand
context, the division house-of-brands, content voice, visual foundations,
iconography, and a file manifest). Then explore the other files.

## How to use
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy the assets you
  need out of `assets/` and write static HTML, linking `styles.css` for the
  tokens. Mount the React components from the compiled bundle
  (`_ds_bundle.js`, namespace `window.QuestMedicalDesignSystem_1bd691`) or just
  reproduce their look with the documented tokens.
- **Production code**: read the token CSS in `tokens/` and the component
  `.prompt.md` files to become an expert in the brand, then build with the real
  custom properties and component contracts.

## The 30-second brand
- **Two blues**: Quest Navy `#214b7f` (panels, footer, hero overlays) + brighter
  Quest Blue `#2b7bb9` (links, stats, outlines). Warm-gray ink (`#333` / `#757575`).
- **Type**: Roboto only. Bold (700) dark headings; **light (300)** 18px body.
- **Buttons are pill-shaped and always OUTLINE** — blue outline on light, white
  outline on dark; they fill in on hover. No solid-fill buttons.
- **Cards**: 2px navy/40 border, 12–20px radius, soft shadow that lifts on hover.
- **Icons**: Lucide (UI) + supplied PNG division glyphs. No emoji.
- **Divisions** each have a signature accent color (`--division-*`): Hub crimson,
  Logistics amber, Projects violet, Meditech orange, Digital teal, Power green,
  Engineering steel.
- **Voice**: British English, Title Case headings, calm/service-led, no hype.

## If invoked without guidance
Ask what they want to build or design, ask a few scoping questions (surface,
fidelity, which division, format, variations), then act as an expert Quest
designer — outputting HTML artifacts or production code as the need dictates.
There is a worked example to learn from in `ui_kits/digital/` (a division
landing page composed entirely from the system).
