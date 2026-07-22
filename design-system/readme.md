# Quest Medical — Design System

> Your Strategic Partner for Healthcare solutions.

Quest Medical provides specialist infrastructure solutions and asset management
throughout the lifecycle of **mobile, modular and static diagnostic units**. The
business supplies expert technical, logistical, operational and future-projects
capability to the UK healthcare sector — from NHS Trusts to private hospital
groups (Ramsay, Circle, Spire, Healthshare, medneo).

This design system captures Quest's brand foundations, reusable UI primitives,
and a high-fidelity recreation of the corporate marketing website, so any agent
can produce on-brand interfaces, decks and assets.

---

## The Quest house of brands

Quest is a **group** with a master "QUEST" wordmark and a family of division
sub-brands. Each division pairs the QUEST wordmark with its name set in the
crimson accent and a small line-style glyph (e.g. the Hub heartbeat pulse).

| Division | Promise |
|---|---|
| **Quest Hub** | 24/7 command centre for calls, compliance, and assets |
| **Quest Logistics** | Managing the movement of people, vehicles and units |
| **Quest Engineering** | Servicing, refurbishments, and bespoke engineering solutions |
| **Quest Projects** | Delivering complex healthcare infrastructure programmes |
| **Quest Digital** | Software, data, and creative solutions |
| **Quest Meditech** | Equipment servicing and procurement |
| **Quest Power** | Reliable energy and infrastructure |

(Two further lockups — **Quest Environments** and **Quest Workforce** — ship in
`assets/logos/divisions/` for future use.)

---

## Sources

This system was reverse-engineered from materials supplied by the client. Paths
are recorded so a future reader with the same access can re-derive everything.

- **Primary source of truth — Next.js codebase** (read-only local mount):
  `questmedical.biz/questmedical-next/` — Next 16 + React 19 + Tailwind v4.
  - `src/app/globals.css` — the live color & type rules (mirrored into `tokens/`).
  - `src/components/` — Button, DivisionCard, NewsCard, StatItem, Header, Footer,
    ContactFormPanel, PageHero, DivisionGrid, StatsBar, ServicePage.
  - `src/lib/data/` — divisions and news content (real copy).
  - Icons via **`lucide-react` ^1.17** (see ICONOGRAPHY).
- **Legacy WordPress export**: `questmedical.biz/wp site/` — original HTML, used
  only for cross-reference.
- **Brand artwork** (supplied uploads, copied into `assets/logos/`): master
  wordmark + 9 division lockups, in navy and white-knockout variants.
- **Live site**: https://questmedical.biz · Client portal: https://admin.questmedical.biz

> No font binaries were present in the codebase — Roboto is loaded from Google
> Fonts (the same source `next/font/google` uses). See CAVEATS.

---

## CONTENT FUNDAMENTALS

**Voice — confident, calm, service-led.** Quest positions itself as the reliable
partner standing behind clinical teams. Copy is reassuring and operational, never
salesy or hyped. The recurring promise: *"Let Quest handle the complexity, so you
can focus on patient care."*

- **Person.** Talks about *"we" / "our"* (Quest) and addresses the customer as
  *"you / your"*. Headlines are often impersonal noun phrases ("Growth Through
  Partnership", "At-a-Glance Impact").
- **Spelling & locale.** **British English**, `en-GB`. *organisation, modernise,
  programmes, centre, specialise.* Phone/address in UK format. Numbers formatted
  `en-GB` (10,500).
- **Casing.** **Title Case for headings** ("Building the Future with Quest",
  "Divisions That Keep Healthcare Moving"). Sentence case for body and form
  labels. Footer column headers are **UPPERCASE with wide tracking** ("QUICK
  LINKS", "HOW WE SUPPORT").
- **Sentence style.** Medium-length, declarative, benefit-then-detail. Frequent
  triads: *"technical, logistical, operational."* Light em-dash and comma use to
  layer detail. No exclamation marks except the contact thank-you.
- **Division naming.** Always **"Quest " + Division** ("Quest Meditech", never
  just "Meditech"). Certifications spelled in full with the number ("ISO 13485
  certification").
- **CTAs** are short verb phrases, Title Case: *"Get in touch", "Explore our
  services", "Talk to our team", "See how we help you grow", "Read more",
  "Client login".*
- **No emoji. No slang. No jargon-for-its-own-sake.** Acronyms (NHS, MRI, QMS,
  PPM) are used naturally for an informed B2B healthcare audience.

*Representative copy:*
> "When healthcare depends on uptime, every second counts. Quest's core
> departments work in unison so that when seconds matter, providers can focus
> entirely on patients while we handle the rest."

---

## VISUAL FOUNDATIONS

**Overall vibe.** Corporate-clean, trustworthy, infrastructure-grade. Lots of
white space, deep navy anchors, real photography of mobile diagnostic units and
clinical environments. Calm and uncluttered — the opposite of flashy.

- **Color.** Two blues do the heavy lifting: deep **Quest Navy `#214b7f`** (the
  brand blue, used for full-bleed panels, footer, hero overlays) and a brighter
  **Quest Blue `#2b7bb9`** (links, primary buttons, the big stat numbers, card
  outlines). Hover deepens to `#1f5a87`; deepest panels use `#1a3d69`. A single
  **crimson `#b13a3a`** appears only inside division lockups. Neutrals are warm-
  gray: heading `#333`, body `#757575`, hairline `#e6e6e6`, on a white ground.
- **Type.** **Roboto** only. Headings are **bold (700)**, dark, tight (`1.2`),
  no letter-spacing — h1 60px, h2 48px, h3 24px. Body is **light (300)**, 18px,
  line-height 1.6, in warm gray — the light weight is a signature. Stat counters
  are huge (78px) and rendered in Quest Blue. The QUEST *logo* is a separate
  serif lockup (artwork only — never set live type in serif).
- **Backgrounds.** Three modes: (1) **white** sections carrying a faint
  **compass-rose watermark** (`assets/decorative/Group-2.png`) pinned top-right
  with `background-attachment: fixed`; (2) **navy gradient over photo** —
  `linear-gradient(0deg, rgba(32,76,126,.88), #214b7f)` laid over a clinical
  photo (`center top / cover`); (3) **solid navy** panels (contact, footer).
  Hero uses a muted YouTube background video under a `rgba(32,74,126,0.9)` navy
  scrim. No purple gradients, no mesh blobs, no noise.
- **Photography.** Cool-leaning, naturalistic, full-color (never B&W or heavily
  filtered): mobile CT trailers, scanners, engineers, hospital exteriors. Always
  shown full-bleed behind the navy overlay or inside 16:9 card crops.
- **Cards.** Several families, all with a **2px navy-at-40% border** that darkens
  to solid navy on hover. **DivisionCard** — 16px radius (`rounded-2xl`),
  transparent `white/5` fill on navy (or white on light), hover tints + lifts a
  shadow; 22px bold title + "Learn more" with a sliding arrow. **NewsCard** — 20px
  radius, blue outline, 16:9 image. **StatItem** — white card, 12px radius, soft
  shadow that lifts `-2px` on hover. **FeatureTile** — square corners, hairline
  `#e6e6e6` border, white, no shadow. Heavy drop shadows are otherwise absent.
- **Corner radii.** Controls are **fully pill** (`rounded-full`) — every button
  and the contact-form inputs. Content cards step **12px** (stats) → **16px**
  (divisions) → **20px** (news). Logo/photo tiles use 8px; a 4px radius only
  survives on small mobile chips.
- **Borders.** Hairline `#e6e6e6` dividers; blue `#2b7bb9` outlines on cards;
  `rgba(255,255,255,.2)` on dark. The stats row sits under a top hairline.
- **Buttons.** **Pill-shaped** (`rounded-full`), 16px/400 label, **outline by
  default**. On light surfaces: Quest-Blue border, transparent fill, blue text →
  hover fills `#2b7bb9` with white text. On dark/navy/photo surfaces: white
  border, transparent, white text → hover fills white with blue text. Solid
  fills (Quest Blue / navy) exist but are reserved for a single dominant action.
  Generous padding (`px-6 py-[18px]`); large size is 20px text with `px-8 py-[21px]`.
- **Motion.** Understated. **200ms color transitions** are the default; news-card
  images zoom `scale(1.05)` over 500ms on hover; stat counters count up once on
  scroll into view (1.5s); header fades white past 60px scroll. Easing is the
  standard ease / `cubic-bezier(.4,0,.2,1)`. **No bounces, no springs, no
  infinite loops.** `scroll-behavior: smooth`.
- **Hover / press.** Hover = darker color (buttons), light tint (cards), or fill-
  inversion (outline buttons). Links shift `#2b7bb9 → #1f5a87`. No scale/shrink
  press states; this is a restrained corporate UI.
- **Transparency & blur.** Used only for photo overlays (navy at 88–90%) and
  for on-dark form fields (`white/10` fill, `white/20` border). No glassmorphism
  / backdrop-blur.
- **Layout.** Centered **1100px** content column (header/footer go to 1300px),
  24–40px gutters, 96px (`py-24`) section rhythm. Full-bleed sections frequently
  run `min-h-screen` with vertically-centered content. Fixed top header.

---

## ICONOGRAPHY

- **UI icon set: [Lucide](https://lucide.dev) (`lucide-react` ^1.17).** This is
  the only icon system in the codebase — clean 24px, ~2px stroke, rounded joins,
  `currentColor`. Seen in use: `Menu`, `X`, `ChevronDown` (nav). Components and
  UI kits in this system load Lucide from CDN
  (`https://unpkg.com/lucide@latest`) to match exactly. Use it for all
  functional icons; keep stroke width default and color from `currentColor`.
- **Division glyphs (PNG art).** Each division has a small **line-style glyph**
  delivered as PNG (`assets/icons/Hub.png`, `Engineering.png`, …), each in its
  own **division accent color** — Hub crimson `#b13a3a`, Engineering steel
  `#5a5a5a`, Logistics amber `#e0a826`, Projects violet `#6a4c93`, Meditech
  orange `#f17f42`, Digital teal `#2ab3c0`, Power green `#3d7f53`. These ship as
  `--division-*` color tokens (see `tokens/colors.css`) — use a division's color
  as the accent on surfaces themed to it. The glyphs are brand artwork, not a
  font — use the PNGs; do not redraw them.
- **Brand wordmarks (PNG).** Master + division lockups in navy and white live in
  `assets/logos/`. The white-knockout variants are for navy backgrounds.
- **Compass-rose watermark.** `assets/decorative/Group-2.png` — a faint gray
  compass used as a fixed top-right watermark on white sections (decoration only).
- **Certification badges.** ISO 9001 / 13485 / 14001 / 27001 JPEG marks in
  `assets/iso/` — shown small on white tiles in the footer.
- **Brand mark.** `assets/favicon.png`.
- **No emoji, no Unicode-glyph icons, no decorative SVG illustration** anywhere
  in the brand. Icons are either Lucide (UI) or supplied PNG art (brand).

---

## Index / manifest

**Root**
- `styles.css` — global entry point (consumers link this); `@import`s all tokens.
- `readme.md` — this file (full design guide + manifest).
- `SKILL.md` — portable Agent-Skill manifest (for use in Claude Code).

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`,
`elevation.css`.

**`assets/`** — `logos/` (master + `divisions/`, navy & white), `icons/`
(division glyphs), `images/` (photography), `partners/`, `iso/`,
`decorative/` (compass watermark), `favicon.png`.

**`guidelines/`** — foundation specimen cards (Design System tab): colors, type,
spacing, brand, iconography.

**`components/`** — reusable React primitives (see below). Mount from
`window.QuestMedicalDesignSystem_1bd691`.

**`ui_kits/digital/`** — Quest Digital division landing page (`index.html` +
`sections.jsx`), composing the design-system components from the bundle.

### Components
- `components/buttons/` — `Button`
- `components/cards/` — `DivisionCard`, `NewsCard`, `FeatureTile`
- `components/data/` — `StatItem`
- `components/feedback/` — `Badge`
- `components/forms/` — `Input`, `Textarea`, `Field`

### UI kits
- `ui_kits/digital/` — **Quest Digital** division landing page (hero, intro,
  stats, capabilities, sister divisions, contact, footer); teal-accented with
  Tweaks for accent (teal/navy) and hero (photo/solid).
  - `index.html` — the faithful corporate-page version.
  - `studio.html` — the **Studio edition**: a bolder creative-agency cut (dark
    editorial hero, kinetic type, capability marquee, work showcase, scroll-reveal
    motion) positioning Quest Digital as the group's creative & technology studio.

---

## CAVEATS
- **Fonts load from Google Fonts (Roboto).** No binaries shipped in the codebase;
  this matches how the live site sources the font, but if you need fully offline
  / self-hosted webfonts, supply the Roboto `.woff2` files and I'll add real
  `@font-face` rules.
- The QUEST logo's serif wordmark is **PNG/vector artwork only** — there is no
  matching serif webfont, and none is needed (it is never set in live copy).
