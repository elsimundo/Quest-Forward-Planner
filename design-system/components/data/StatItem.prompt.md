A white stat card with a big navy counter (font-black). Numeric values count up once when scrolled into view; non-numeric values (like "24/7") render verbatim. The card has a 2px navy/40 border that darkens and lifts a shadow on hover.

```jsx
<StatItem value="10500" label="Logistical moves in the last year" />
<StatItem value="99" suffix="%" label="Uptime across engineering contracts" />
<StatItem value="24/7" label="Coverage, year-round" />
```

Lay out four across, separated from the heading by a top hairline (`border-top: 1px solid var(--quest-border)`).
