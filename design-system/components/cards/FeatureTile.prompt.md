Outlined, tappable cards for the Quest brand.

```jsx
<DivisionCard name="Quest Hub" slug="hub" variant="light" />
<NewsCard title="Quest Achieves ISO 13485 Certification" date="January 12, 2026"
  excerpt="Quest is proud to announce…" image="/assets/images/news-iso.jpg" href="#" />
<FeatureTile icon="shield-check" title="ISO-certified QMS"
  description="Planned preventive maintenance and breakdown response across the NHS." />
```

- **DivisionCard** — 20px radius, blue outline (`light`) or white outline on navy/photo (`dark`); hover tints the fill. Use in 4-up grids.
- **NewsCard** — 16:9 cover image zooms on hover; date / title / 3-line excerpt / full-width "Read more". Use in 3-up grids.
- **FeatureTile** — square corners, hairline border, no shadow; the "What We Deliver" grid item. `icon` is a Lucide name.
