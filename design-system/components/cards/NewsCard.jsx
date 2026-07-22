import React from "react";

/**
 * Quest NewsCard — outlined article card with a 16:9 image that zooms on hover,
 * date, title, excerpt and a full-width "Read more" button.
 */
export function NewsCard({ title, date, excerpt, image, href = "#", className = "", style = {} }) {
  const [hover, setHover] = React.useState(false);
  const [btnHover, setBtnHover] = React.useState(false);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid var(--quest-blue)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        background: "#fff",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <a
        href={href}
        style={{ display: "block", aspectRatio: "16 / 9", overflow: "hidden", flexShrink: 0 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <img
          src={image}
          alt={title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: hover ? "scale(1.05)" : "scale(1)",
            transition: "transform var(--dur-image) var(--ease)",
          }}
        />
      </a>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, gap: "12px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--quest-body)" }}>{date}</p>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, lineHeight: 1.35, color: "var(--quest-heading)", flex: 1 }}>
          <a href={href} style={{ color: "inherit", textDecoration: "none" }}>{title}</a>
        </h3>
        <p style={{
          margin: 0, fontSize: "14px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {excerpt}
        </p>
        <a
          href={href}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            marginTop: "8px",
            display: "block",
            textAlign: "center",
            background: btnHover ? "var(--quest-blue)" : "transparent",
            color: btnHover ? "#fff" : "var(--quest-blue)",
            border: "1px solid var(--quest-blue)",
            padding: "12px 20px",
            fontSize: "14px",
            borderRadius: "var(--radius-control)",
            textDecoration: "none",
            transition: "background-color var(--dur) var(--ease), color var(--dur) var(--ease)",
          }}
        >
          Read more
        </a>
      </div>
    </div>
  );
}
