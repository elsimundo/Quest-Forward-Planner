Quest form controls — square 4px corners, hairline borders, blue focus. Each has an `onDark` skin (translucent white) for the navy contact panel.

```jsx
<Field label="Email Address" required htmlFor="email">
  <Input id="email" type="email" name="email" placeholder="Email Address" />
</Field>

<Field label="Message" onDark htmlFor="msg">
  <Textarea id="msg" name="message" rows={4} onDark placeholder="Your message…" />
</Field>
```

`Field` renders the label + optional red asterisk; `Input` / `Textarea` spread native props. Set `onDark` on all three together when placing the form on a navy background.
