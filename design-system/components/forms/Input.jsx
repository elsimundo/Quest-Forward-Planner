import React from "react";

/**
 * Quest Input — text field. Pill-shaped (rounded-full), hairline border, blue focus.
 * Set `onDark` for navy panels (translucent-white skin, used in the contact form).
 */
export function Input({ onDark = false, className = "", style = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const base = {
    width: "100%",
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    padding: "22px 28px",
    borderRadius: "var(--radius-control)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color var(--dur) var(--ease)",
  };
  const light = {
    background: "#fcfcfc",
    color: "var(--quest-heading)",
    border: `1px solid ${focus ? "var(--quest-blue)" : "var(--quest-border)"}`,
  };
  const dark = {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: `1px solid ${focus ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}`,
  };
  return (
    <input
      className={className}
      style={{ ...base, ...(onDark ? dark : light), ...style }}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      {...rest}
    />
  );
}
