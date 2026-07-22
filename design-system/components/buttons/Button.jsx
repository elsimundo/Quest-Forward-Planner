import React from "react";

/**
 * Quest Medical Button.
 * Pill-shaped (rounded-full), 16px / 400 label, 200ms color transitions.
 * Default treatment is an OUTLINE: blue on light backgrounds (`primary`),
 * white on dark backgrounds (`outline-white`); both fill in on hover.
 * Renders as <a> when `href` is set, otherwise <button>.
 */
export function Button({
  href,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  target,
  className = "",
  style = {},
  children,
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "var(--font-sans)",
    fontWeight: "var(--fw-regular)",
    fontSize: "16px",
    lineHeight: "18px",
    borderRadius: "var(--radius-control)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease)",
    textDecoration: "none",
    border: "1px solid transparent",
    opacity: disabled ? 0.5 : 1,
    boxSizing: "border-box",
    whiteSpace: "nowrap",
  };

  const sizes = {
    sm: { padding: "12px 20px", fontSize: "14px", lineHeight: "16px" },
    md: { padding: "18px 24px", fontSize: "16px", lineHeight: "18px" },
    lg: { padding: "21px 32px", fontSize: "20px", lineHeight: "22px" },
  };

  const variants = {
    // Default Quest button on a LIGHT background: blue outline, no fill, blue text.
    primary: {
      background: "transparent",
      color: "var(--quest-blue)",
      borderColor: "var(--quest-blue)",
    },
    // alias of primary — kept for readability at call sites
    outline: {
      background: "transparent",
      color: "var(--quest-blue)",
      borderColor: "var(--quest-blue)",
    },
    // Default Quest button on a DARK / navy / photo background: white outline,
    // no fill, white text.
    "outline-white": {
      background: "transparent",
      color: "#fff",
      borderColor: "#fff",
    },
    ghost: {
      background: "transparent",
      color: "var(--quest-blue)",
      borderColor: "transparent",
    },
  };

  const hovers = {
    // Light bg: fill blue, text white.
    primary: { background: "var(--quest-blue)", color: "#fff", borderColor: "var(--quest-blue)" },
    outline: { background: "var(--quest-blue)", color: "#fff", borderColor: "var(--quest-blue)" },
    // Dark bg: fill white, text blue.
    "outline-white": { background: "#fff", color: "var(--quest-blue)", borderColor: "#fff" },
    ghost: { background: "transparent", color: "var(--quest-blue-dark)", borderColor: "transparent" },
  };

  const [hover, setHover] = React.useState(false);
  const styles = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...(hover && !disabled ? hovers[variant] : {}),
    ...style,
  };

  const interaction = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  };

  if (href) {
    return (
      <a href={href} target={target} className={className} style={styles} {...interaction}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className} style={styles} {...interaction}>
      {children}
    </button>
  );
}
