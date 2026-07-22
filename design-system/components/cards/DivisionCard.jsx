import React from "react";

/**
 * Quest DivisionCard — outlined card linking to a division.
 * 16px radius (rounded-2xl), 2px navy/40 border, color + shadow hover.
 * `dark` sits on navy/photo panels; `light` on white.
 */
export function DivisionCard({ name, slug = "#", variant = "dark", className = "", style = {} }) {
  const isDark = variant === "dark";
  const [hover, setHover] = React.useState(false);

  const styles = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "180px",
    padding: "24px",
    borderRadius: "var(--radius-division)",
    border: `2px solid ${hover ? "var(--quest-navy)" : "rgba(33,75,127,0.4)"}`,
    background: isDark
      ? (hover ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)")
      : (hover ? "var(--quest-blue-tint)" : "#fff"),
    boxShadow: hover
      ? (isDark ? "0 12px 28px rgba(0,0,0,0.2)" : "var(--shadow-card-hover)")
      : (isDark ? "none" : "var(--shadow-card)"),
    transition: "background-color var(--dur-slow) var(--ease), border-color var(--dur-slow) var(--ease), box-shadow var(--dur-slow) var(--ease)",
    textDecoration: "none",
    fontFamily: "var(--font-sans)",
    boxSizing: "border-box",
    ...style,
  };

  const ink = isDark ? "#fff" : "var(--quest-navy)";
  const linkColor = isDark ? (hover ? "#fff" : "rgba(255,255,255,0.7)") : "var(--quest-navy)";

  return (
    <a
      href={typeof slug === "string" && slug.startsWith("#") ? slug : `/${slug}`}
      className={className}
      style={styles}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 700, lineHeight: 1.35, color: ink }}>
        {name}
      </h3>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: linkColor, transition: "color var(--dur) var(--ease)" }}>
        <span>Learn more</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hover ? "translateX(4px)" : "none", transition: "transform var(--dur) var(--ease)" }} aria-hidden="true">
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
      </div>
    </a>
  );
}
