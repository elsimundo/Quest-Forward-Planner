Quest's primary call-to-action button — pill-shaped, **outline by default**. It renders as a link when `href` is set, otherwise a `<button>`.

```jsx
{/* On a light background — blue outline, fills blue on hover */}
<Button href="/#contact" variant="primary">Get in touch</Button>

{/* On a navy / photo background — white outline, fills white on hover */}
<Button variant="outline-white">Talk to our team</Button>
```

Variants:
- **`primary`** (default) — blue border, transparent fill, blue text → hover fills Quest Blue with white text. The standard button on light surfaces. (`outline` is an alias.)
- **`outline-white`** — white border, transparent, white text → hover fills white with blue text. The standard button on dark/navy/photo surfaces.
- **`ghost`** — text-only (tertiary).

Quest buttons are **always outline** — there is no solid-fill variant. Sizes `sm` / `md` / `lg`. Hover is color-only (no scale); `disabled` dims to 50%. Labels are Title Case verb phrases.
