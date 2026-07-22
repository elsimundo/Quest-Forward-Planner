import React from "react";

/**
 * Quest FeatureTile — square-cornered "What We Deliver" tile: hairline border,
 * white fill, no shadow. Optional Lucide icon name; `iconColor` defaults to
 * Quest Blue (pass a division accent to theme it).
 */
export function FeatureTile({ title, description, icon, iconColor = "var(--quest-blue)", className = "", style = {} }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (icon && typeof window !== "undefined" && window.lucide) {
      window.lucide.createIcons();
    }
  }, [icon]);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        background: "#fff",
        border: "1px solid var(--quest-border)",
        padding: "24px",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {icon && (
        <i
          data-lucide={icon}
          style={{ color: iconColor, width: "28px", height: "28px", display: "block", marginBottom: "14px" }}
        ></i>
      )}
      <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "var(--quest-heading)" }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: "14px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)" }}>
        {description}
      </p>
    </div>
  );
}
