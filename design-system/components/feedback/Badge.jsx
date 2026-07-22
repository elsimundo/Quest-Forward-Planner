import React from "react";

/**
 * Quest Badge — small label for categories, statuses and certifications.
 * Tones map to the brand palette; sizes sm/md.
 */
export function Badge({ children, tone = "blue", size = "md", className = "", style = {} }) {
  const tones = {
    blue: { background: "var(--quest-blue-tint)", color: "var(--quest-blue-dark)", border: "1px solid var(--quest-blue)" },
    navy: { background: "var(--quest-navy)", color: "#fff", border: "1px solid var(--quest-navy)" },
    accent: { background: "rgba(177,58,58,0.1)", color: "var(--quest-accent)", border: "1px solid var(--quest-accent)" },
    neutral: { background: "var(--quest-surface-alt)", color: "var(--quest-body)", border: "1px solid var(--quest-border)" },
    "on-dark": { background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" },
  };
  const sizes = {
    sm: { fontSize: "11px", padding: "3px 8px" },
    md: { fontSize: "12px", padding: "5px 12px" },
  };
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        lineHeight: 1.2,
        borderRadius: "var(--radius-xs)",
        letterSpacing: "0.02em",
        ...sizes[size],
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
