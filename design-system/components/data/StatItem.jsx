import React from "react";

/**
 * Quest StatItem — white stat card with a large navy counter that animates up
 * when scrolled into view (numeric values only). rounded-xl, 2px navy/40 border,
 * soft shadow that lifts on hover.
 */
export function StatItem({ value, suffix = "", label, className = "", style = {} }) {
  const numericTarget = Number(String(value).replace(/,/g, ""));
  const isNumeric = !isNaN(numericTarget) && String(value).trim() !== "";
  const [displayed, setDisplayed] = React.useState(isNumeric ? "0" : value);
  const [hover, setHover] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    let done = false;
    const fmt = new Intl.NumberFormat("en-GB");
    const run = () => {
      if (done) return;
      done = true;
      if (!isNumeric) return;
      const duration = 1500, steps = 60, inc = numericTarget / steps;
      let cur = 0;
      const t = setInterval(() => {
        cur += inc;
        if (cur >= numericTarget) { setDisplayed(fmt.format(numericTarget)); clearInterval(t); }
        else setDisplayed(fmt.format(Math.floor(cur)));
      }, duration / steps);
    };
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [isNumeric, numericTarget]);

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        background: "#fff",
        borderRadius: "var(--radius-stat)",
        border: `2px solid ${hover ? "var(--quest-navy)" : "rgba(33,75,127,0.4)"}`,
        padding: "28px 24px 24px",
        boxShadow: hover ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all var(--dur) var(--ease)",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ fontSize: "60px", fontWeight: 900, color: "var(--quest-navy)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {displayed}<span style={{ fontSize: "0.72em" }}>{suffix}</span>
      </div>
      <p style={{ margin: 0, fontSize: "15px", fontWeight: 300, color: "var(--quest-body)", lineHeight: 1.35 }}>
        {label}
      </p>
    </div>
  );
}
