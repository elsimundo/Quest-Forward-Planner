/* @ds-bundle: {"format":3,"namespace":"QuestMedicalDesignSystem_1bd691","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"DivisionCard","sourcePath":"components/cards/DivisionCard.jsx"},{"name":"FeatureTile","sourcePath":"components/cards/FeatureTile.jsx"},{"name":"NewsCard","sourcePath":"components/cards/NewsCard.jsx"},{"name":"StatItem","sourcePath":"components/data/StatItem.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"07b669b11ed1","components/cards/DivisionCard.jsx":"1ba64b8e7d75","components/cards/FeatureTile.jsx":"7241758c5e67","components/cards/NewsCard.jsx":"141d2bcd2fb4","components/data/StatItem.jsx":"e9b2cb55c499","components/feedback/Badge.jsx":"43451ac9e214","components/forms/Field.jsx":"7e5b1a976ebf","components/forms/Input.jsx":"40b5625d13c3","components/forms/Textarea.jsx":"420bf93ac31b","ui_kits/digital/about-sections.jsx":"2f80f67cc78b","ui_kits/digital/contact-sections.jsx":"c127f7ffc636","ui_kits/digital/home-base.jsx":"efacf4a5e86a","ui_kits/digital/home-sections.jsx":"5c78d0529eac","ui_kits/digital/pillar-sections.jsx":"1de9f6a4227a","ui_kits/digital/services-sections.jsx":"416daf7df334","ui_kits/digital/tweaks-panel.jsx":"6591467622ed","ui_kits/digital/work-sections.jsx":"d1bfe35d2087"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.QuestMedicalDesignSystem_1bd691 = window.QuestMedicalDesignSystem_1bd691 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Quest Medical Button.
 * Pill-shaped (rounded-full), 16px / 400 label, 200ms color transitions.
 * Default treatment is an OUTLINE: blue on light backgrounds (`primary`),
 * white on dark backgrounds (`outline-white`); both fill in on hover.
 * Renders as <a> when `href` is set, otherwise <button>.
 */
function Button({
  href,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  target,
  className = "",
  style = {},
  children
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
    whiteSpace: "nowrap"
  };
  const sizes = {
    sm: {
      padding: "12px 20px",
      fontSize: "14px",
      lineHeight: "16px"
    },
    md: {
      padding: "18px 24px",
      fontSize: "16px",
      lineHeight: "18px"
    },
    lg: {
      padding: "21px 32px",
      fontSize: "20px",
      lineHeight: "22px"
    }
  };
  const variants = {
    // Default Quest button on a LIGHT background: blue outline, no fill, blue text.
    primary: {
      background: "transparent",
      color: "var(--quest-blue)",
      borderColor: "var(--quest-blue)"
    },
    // alias of primary — kept for readability at call sites
    outline: {
      background: "transparent",
      color: "var(--quest-blue)",
      borderColor: "var(--quest-blue)"
    },
    // Default Quest button on a DARK / navy / photo background: white outline,
    // no fill, white text.
    "outline-white": {
      background: "transparent",
      color: "#fff",
      borderColor: "#fff"
    },
    ghost: {
      background: "transparent",
      color: "var(--quest-blue)",
      borderColor: "transparent"
    }
  };
  const hovers = {
    // Light bg: fill blue, text white.
    primary: {
      background: "var(--quest-blue)",
      color: "#fff",
      borderColor: "var(--quest-blue)"
    },
    outline: {
      background: "var(--quest-blue)",
      color: "#fff",
      borderColor: "var(--quest-blue)"
    },
    // Dark bg: fill white, text blue.
    "outline-white": {
      background: "#fff",
      color: "var(--quest-blue)",
      borderColor: "#fff"
    },
    ghost: {
      background: "transparent",
      color: "var(--quest-blue-dark)",
      borderColor: "transparent"
    }
  };
  const [hover, setHover] = React.useState(false);
  const styles = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...(hover && !disabled ? hovers[variant] : {}),
    ...style
  };
  const interaction = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  };
  if (href) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      target: target,
      className: className,
      style: styles
    }, interaction), children);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    onClick: onClick,
    disabled: disabled,
    className: className,
    style: styles
  }, interaction), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/cards/DivisionCard.jsx
try { (() => {
/**
 * Quest DivisionCard — outlined card linking to a division.
 * 16px radius (rounded-2xl), 2px navy/40 border, color + shadow hover.
 * `dark` sits on navy/photo panels; `light` on white.
 */
function DivisionCard({
  name,
  slug = "#",
  variant = "dark",
  className = "",
  style = {}
}) {
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
    background: isDark ? hover ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)" : hover ? "var(--quest-blue-tint)" : "#fff",
    boxShadow: hover ? isDark ? "0 12px 28px rgba(0,0,0,0.2)" : "var(--shadow-card-hover)" : isDark ? "none" : "var(--shadow-card)",
    transition: "background-color var(--dur-slow) var(--ease), border-color var(--dur-slow) var(--ease), box-shadow var(--dur-slow) var(--ease)",
    textDecoration: "none",
    fontFamily: "var(--font-sans)",
    boxSizing: "border-box",
    ...style
  };
  const ink = isDark ? "#fff" : "var(--quest-navy)";
  const linkColor = isDark ? hover ? "#fff" : "rgba(255,255,255,0.7)" : "var(--quest-navy)";
  return /*#__PURE__*/React.createElement("a", {
    href: typeof slug === "string" && slug.startsWith("#") ? slug : `/${slug}`,
    className: className,
    style: styles,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 12px",
      fontSize: "22px",
      fontWeight: 700,
      lineHeight: 1.35,
      color: ink
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "14px",
      color: linkColor,
      transition: "color var(--dur) var(--ease)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Learn more"), /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      transform: hover ? "translateX(4px)" : "none",
      transition: "transform var(--dur) var(--ease)"
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m12 5 7 7-7 7"
  }))));
}
Object.assign(__ds_scope, { DivisionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/DivisionCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/FeatureTile.jsx
try { (() => {
/**
 * Quest FeatureTile — square-cornered "What We Deliver" tile: hairline border,
 * white fill, no shadow. Optional Lucide icon name; `iconColor` defaults to
 * Quest Blue (pass a division accent to theme it).
 */
function FeatureTile({
  title,
  description,
  icon,
  iconColor = "var(--quest-blue)",
  className = "",
  style = {}
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (icon && typeof window !== "undefined" && window.lucide) {
      window.lucide.createIcons();
    }
  }, [icon]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: className,
    style: {
      background: "#fff",
      border: "1px solid var(--quest-border)",
      padding: "24px",
      fontFamily: "var(--font-sans)",
      boxSizing: "border-box",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      color: iconColor,
      width: "28px",
      height: "28px",
      display: "block",
      marginBottom: "14px"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      fontSize: "16px",
      fontWeight: 700,
      color: "var(--quest-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "14px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)"
    }
  }, description));
}
Object.assign(__ds_scope, { FeatureTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/FeatureTile.jsx", error: String((e && e.message) || e) }); }

// components/cards/NewsCard.jsx
try { (() => {
/**
 * Quest NewsCard — outlined article card with a 16:9 image that zooms on hover,
 * date, title, excerpt and a full-width "Read more" button.
 */
function NewsCard({
  title,
  date,
  excerpt,
  image,
  href = "#",
  className = "",
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  const [btnHover, setBtnHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      border: "1px solid var(--quest-blue)",
      borderRadius: "var(--radius-card)",
      overflow: "hidden",
      background: "#fff",
      fontFamily: "var(--font-sans)",
      boxSizing: "border-box",
      ...style
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      display: "block",
      aspectRatio: "16 / 9",
      overflow: "hidden",
      flexShrink: 0
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: title,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: hover ? "scale(1.05)" : "scale(1)",
      transition: "transform var(--dur-image) var(--ease)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      flex: 1,
      gap: "12px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "14px",
      color: "var(--quest-body)"
    }
  }, date), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 700,
      lineHeight: 1.35,
      color: "var(--quest-heading)",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, title)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "14px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)",
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, excerpt), /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => setBtnHover(true),
    onMouseLeave: () => setBtnHover(false),
    style: {
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
      transition: "background-color var(--dur) var(--ease), color var(--dur) var(--ease)"
    }
  }, "Read more")));
}
Object.assign(__ds_scope, { NewsCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/NewsCard.jsx", error: String((e && e.message) || e) }); }

// components/data/StatItem.jsx
try { (() => {
/**
 * Quest StatItem — white stat card with a large navy counter that animates up
 * when scrolled into view (numeric values only). rounded-xl, 2px navy/40 border,
 * soft shadow that lifts on hover.
 */
function StatItem({
  value,
  suffix = "",
  label,
  className = "",
  style = {}
}) {
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
      const duration = 1500,
        steps = 60,
        inc = numericTarget / steps;
      let cur = 0;
      const t = setInterval(() => {
        cur += inc;
        if (cur >= numericTarget) {
          setDisplayed(fmt.format(numericTarget));
          clearInterval(t);
        } else setDisplayed(fmt.format(Math.floor(cur)));
      }, duration / steps);
    };
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) run();
    }, {
      threshold: 0.3
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [isNumeric, numericTarget]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: className,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "60px",
      fontWeight: 900,
      color: "var(--quest-navy)",
      lineHeight: 1,
      fontVariantNumeric: "tabular-nums"
    }
  }, displayed, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "0.72em"
    }
  }, suffix)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "15px",
      fontWeight: 300,
      color: "var(--quest-body)",
      lineHeight: 1.35
    }
  }, label));
}
Object.assign(__ds_scope, { StatItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatItem.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
/**
 * Quest Badge — small label for categories, statuses and certifications.
 * Tones map to the brand palette; sizes sm/md.
 */
function Badge({
  children,
  tone = "blue",
  size = "md",
  className = "",
  style = {}
}) {
  const tones = {
    blue: {
      background: "var(--quest-blue-tint)",
      color: "var(--quest-blue-dark)",
      border: "1px solid var(--quest-blue)"
    },
    navy: {
      background: "var(--quest-navy)",
      color: "#fff",
      border: "1px solid var(--quest-navy)"
    },
    accent: {
      background: "rgba(177,58,58,0.1)",
      color: "var(--quest-accent)",
      border: "1px solid var(--quest-accent)"
    },
    neutral: {
      background: "var(--quest-surface-alt)",
      color: "var(--quest-body)",
      border: "1px solid var(--quest-border)"
    },
    "on-dark": {
      background: "rgba(255,255,255,0.12)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.25)"
    }
  };
  const sizes = {
    sm: {
      fontSize: "11px",
      padding: "3px 8px"
    },
    md: {
      fontSize: "12px",
      padding: "5px 12px"
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
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
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
/**
 * Quest Field — label (with optional required asterisk) wrapping a form control.
 * Pass `onDark` to color the label white for navy panels.
 */
function Field({
  label,
  required = false,
  onDark = false,
  htmlFor,
  children,
  className = "",
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      display: "block",
      fontSize: "14px",
      marginBottom: "6px",
      color: onDark ? "#fff" : "var(--quest-heading)"
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: onDark ? "#fca5a5" : "var(--quest-accent)",
      marginLeft: "4px"
    }
  }, "*")), children);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Quest Input — text field. Pill-shaped (rounded-full), hairline border, blue focus.
 * Set `onDark` for navy panels (translucent-white skin, used in the contact form).
 */
function Input({
  onDark = false,
  className = "",
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const base = {
    width: "100%",
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    padding: "22px 28px",
    borderRadius: "var(--radius-control)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color var(--dur) var(--ease)"
  };
  const light = {
    background: "#fcfcfc",
    color: "var(--quest-heading)",
    border: `1px solid ${focus ? "var(--quest-blue)" : "var(--quest-border)"}`
  };
  const dark = {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: `1px solid ${focus ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}`
  };
  return /*#__PURE__*/React.createElement("input", _extends({
    className: className,
    style: {
      ...base,
      ...(onDark ? dark : light),
      ...style
    },
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  }, rest));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Quest Textarea — multiline counterpart to Input. Same skins via `onDark`.
 */
function Textarea({
  onDark = false,
  rows = 4,
  className = "",
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const base = {
    width: "100%",
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    padding: "20px 28px",
    borderRadius: "40px",
    boxSizing: "border-box",
    outline: "none",
    resize: "none",
    transition: "border-color var(--dur) var(--ease)"
  };
  const light = {
    background: "#fcfcfc",
    color: "var(--quest-heading)",
    border: `1px solid ${focus ? "var(--quest-blue)" : "var(--quest-border)"}`
  };
  const dark = {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: `1px solid ${focus ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}`
  };
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    className: className,
    style: {
      ...base,
      ...(onDark ? dark : light),
      ...style
    },
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/about-sections.jsx
try { (() => {
/* Quest Digital — About page sections */
const {
  A,
  TEAL,
  TEAL_HEX,
  INK,
  INK2,
  INK3,
  Reveal,
  Icon,
  Eyebrow,
  Header,
  Footer
} = window;
function AboutHero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff",
      paddingTop: "160px",
      paddingBottom: "110px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-30%",
      right: "-8%",
      width: "65vw",
      height: "65vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "-20%",
      left: "-12%",
      width: "50vw",
      height: "50vw",
      background: "radial-gradient(circle, rgba(43,123,185,0.2) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "0 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "28px"
    }
  }, "About Quest Digital"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 26px",
      fontWeight: 700,
      fontSize: "clamp(36px, 5.2vw, 72px)",
      letterSpacing: "-0.025em",
      lineHeight: 1.04,
      maxWidth: "18ch"
    }
  }, "We started as a creative agency that kept getting asked to build things."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "19px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: "rgba(255,255,255,0.82)",
      maxWidth: "540px"
    }
  }, "Over a decade later, that thinking still shapes everything we do."))));
}
function StorySection() {
  const stats = [{
    n: "10+",
    l: "Years of client work"
  }, {
    n: "ISO\n27001",
    l: "Information security"
  }, {
    n: "2",
    l: "Client tracks"
  }, {
    n: "UK",
    l: "Based in Essex, working nationally"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: "80px",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "26px"
    }
  }, "Our story"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 28px",
      fontSize: "clamp(28px, 3.4vw, 44px)",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      lineHeight: 1.12,
      color: "var(--quest-heading)"
    }
  }, "Flow Media, now Quest Digital."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "var(--quest-body)"
    }
  }, "Quest Digital is the digital arm of Quest Group, formed through the acquisition of Flow Media \u2014 a full-service creative and digital agency based in Essex with over a decade of experience spanning brand, web, software and marketing."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "var(--quest-body)"
    }
  }, "That background makes us unusual. We are a proper creative agency with serious technical depth, backed by a group that builds and runs platforms supporting UK healthcare. We are not a freelance operation, and we are not a faceless corporate IT department."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "var(--quest-body)"
    }
  }, "We are a small, experienced team. Clients get direct access to the people actually doing the work \u2014 no account managers, no juniors handed a project on day two."))), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.1
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      top: "120px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "20px",
      overflow: "hidden",
      marginBottom: "24px",
      aspectRatio: "4/3",
      background: INK2
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${A}/images/team-1.jpg`,
    alt: "The Quest Digital team",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "14px"
    }
  }, stats.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.l,
    style: {
      background: "var(--quest-surface-alt)",
      border: "1px solid var(--quest-border)",
      borderRadius: "12px",
      padding: "20px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "22px",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: INK,
      lineHeight: 1.1,
      whiteSpace: "pre-line"
    }
  }, s.n), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "6px",
      fontSize: "12.5px",
      fontWeight: 500,
      color: "#6a7889",
      lineHeight: 1.4
    }
  }, s.l)))))))));
}
function HowWeWork() {
  const principles = [{
    icon: "users",
    title: "You talk to the people doing the work",
    body: "No account managers, no juniors handed your project on day two. A small, senior team means direct access and genuine accountability."
  }, {
    icon: "git-branch",
    title: "We're honest about what fits",
    body: "If something is outside our scope, we say so upfront. If a project needs skills we don't have, we say that too. We'd rather lose a job than overpromise."
  }, {
    icon: "infinity",
    title: "We're in it for the long term",
    body: "Our best client relationships have lasted years. We want to understand your business and become part of how it works — not just complete a brief and move on."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "22px"
    }
  }, "How we work"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 56px",
      fontSize: "clamp(30px, 3.8vw, 50px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.08
    }
  }, "Three things that define how we work with clients.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "20px"
    }
  }, principles.map((p, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: p.title,
    delay: i * 0.07
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "16px",
      padding: "36px 32px",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "48px",
      height: "48px",
      borderRadius: "12px",
      background: "rgba(42,179,192,0.15)",
      color: TEAL_HEX,
      marginBottom: "22px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: p.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 14px",
      fontSize: "20px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.25
    }
  }, p.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "15.5px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: "rgba(255,255,255,0.78)"
    }
  }, p.body)))))));
}
function MeetTeam() {
  const TEAM = [{
    initials: "JS",
    name: "James Spencer",
    role: "Creative Director",
    bio: "Leads creative direction across brand, web and digital. Over a decade in the industry.",
    bg: INK
  }, {
    initials: "LH",
    name: "Laura Hughes",
    role: "Lead Developer",
    bio: "Architects and builds complex platforms, portals and integrations from the ground up.",
    bg: "#1a3d6a"
  }, {
    initials: "MR",
    name: "Matt Richards",
    role: "Head of Marketing",
    bio: "Drives SEO, paid media and content strategy for clients serious about growth.",
    bg: INK2
  }, {
    initials: "SC",
    name: "Sarah Chen",
    role: "Brand Designer",
    bio: "Identity, print and digital design. Makes things look as good as they work.",
    bg: "#0d2e50"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "The team"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 14px",
      fontSize: "clamp(30px, 3.8vw, 50px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--quest-heading)"
    }
  }, "Small, senior and direct."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 56px",
      fontSize: "18px",
      fontWeight: 300,
      color: "var(--quest-body)",
      maxWidth: "520px"
    }
  }, "The people you talk to are the people doing the work.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "20px"
    }
  }, TEAM.map((m, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: m.name,
    delay: i * 0.07
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--quest-border)",
      borderRadius: "18px",
      padding: "34px 28px",
      transition: "box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.boxShadow = "0 14px 36px rgba(33,75,127,0.1)";
      e.currentTarget.style.transform = "translateY(-3px)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.transform = "translateY(0)";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "66px",
      height: "66px",
      borderRadius: "50%",
      background: m.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "22px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "21px",
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "0.04em"
    }
  }, m.initials)), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 6px",
      fontSize: "18px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "var(--quest-heading)"
    }
  }, m.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "14px"
    }
  }, m.role), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "14.5px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)"
    }
  }, m.bio)))))));
}
function Credentials() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--quest-surface-alt)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "60px",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "60px",
      height: "60px",
      borderRadius: "14px",
      background: "rgba(42,179,192,0.12)",
      color: TEAL_HEX,
      marginBottom: "26px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 28
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 20px",
      fontSize: "clamp(28px, 3.4vw, 44px)",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      lineHeight: 1.12,
      color: "var(--quest-heading)"
    }
  }, "ISO 27001 certified."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 20px",
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "var(--quest-body)"
    }
  }, "We operate to an enterprise-grade information security standard. ISO 27001 is the internationally recognised benchmark for information security management \u2014 the same standard used by financial institutions, healthcare providers and government bodies."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "var(--quest-body)"
    }
  }, "For clients in regulated industries \u2014 healthcare, legal, finance \u2014 this is a genuine advantage, not just a box-tick. It means your data, your clients' data, and your platform are handled with the rigour those sectors require.")), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.1
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: INK,
      borderRadius: "20px",
      padding: "44px 40px",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "28px",
      padding: "10px 16px",
      background: "rgba(42,179,192,0.15)",
      borderRadius: "999px",
      border: "1px solid rgba(42,179,192,0.3)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "building-2",
    size: 18,
    color: TEAL_HEX
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: TEAL_HEX
    }
  }, "Part of Quest Group")), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 16px",
      fontSize: "24px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.2
    }
  }, "Backed by real infrastructure experience."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "rgba(255,255,255,0.78)"
    }
  }, "Quest Digital is part of Quest Group \u2014 a UK-based group operating across healthcare infrastructure, logistics, engineering and technology. The group builds and runs the platforms supporting UK healthcare. That context shapes how we think about reliability, compliance and long-term partnerships."))))));
}
function AboutCTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 18px",
      fontSize: "clamp(30px, 4vw, 54px)",
      fontWeight: 700,
      letterSpacing: "-0.02em"
    }
  }, "Get to know us."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 36px",
      fontSize: "19px",
      fontWeight: 300,
      color: "rgba(255,255,255,0.78)",
      maxWidth: "480px",
      marginLeft: "auto",
      marginRight: "auto"
    }
  }, "Start with a conversation. No hard sell, no commitment required."), /*#__PURE__*/React.createElement("a", {
    href: "contact.html",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 600,
      color: INK,
      background: TEAL_HEX,
      padding: "18px 34px",
      borderRadius: "999px",
      textDecoration: "none",
      transition: "transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.transform = "translateY(-2px)",
    onMouseLeave: e => e.currentTarget.style.transform = "translateY(0)"
  }, "Say hello ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18
  })))));
}
function App() {
  React.useEffect(() => {
    const draw = () => {
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    };
    draw();
    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement(AboutHero, null), /*#__PURE__*/React.createElement(StorySection, null), /*#__PURE__*/React.createElement(HowWeWork, null), /*#__PURE__*/React.createElement(MeetTeam, null), /*#__PURE__*/React.createElement(Credentials, null), /*#__PURE__*/React.createElement(AboutCTA, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/about-sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/contact-sections.jsx
try { (() => {
/* Quest Digital — Contact page sections */
const {
  A,
  TEAL,
  TEAL_HEX,
  INK,
  INK2,
  INK3,
  NS,
  Reveal,
  Icon,
  Eyebrow,
  Header,
  Footer
} = window;
const {
  Field,
  Input,
  Textarea
} = NS;
const SERVICE_OPTIONS = ["Web, Software and Apps", "Hosting and Managed Services", "Marketing and Growth", "Brand and Design", "Not sure yet"];
function ContactHero() {
  const [sent, setSent] = React.useState(false);
  const [services, setServices] = React.useState([]);
  const toggle = s => setServices(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff",
      minHeight: "100vh",
      paddingTop: "130px",
      paddingBottom: "100px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-30%",
      right: "-8%",
      width: "65vw",
      height: "65vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "-20%",
      left: "-12%",
      width: "50vw",
      height: "50vw",
      background: "radial-gradient(circle, rgba(43,123,185,0.18) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "0 40px",
      display: "grid",
      gridTemplateColumns: "1fr 1.1fr",
      gap: "80px",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "26px"
    }
  }, "Get in touch"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 22px",
      fontWeight: 700,
      fontSize: "clamp(38px, 5vw, 68px)",
      letterSpacing: "-0.025em",
      lineHeight: 1.02
    }
  }, "Let\u2019s talk."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 40px",
      fontSize: "18px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "rgba(255,255,255,0.82)",
      maxWidth: "420px"
    }
  }, "Whether you know exactly what you need or you\u2019re still figuring it out, we\u2019re happy to have a conversation. No hard sell, no jargon."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      marginBottom: "42px"
    }
  }, [{
    icon: "briefcase",
    label: "I have a specific project in mind",
    sub: "Describe it in the form and we'll get back to you within one working day."
  }, {
    icon: "compass",
    label: "I want to explore what's possible",
    sub: "Just say hello. We're happy to have an exploratory conversation."
  }].map(item => /*#__PURE__*/React.createElement("div", {
    key: item.label,
    style: {
      display: "flex",
      gap: "16px",
      alignItems: "flex-start",
      padding: "18px 20px",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "14px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "38px",
      height: "38px",
      borderRadius: "9px",
      background: "rgba(42,179,192,0.18)",
      color: TEAL_HEX,
      marginTop: "1px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "15px",
      fontWeight: 600,
      marginBottom: "5px"
    }
  }, item.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13.5px",
      fontWeight: 300,
      color: "rgba(255,255,255,0.68)",
      lineHeight: 1.5
    }
  }, item.sub))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      marginBottom: "28px"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "mailto:hello@questdesign.co.uk",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      fontSize: "16px",
      fontWeight: 500,
      color: "#fff",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 18,
    color: TEAL_HEX
  }), " hello@questdesign.co.uk"), /*#__PURE__*/React.createElement("a", {
    href: "tel:+441234000000",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      fontSize: "16px",
      fontWeight: 400,
      color: "rgba(255,255,255,0.78)",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 18,
    color: TEAL_HEX
  }), " 01234 000000")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "9px",
      fontSize: "13.5px",
      fontWeight: 400,
      color: "rgba(255,255,255,0.62)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 15,
    color: TEAL_HEX
  }), " We aim to respond within one working day.")), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.12
  }, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(42,179,192,0.1)",
      border: `1px solid ${TEAL_HEX}`,
      borderRadius: "24px",
      padding: "56px 40px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      background: TEAL_HEX,
      marginBottom: "24px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 28,
    color: INK
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 14px",
      fontSize: "28px",
      fontWeight: 700
    }
  }, "Thank you."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "17px",
      fontWeight: 300,
      color: "rgba(255,255,255,0.8)",
      lineHeight: 1.6
    }
  }, "We\u2019ve got your message and will be in touch within one working day.")) : /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "24px",
      padding: "40px 36px",
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    onDark: true,
    htmlFor: "qdc-name"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "qdc-name",
    onDark: true,
    placeholder: "Your name",
    required: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    onDark: true,
    htmlFor: "qdc-email"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "qdc-email",
    type: "email",
    onDark: true,
    placeholder: "you@company.co.uk",
    required: true
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "Company",
    onDark: true,
    htmlFor: "qdc-co"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "qdc-co",
    onDark: true,
    placeholder: "Your company (optional)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "14px",
      fontWeight: 500,
      color: "rgba(255,255,255,0.72)",
      marginBottom: "12px",
      letterSpacing: "0.02em"
    }
  }, "What are you interested in?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px"
    }
  }, SERVICE_OPTIONS.map(s => {
    const on = services.includes(s);
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      type: "button",
      onClick: () => toggle(s),
      style: {
        fontSize: "13px",
        fontWeight: 500,
        padding: "9px 16px",
        borderRadius: "999px",
        border: `1.5px solid ${on ? TEAL_HEX : "rgba(255,255,255,0.26)"}`,
        background: on ? "rgba(42,179,192,0.18)" : "transparent",
        color: on ? "#fff" : "rgba(255,255,255,0.78)",
        cursor: "pointer",
        transition: "all var(--dur) var(--ease)"
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        marginRight: "6px",
        fontSize: "11px"
      }
    }, "\u2713"), s);
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "Tell us about your project",
    onDark: true,
    htmlFor: "qdc-msg"
  }, /*#__PURE__*/React.createElement(Textarea, {
    id: "qdc-msg",
    onDark: true,
    rows: 4,
    placeholder: "A few lines on what you're looking to do..."
  })), /*#__PURE__*/React.createElement(Field, {
    label: "How did you hear about us?",
    onDark: true,
    htmlFor: "qdc-src"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: "qdc-src",
    style: {
      width: "100%",
      fontSize: "15px",
      fontWeight: 300,
      padding: "14px 18px",
      borderRadius: "999px",
      border: "1px solid rgba(255,255,255,0.22)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.88)",
      appearance: "none",
      cursor: "pointer",
      outline: "none"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select an option"), ["Google", "LinkedIn", "Referral", "Quest Group", "Other"].map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o.toLowerCase()
  }, o))), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: "18px",
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "rgba(255,255,255,0.5)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 16
  })))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: {
      marginTop: "4px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 600,
      color: INK,
      background: TEAL_HEX,
      border: "none",
      padding: "18px 28px",
      borderRadius: "999px",
      cursor: "pointer",
      transition: "transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.transform = "translateY(-2px)",
    onMouseLeave: e => e.currentTarget.style.transform = "translateY(0)"
  }, "Send message ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18
  }))))));
}
function App() {
  React.useEffect(() => {
    const draw = () => {
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    };
    draw();
    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement(ContactHero, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/contact-sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/home-base.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Quest Digital — homepage.  SHARED BASE.
   Helpers (scroll-reveal, scrolled header, lucide icon), the fixed header and
   the footer. Consumes the design-system bundle; loaded as text/babel.
   Everything other files need is exported to window at the bottom. */

const NS = window.QuestMedicalDesignSystem_1bd691;
const {
  Button
} = NS;
const A = "../../assets";
const TEAL = "var(--division-digital)"; /* #2ab3c0 */
const TEAL_HEX = "#2ab3c0";
const INK = "#0e2440"; /* editorial navy — dark sections        */
const INK2 = "#15304f"; /* lifted navy — cards / panels on dark   */
const INK3 = "#0a1c33"; /* deepest navy — header scrim / footer   */

/* ── Scroll-reveal: fade + rise once, respects reduced-motion ── */
function useReveal() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = () => {
      el.style.opacity = 1;
      el.style.transform = "none";
    };
    if (reduce) {
      show();
      return;
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        show();
        obs.disconnect();
      }
    }, {
      threshold: 0.12
    });
    obs.observe(el);
    const t = setTimeout(() => {
      show();
      obs.disconnect();
    }, 1000); /* capture safety */
    return () => {
      obs.disconnect();
      clearTimeout(t);
    };
  }, []);
  return ref;
}
function Reveal({
  children,
  delay = 0,
  y = 26,
  style = {},
  ...rest
}) {
  const ref = useReveal();
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    style: {
      opacity: 0,
      transform: `translateY(${y}px)`,
      transition: `opacity 0.7s var(--ease) ${delay}s, transform 0.7s var(--ease) ${delay}s`,
      ...style
    }
  }, rest), children);
}

/* ── Header solidifies after a little scroll ── */
function useScrolled(threshold = 40) {
  const [s, setS] = React.useState(false);
  React.useEffect(() => {
    const on = () => setS(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, {
      passive: true
    });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return s;
}

/* ── Lucide icon (rendered via data-lucide; createIcons() runs in App) ── */
function Icon({
  name,
  size = 22,
  color = "currentColor",
  style = {}
}) {
  return /*#__PURE__*/React.createElement("i", {
    "data-lucide": name,
    style: {
      width: size,
      height: size,
      display: "inline-flex",
      color,
      ...style
    }
  });
}

/* ── Brand social marks (Lucide dropped these; inline single-path SVGs) ── */
const SOCIAL_PATHS = {
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
};
function SocialIcon({
  name,
  size = 17
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: SOCIAL_PATHS[name]
  }));
}

/* ── Eyebrow: teal rule + tracked uppercase label ── */
function Eyebrow({
  children,
  onDark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "30px",
      height: "2px",
      background: TEAL
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: onDark ? "rgba(255,255,255,0.78)" : TEAL
    }
  }, children));
}

/* ── Brand lockup: Quest wordmark · Digital ── */
function Logo({
  height = 30
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: "home.html",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "13px",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${A}/logos/quest-primary-white.png`,
    alt: "Quest",
    style: {
      height: `${height}px`,
      width: "auto",
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      height: "18px",
      width: "1px",
      background: "rgba(255,255,255,0.32)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: TEAL_HEX
    }
  }, "Digital"));
}

/* ── Services mega-dropdown content ── */
const SERVICES_MENU = [{
  n: "01",
  icon: "code-2",
  title: "Web, Software & Apps",
  desc: "Bespoke enterprise platforms and fast Next.js sites with booking & portals built in.",
  href: "service-web.html"
}, {
  n: "02",
  icon: "server",
  title: "Hosting & Managed Services",
  desc: "We own the uptime, security, maintenance and support. Everything under one roof.",
  href: "service-hosting.html"
}, {
  n: "03",
  icon: "trending-up",
  title: "Marketing & Growth",
  desc: "Performance-led SEO, paid media, social and email that turn visitors into enquiries.",
  href: "service-marketing.html"
}, {
  n: "04",
  icon: "palette",
  title: "Brand & Design",
  desc: "Logo, brand guidelines, print and collateral — so it looks as good as it works.",
  href: "service-brand.html"
}];
function ServicesMenu({
  open
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "menu",
    "aria-hidden": !open,
    style: {
      position: "absolute",
      top: "calc(100% + 18px)",
      right: 0,
      width: "760px",
      display: "grid",
      gridTemplateColumns: "1fr 250px",
      background: INK2,
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: "18px",
      boxShadow: "0 30px 70px -30px rgba(0,0,0,0.85)",
      overflow: "hidden",
      opacity: open ? 1 : 0,
      visibility: open ? "visible" : "hidden",
      transform: open ? "translateY(0)" : "translateY(-8px)",
      transition: "opacity 0.2s var(--ease), transform 0.2s var(--ease), visibility 0.2s var(--ease)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: "-7px",
      right: "120px",
      width: "14px",
      height: "14px",
      background: INK2,
      borderLeft: "1px solid rgba(255,255,255,0.10)",
      borderTop: "1px solid rgba(255,255,255,0.10)",
      transform: "rotate(45deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "22px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "6px"
    }
  }, SERVICES_MENU.map(s => /*#__PURE__*/React.createElement("a", {
    key: s.n,
    href: s.href,
    role: "menuitem",
    style: {
      display: "block",
      padding: "16px",
      borderRadius: "14px",
      textDecoration: "none",
      transition: "background var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.background = "rgba(255,255,255,0.05)",
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "11px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "44px",
      height: "44px",
      borderRadius: "12px",
      background: "rgba(42,179,192,0.12)",
      border: "1px solid rgba(42,179,192,0.28)",
      color: TEAL_HEX
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 21
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: TEAL_HEX
    }
  }, s.n)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "16px",
      fontWeight: 500,
      color: "#fff",
      marginBottom: "6px"
    }
  }, s.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 300,
      lineHeight: 1.55,
      color: "rgba(255,255,255,0.62)"
    }
  }, s.desc)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(180deg,#173a5f,#10294a)",
      padding: "26px 24px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "14px"
    }
  }, "Not sure where to start?"), /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: "0 0 10px",
      fontSize: "22px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.2
    }
  }, "One partner, brand to build to hosted."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 22px",
      fontSize: "14px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.74)"
    }
  }, "Tell us what you\u2019re trying to do and we\u2019ll point you to the right team."), /*#__PURE__*/React.createElement("a", {
    href: "contact.html",
    style: {
      marginTop: "auto",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontSize: "14px",
      fontWeight: 600,
      color: INK,
      background: TEAL,
      padding: "13px 18px",
      borderRadius: "999px",
      textDecoration: "none"
    }
  }, "Talk to our team ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 15
  }))));
}

/* ── Fixed header ── */
function Header() {
  const scrolled = useScrolled(40);
  const NAV = [["Services", "services.html"], ["Work", "work.html"], ["About", "about.html"], ["Contact", "contact.html"]];
  const curPage = window.location.pathname.split('/').pop();
  const [svcOpen, setSvcOpen] = React.useState(false);
  const closeTimer = React.useRef(null);
  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setSvcOpen(true);
  };
  const closeMenu = () => {
    closeTimer.current = setTimeout(() => setSvcOpen(false), 120);
  };
  React.useEffect(() => () => clearTimeout(closeTimer.current), []);
  React.useEffect(() => {
    lucide && lucide.createIcons();
  }, [svcOpen]);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      background: scrolled || svcOpen ? "rgba(10,28,51,0.96)" : "transparent",
      borderBottom: `1px solid ${scrolled || svcOpen ? "rgba(255,255,255,0.08)" : "transparent"}`,
      transition: "background 0.35s var(--ease), border-color 0.35s var(--ease)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "20px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Logo, null), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "34px"
    }
  }, NAV.map(([label, href]) => {
    const active = curPage === href || label === "Services" && curPage.startsWith("service");
    if (label === "Services") {
      const lit = active || svcOpen;
      return /*#__PURE__*/React.createElement("span", {
        key: label,
        style: {
          position: "relative"
        },
        onMouseEnter: openMenu,
        onMouseLeave: closeMenu
      }, /*#__PURE__*/React.createElement("a", {
        href: href,
        "aria-haspopup": "true",
        "aria-expanded": svcOpen,
        onFocus: openMenu,
        onKeyDown: e => {
          if (e.key === "Escape") setSvcOpen(false);
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "15px",
          fontWeight: 500,
          color: lit ? "#fff" : "rgba(255,255,255,0.82)",
          textDecoration: "none",
          transition: "color var(--dur) var(--ease)",
          paddingBottom: "3px",
          borderBottom: lit ? `2px solid ${TEAL_HEX}` : "2px solid transparent"
        }
      }, label, /*#__PURE__*/React.createElement(Icon, {
        name: "chevron-down",
        size: 15,
        style: {
          transition: "transform 0.25s var(--ease)",
          transform: svcOpen ? "rotate(180deg)" : "none"
        }
      })), /*#__PURE__*/React.createElement(ServicesMenu, {
        open: svcOpen
      }));
    }
    return /*#__PURE__*/React.createElement("a", {
      key: label,
      href: href,
      style: {
        fontSize: "15px",
        fontWeight: 500,
        color: active ? "#fff" : "rgba(255,255,255,0.82)",
        textDecoration: "none",
        transition: "color var(--dur) var(--ease)",
        paddingBottom: "3px",
        borderBottom: active ? `2px solid ${TEAL_HEX}` : "2px solid transparent"
      },
      onMouseEnter: e => e.currentTarget.style.color = "#fff",
      onMouseLeave: e => {
        if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.82)";
      }
    }, label);
  }), /*#__PURE__*/React.createElement("a", {
    href: "contact.html",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "15px",
      fontWeight: 600,
      color: INK,
      background: TEAL,
      padding: "11px 22px",
      borderRadius: "999px",
      textDecoration: "none",
      transition: "transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.transform = "translateY(-1px)",
    onMouseLeave: e => e.currentTarget.style.transform = "translateY(0)"
  }, "Start a project"))));
}

/* ── Footer ── */
function Footer() {
  const cols = [{
    h: "Services",
    links: [{
      l: "Web, Software and Apps",
      h: "service-web.html"
    }, {
      l: "Hosting and Managed Services",
      h: "service-hosting.html"
    }, {
      l: "Marketing and Growth",
      h: "service-marketing.html"
    }, {
      l: "Brand and Design",
      h: "service-brand.html"
    }]
  }, {
    h: "Company",
    links: [{
      l: "About",
      h: "about.html"
    }, {
      l: "Work",
      h: "work.html"
    }, {
      l: "Contact",
      h: "contact.html"
    }, {
      l: "Privacy Policy",
      h: "#"
    }]
  }];
  const socials = [{
    name: "linkedin",
    href: "#"
  }, {
    name: "instagram",
    href: "#"
  }, {
    name: "facebook",
    href: "#"
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: INK3,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "84px 40px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr 1fr 1.2fr",
      gap: "48px",
      paddingBottom: "64px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    height: 30
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "26px 0 0",
      fontSize: "15px",
      fontWeight: 300,
      lineHeight: 1.7,
      color: "rgba(255,255,255,0.68)",
      maxWidth: "300px"
    }
  }, "The creative and technology studio of Quest Group. Based in Essex, working across the UK and internationally."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "9px",
      marginTop: "22px",
      padding: "8px 14px",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: "999px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 16,
    color: TEAL_HEX
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "12.5px",
      fontWeight: 500,
      letterSpacing: "0.04em",
      color: "rgba(255,255,255,0.85)"
    }
  }, "ISO 27001 certified"))), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: "0 0 20px",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.5)"
    }
  }, c.h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "13px"
    }
  }, c.links.map(l => /*#__PURE__*/React.createElement("li", {
    key: l.l
  }, /*#__PURE__*/React.createElement("a", {
    href: l.h,
    style: {
      fontSize: "15px",
      fontWeight: 300,
      color: "rgba(255,255,255,0.78)",
      textDecoration: "none",
      transition: "color var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.color = TEAL_HEX,
    onMouseLeave: e => e.currentTarget.style.color = "rgba(255,255,255,0.78)"
  }, l.l)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: "0 0 20px",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.5)"
    }
  }, "Get in touch"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:hello@questdesign.co.uk",
    style: {
      display: "block",
      fontSize: "16px",
      fontWeight: 500,
      color: "#fff",
      textDecoration: "none",
      marginBottom: "10px"
    }
  }, "hello@questdesign.co.uk"), /*#__PURE__*/React.createElement("a", {
    href: "tel:+441234000000",
    style: {
      display: "block",
      fontSize: "15px",
      fontWeight: 300,
      color: "rgba(255,255,255,0.78)",
      textDecoration: "none",
      marginBottom: "24px"
    }
  }, "01234 000000"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "10px"
    }
  }, socials.map(s => /*#__PURE__*/React.createElement("a", {
    key: s.name,
    href: s.href,
    "aria-label": s.name,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px",
      borderRadius: "999px",
      border: "1px solid rgba(255,255,255,0.18)",
      color: "rgba(255,255,255,0.85)",
      transition: "background var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = TEAL_HEX;
      e.currentTarget.style.color = INK;
      e.currentTarget.style.borderColor = TEAL_HEX;
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = "rgba(255,255,255,0.85)";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
    }
  }, /*#__PURE__*/React.createElement(SocialIcon, {
    name: s.name,
    size: 16
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid rgba(255,255,255,0.1)",
      padding: "26px 0 34px",
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "12px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "13px",
      color: "rgba(255,255,255,0.5)"
    }
  }, "Quest Digital is a trading name of Quest Group. Registered in England and Wales."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "13px",
      color: "rgba(255,255,255,0.5)"
    }
  }, "\xA9 2026 Quest Group \xB7 All rights reserved."))));
}
Object.assign(window, {
  NS,
  Button,
  A,
  TEAL,
  TEAL_HEX,
  INK,
  INK2,
  INK3,
  useReveal,
  Reveal,
  useScrolled,
  Icon,
  Eyebrow,
  Logo,
  Header,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/home-base.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/home-sections.jsx
try { (() => {
/* Quest Digital — homepage.  CONTENT SECTIONS + App.
   Uses helpers/header/footer exported to window by home-base.jsx.
   Loaded as text/babel after home-base.jsx; exports <App> to window. */

const {
  Button,
  A,
  TEAL,
  TEAL_HEX,
  INK,
  INK2,
  INK3,
  Reveal,
  Icon,
  Eyebrow,
  Header,
  Footer
} = window;

/* shared link with sliding arrow */
function ArrowLink({
  children,
  color = TEAL_HEX,
  dark = false
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "15px",
      fontWeight: 600,
      color: dark ? "#fff" : "var(--quest-heading)",
      cursor: "pointer"
    }
  }, children, /*#__PURE__*/React.createElement("span", {
    style: {
      color,
      transform: h ? "translateX(6px)" : "translateX(0)",
      transition: "transform 0.4s var(--ease)"
    }
  }, "\u2192"));
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    id: "top",
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-28%",
      right: "-12%",
      width: "68vw",
      height: "68vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.22) 0%, rgba(42,179,192,0) 60%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "-24%",
      left: "-16%",
      width: "56vw",
      height: "56vw",
      background: "radial-gradient(circle, rgba(43,123,185,0.26) 0%, rgba(43,123,185,0) 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0.55,
      backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      backgroundSize: "64px 64px",
      maskImage: "radial-gradient(circle at 52% 42%, #000 28%, transparent 76%)",
      WebkitMaskImage: "radial-gradient(circle at 52% 42%, #000 28%, transparent 76%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "150px 40px 110px",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(Reveal, {
    y: 14
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "34px"
    }
  }, "Part of Quest Group")), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontWeight: 700,
      lineHeight: 1.0,
      letterSpacing: "-0.025em",
      fontSize: "clamp(44px, 6.6vw, 92px)",
      maxWidth: "16ch"
    }
  }, /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.08,
    y: 28,
    style: {
      display: "inline"
    }
  }, /*#__PURE__*/React.createElement("span", null, "We build websites, software and digital products that "), /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL
    }
  }, "actually work."))), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.28,
    style: {
      marginTop: "34px",
      maxWidth: "620px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "20px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.82)"
    }
  }, "From a smart website for your small business to a complex platform for your enterprise, we bring the creativity and the technical depth to get it right.")), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.42,
    style: {
      marginTop: "40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "16px",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#contact",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 600,
      color: INK,
      background: TEAL,
      padding: "17px 30px",
      borderRadius: "999px",
      textDecoration: "none",
      transition: "transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.transform = "translateY(-2px)",
    onMouseLeave: e => e.currentTarget.style.transform = "translateY(0)"
  }, "Got a big idea? Let\u2019s talk ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18
  })), /*#__PURE__*/React.createElement("a", {
    href: "#tracks",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 500,
      color: "#fff",
      background: "transparent",
      padding: "16px 28px",
      borderRadius: "999px",
      border: "1px solid rgba(255,255,255,0.32)",
      textDecoration: "none",
      transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)";
    }
  }, "Need a better website? Start here")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "28px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      color: "rgba(255,255,255,0.55)",
      fontSize: "11px",
      letterSpacing: "0.2em",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Scroll"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: "1px",
      height: "32px",
      background: "linear-gradient(rgba(255,255,255,0.55), transparent)"
    }
  })));
}

/* ───────── Trust band: positioning line + ISO + client logos ───────── */
function Proof() {
  const logos = [{
    src: `${A}/partners/Ramsay.png`,
    alt: "Ramsay Health Care"
  }, {
    src: `${A}/partners/Healthshare.webp`,
    alt: "Healthshare"
  }];
  const placeholders = ["Client", "Client", "Client"];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff",
      borderBottom: "1px solid var(--quest-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1120px",
      margin: "0 auto",
      padding: "50px 40px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      flexWrap: "wrap",
      marginBottom: "34px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "14px",
      fontWeight: 400,
      color: "var(--quest-body)"
    }
  }, "Trusted by businesses across ", /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: 500,
      color: "var(--quest-heading)"
    }
  }, "Essex, the UK and beyond")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: "4px",
      height: "4px",
      borderRadius: "50%",
      background: "#c5cdd8"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      fontSize: "14px",
      fontWeight: 500,
      color: "var(--quest-heading)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 16,
    color: TEAL_HEX
  }), " ISO 27001 certified")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "clamp(40px, 6vw, 80px)",
      flexWrap: "wrap"
    }
  }, logos.map(l => /*#__PURE__*/React.createElement("img", {
    key: l.alt,
    src: l.src,
    alt: l.alt,
    style: {
      height: "46px",
      width: "auto",
      objectFit: "contain",
      filter: "grayscale(1)",
      opacity: 0.6,
      display: "block",
      transition: "opacity var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.opacity = 0.9,
    onMouseLeave: e => e.currentTarget.style.opacity = 0.6
  })), placeholders.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: "46px",
      width: "148px",
      borderRadius: "8px",
      border: "1px dashed #d4dae2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#b8c1cc"
    }
  }, p))))));
}

/* ──────────── Differentiator: creativity × technology ──────────── */
function Difference() {
  const cols = [{
    label: "Creative-only agencies",
    body: "Great look and feel. But WordPress templates under the hood, and no bespoke software capability.",
    muted: true
  }, {
    label: "Quest Digital",
    body: "Creative and technical, in the same room. The right tool for the job, and a long-term partner who builds, hosts and markets it.",
    muted: false
  }, {
    label: "Dev-only shops",
    body: "Strong engineering. But cold and functional, with no design sensibility and no brand or marketing thinking.",
    muted: true
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "118px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "780px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "26px"
    }
  }, "What makes us different"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "clamp(32px, 4.4vw, 56px)",
      fontWeight: 700,
      lineHeight: 1.12,
      letterSpacing: "-0.02em",
      color: "var(--quest-heading)"
    }
  }, "We don\u2019t separate creativity from ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL
    }
  }, "technology"), "."))), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.1,
    style: {
      marginTop: "60px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "20px",
      alignItems: "stretch"
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.label,
    style: {
      position: "relative",
      padding: "38px 34px",
      borderRadius: "16px",
      background: c.muted ? "var(--quest-surface-alt)" : INK,
      border: c.muted ? "1px solid var(--quest-border)" : `1px solid ${INK}`,
      color: c.muted ? "var(--quest-body)" : "#fff",
      transform: c.muted ? "none" : "translateY(-12px)",
      boxShadow: c.muted ? "none" : "0 24px 50px rgba(14,36,64,0.28)"
    }
  }, !c.muted && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: "34px",
      right: "34px",
      height: "3px",
      background: TEAL,
      borderRadius: "0 0 3px 3px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: c.muted ? "#9a9a9a" : TEAL_HEX,
      marginBottom: "16px"
    }
  }, c.label), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "16.5px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: c.muted ? "var(--quest-body)" : "rgba(255,255,255,0.88)"
    }
  }, c.body)))))));
}

/* ─────────────────── Services — four pillars ─────────────────── */
function Services() {
  const rows = [{
    n: "01",
    icon: "code-2",
    title: "Web, Software and Apps",
    link: "See what we build",
    desc: "Our primary capability. From bespoke enterprise platforms to fast, lightweight Next.js sites with booking and portals built in properly, not bolted on with plugins.",
    tags: ["Next.js & React", "Bespoke software", "Portals & apps", "E-commerce"]
  }, {
    n: "02",
    icon: "server",
    title: "Hosting and Managed Services",
    link: "How we keep it running",
    desc: "We don&rsquo;t build things and disappear. Fully managed hosting means we own the uptime, security, maintenance and support. Everything under one roof.",
    tags: ["Managed hosting", "Security & SSL", "Backups", "SLA support"]
  }, {
    n: "03",
    icon: "trending-up",
    title: "Marketing and Growth",
    link: "Grow your audience",
    desc: "A great website is the start, not the finish. Performance-led SEO, paid media, social and email that get you found and turn visitors into enquiries.",
    tags: ["SEO", "Paid search", "Social", "Email"]
  }, {
    n: "04",
    icon: "palette",
    title: "Brand and Design",
    link: "Build your brand",
    desc: "Great digital work starts with a clear identity. Logo, brand guidelines, print and collateral, so everything looks as good as it works.",
    tags: ["Identity", "Brand guidelines", "Print", "Collateral"]
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "services",
    style: {
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "120px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "22px"
    }
  }, "What we do"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "32px",
      flexWrap: "wrap",
      marginBottom: "56px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "clamp(32px, 4.4vw, 56px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.05
    }
  }, "Everything you need.", /*#__PURE__*/React.createElement("br", null), "Nothing you don\u2019t."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "18px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.78)",
      maxWidth: "420px"
    }
  }, "A full-service digital studio. Brand to build to hosted, marketed platform, without handing anything off. Most clients stay with us long after the first project."))), /*#__PURE__*/React.createElement("div", null, rows.map((r, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: r.n,
    delay: i * 0.05
  }, /*#__PURE__*/React.createElement(Pillar, r))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid rgba(255,255,255,0.14)"
    }
  }))));
}
function Pillar({
  n,
  icon,
  title,
  desc,
  tags,
  link
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "grid",
      gridTemplateColumns: "78px 1fr 300px",
      gap: "36px",
      alignItems: "start",
      padding: "42px 0",
      borderTop: "1px solid rgba(255,255,255,0.14)",
      transition: "border-color var(--dur) var(--ease)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "15px",
      fontWeight: 700,
      color: TEAL_HEX,
      letterSpacing: "0.1em"
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "48px",
      height: "48px",
      borderRadius: "12px",
      background: h ? TEAL : "rgba(255,255,255,0.06)",
      border: `1px solid ${h ? TEAL : "rgba(255,255,255,0.16)"}`,
      color: h ? INK : "#fff",
      transition: "all var(--dur) var(--ease)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 14px",
      fontSize: "29px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.1
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 22px",
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.78)",
      maxWidth: "560px"
    },
    dangerouslySetInnerHTML: {
      __html: desc
    }
  }), /*#__PURE__*/React.createElement(ArrowLink, {
    dark: true
  }, link)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      paddingTop: "6px"
    }
  }, tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontSize: "13px",
      fontWeight: 500,
      color: "rgba(255,255,255,0.9)",
      border: "1px solid rgba(255,255,255,0.22)",
      padding: "7px 14px",
      borderRadius: "999px"
    }
  }, t))));
}

/* ─────────────────── Tech marquee (right tool) ─────────────────── */
function Tech() {
  const stack = ["Next.js", "React", "Ruby on Rails", ".NET", "PHP", "Flutter", "Payload CMS", "WordPress", "Stripe", "Docker", "Vercel", "Figma", "Claude"];
  const row = [...stack, ...stack];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: TEAL,
      color: INK,
      overflow: "hidden",
      borderTop: `1px solid ${INK}`,
      borderBottom: `1px solid ${INK}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: "0 30px",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      borderRight: `1px solid rgba(14,36,64,0.25)`,
      alignSelf: "stretch",
      display: "flex",
      alignItems: "center"
    }
  }, "The right tool", /*#__PURE__*/React.createElement("br", null), "for the job"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      flex: 1,
      padding: "20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "0",
      whiteSpace: "nowrap",
      width: "max-content",
      animation: "qd-marquee 36s linear infinite"
    }
  }, row.map((it, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "30px",
      paddingRight: "30px",
      fontSize: "20px",
      fontWeight: 700,
      letterSpacing: "-0.01em"
    }
  }, it, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "9px",
      opacity: 0.55
    }
  }, "\u25CF")))))));
}

/* ─────────────────── Two tracks ─────────────────── */
function Tracks() {
  return /*#__PURE__*/React.createElement("section", {
    id: "tracks",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "120px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "720px",
      marginBottom: "56px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "Two client tracks"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 20px",
      fontSize: "clamp(32px, 4.4vw, 56px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.08,
      color: "var(--quest-heading)"
    }
  }, "Built for businesses of every size."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "19px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)"
    }
  }, "We work with enterprise clients building complex platforms and small businesses who just want a website that does more. Different scales, same level of care."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "26px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.05,
    style: {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(TrackCard, {
    dark: true,
    eyebrow: "Enterprise & complex platforms",
    title: "Complex problems, properly solved.",
    body: "For businesses with serious digital requirements. Bespoke software, portals and integrations, built by a team who understand the technology and the business behind it.",
    cta: "Talk to us about your project"
  })), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.12,
    style: {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(TrackCard, {
    eyebrow: "Smart sites for small business",
    title: "A better website than you thought you could afford.",
    body: "For small businesses tired of slow, clunky WordPress sites. Clean, fast sites with booking, stock and customer portals built in properly, not bolted on.",
    cta: "See what\u2019s possible"
  })))));
}
function TrackCard({
  dark,
  eyebrow,
  title,
  body,
  cta
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      padding: "44px 42px",
      borderRadius: "20px",
      background: dark ? INK : "#fff",
      border: dark ? `1px solid ${INK}` : `2px solid ${h ? TEAL_HEX : "var(--quest-border)"}`,
      color: dark ? "#fff" : "var(--quest-heading)",
      boxShadow: dark ? "0 24px 50px rgba(14,36,64,0.22)" : "none",
      transition: "border-color var(--dur) var(--ease), transform var(--dur) var(--ease)",
      transform: h ? "translateY(-4px)" : "translateY(0)"
    },
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "20px"
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 18px",
      fontSize: "28px",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      lineHeight: 1.15
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 30px",
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: dark ? "rgba(255,255,255,0.8)" : "var(--quest-body)"
    }
  }, body), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#contact",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "15px",
      fontWeight: 600,
      color: dark ? INK : "#fff",
      background: dark ? "#fff" : INK,
      padding: "14px 26px",
      borderRadius: "999px",
      textDecoration: "none",
      transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = TEAL_HEX;
      e.currentTarget.style.color = INK;
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = dark ? "#fff" : INK;
      e.currentTarget.style.color = dark ? INK : "#fff";
    },
    dangerouslySetInnerHTML: {
      __html: cta + " &rarr;"
    }
  })));
}

/* ─────────────────── Why work with us ─────────────────── */
function Why() {
  const items = [{
    icon: "layers",
    title: "Genuinely full stack",
    body: "Brand, build, hosting and marketing under one roof. No handoffs, no gaps, no \u201cthat\u2019s not our department\u201d."
  }, {
    icon: "git-branch",
    title: "The right tool, not the familiar one",
    body: "Experience across WordPress, Next.js, React, Ruby on Rails, .NET, PHP and more. We use what\u2019s right for the job, and tell you why."
  }, {
    icon: "sparkles",
    title: "We embrace AI the right way",
    body: "Tools like Claude and ChatGPT help us work smarter and faster. The thinking, the craft and the accountability stay with us."
  }, {
    icon: "users",
    title: "You talk to the people doing the work",
    body: "A small, senior team. No account managers, no juniors handed your project on day two. Direct access to people who know what they\u2019re doing."
  }, {
    icon: "infinity",
    title: "In it for the long term",
    body: "Our best client relationships have lasted years. We want to understand your business, not just complete a brief."
  }, {
    icon: "shield-check",
    title: "ISO 27001 certified",
    body: "We operate to an enterprise-grade information security standard. Important if you handle sensitive data or work in a regulated industry."
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "about",
    style: {
      background: "var(--quest-surface-alt)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "120px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "Why Quest Digital"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 60px",
      fontSize: "clamp(32px, 4.4vw, 56px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--quest-heading)"
    }
  }, "Why work with us?")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "20px"
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: it.title,
    delay: i % 3 * 0.06
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      background: "#fff",
      border: "1px solid var(--quest-border)",
      borderRadius: "16px",
      padding: "34px 32px",
      transition: "box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.boxShadow = "0 16px 38px rgba(33,75,127,0.1)";
      e.currentTarget.style.transform = "translateY(-3px)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.transform = "translateY(0)";
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "50px",
      height: "50px",
      borderRadius: "12px",
      background: "rgba(42,179,192,0.12)",
      color: TEAL_HEX,
      marginBottom: "22px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon,
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 12px",
      fontSize: "20px",
      fontWeight: 700,
      letterSpacing: "-0.005em",
      lineHeight: 1.25,
      color: "var(--quest-heading)"
    }
  }, it.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)"
    }
  }, it.body)))))));
}

/* ─────────────────── Work preview ─────────────────── */
/* NOTE: representative placeholders — swap images/copy for refreshed Flow Media
   case studies once confirmed (see service-definition open questions). */
function Work() {
  const cards = [{
    img: `${A}/images/healthcare.jpg`,
    tag: "Healthcare · Web App",
    title: "Booking & patient portal",
    blurb: "A booking and customer portal that cut admin time and replaced a stack of spreadsheets."
  }, {
    img: `${A}/images/asset-management.jpg`,
    tag: "Logistics · Dashboard",
    title: "Live operations dashboard",
    blurb: "Real-time data turned into one clear view a team can act on instantly."
  }, {
    img: `${A}/images/partnership.jpg`,
    tag: "Professional services · Web",
    title: "Marketing site & CMS",
    blurb: "A fast, lightweight Next.js site the team can edit and run themselves."
  }];
  return /*#__PURE__*/React.createElement("section", {
    id: "work",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "120px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "24px",
      marginBottom: "56px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "620px"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "Selected work"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 18px",
      fontSize: "clamp(32px, 4.4vw, 56px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.08,
      color: "var(--quest-heading)"
    }
  }, "Some of what we have built."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "18px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)"
    }
  }, "A selection of projects across different sectors and scales.")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    href: "#"
  }, "View all our work"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "26px"
    }
  }, cards.map((c, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: c.title,
    delay: i * 0.06
  }, /*#__PURE__*/React.createElement(WorkCard, c))))));
}
function WorkCard({
  img,
  tag,
  title,
  blurb
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: "#",
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "block",
      textDecoration: "none",
      borderRadius: "20px",
      overflow: "hidden",
      border: "1px solid var(--quest-border)",
      background: "#fff",
      transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
      boxShadow: h ? "0 18px 40px rgba(33,75,127,0.12)" : "none",
      borderColor: h ? TEAL_HEX : "var(--quest-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      aspectRatio: "16 / 10",
      background: INK
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: img,
    alt: title,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: h ? "scale(1.05)" : "scale(1)",
      transition: "transform 0.6s var(--ease)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "26px 28px 30px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "12px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: TEAL_HEX
    }
  }, tag), /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX,
      opacity: h ? 1 : 0,
      transform: h ? "translate(0,0)" : "translate(-4px,4px)",
      transition: "all 0.4s var(--ease)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    size: 17
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 10px",
      fontSize: "21px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.2,
      color: h ? TEAL_HEX : "var(--quest-heading)",
      transition: "color var(--dur) var(--ease)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "15px",
      fontWeight: 300,
      lineHeight: 1.55,
      color: "var(--quest-body)"
    }
  }, blurb)));
}

/* ─────────────────── Contact / CTA ─────────────────── */
function Contact() {
  const {
    Field,
    Input,
    Textarea
  } = NS;
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    id: "contact",
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-40%",
      right: "-5%",
      width: "70vw",
      height: "70vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, rgba(42,179,192,0) 60%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "120px 40px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "72px",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "26px"
    }
  }, "Get in touch"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 22px",
      fontSize: "clamp(34px, 4.6vw, 60px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.05,
      color: "#fff"
    }
  }, "Got a project in mind?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 34px",
      fontSize: "19px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: "rgba(255,255,255,0.82)",
      maxWidth: "440px"
    }
  }, "Whether you know exactly what you need or you\u2019re still figuring it out, we\u2019re happy to have a conversation. No hard sell, no jargon. Just an honest chat about what we can do for you."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "mailto:hello@questdesign.co.uk",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      fontSize: "17px",
      fontWeight: 500,
      color: "#fff",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 19,
    color: TEAL_HEX
  }), " hello@questdesign.co.uk"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "12px",
      fontSize: "15px",
      fontWeight: 300,
      color: "rgba(255,255,255,0.7)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 18,
    color: TEAL_HEX
  }), " We aim to respond within one working day."))), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.1
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "24px",
      padding: "38px 36px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "18px"
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name",
    onDark: true,
    htmlFor: "qd-name"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "qd-name",
    onDark: true,
    placeholder: "Your name",
    required: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    onDark: true,
    htmlFor: "qd-email"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "qd-email",
    type: "email",
    onDark: true,
    placeholder: "you@company.co.uk",
    required: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Tell us about your project",
    onDark: true,
    htmlFor: "qd-msg"
  }, /*#__PURE__*/React.createElement(Textarea, {
    id: "qd-msg",
    onDark: true,
    rows: 4,
    placeholder: "A few lines on what you\u2019re looking to build\u2026"
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: {
      marginTop: "6px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 600,
      color: INK,
      background: sent ? "#fff" : TEAL,
      border: "none",
      padding: "18px 28px",
      borderRadius: "999px",
      cursor: "pointer",
      transition: "transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.transform = "translateY(-2px)",
    onMouseLeave: e => e.currentTarget.style.transform = "translateY(0)"
  }, sent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18
  }), " Thank you, we\u2019ll be in touch") : /*#__PURE__*/React.createElement(React.Fragment, null, "Send message ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18
  }))))))));
}

/* ─────────────────────────── App ─────────────────────────── */
function App() {
  React.useEffect(() => {
    const draw = () => {
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    };
    draw();
    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Proof, null), /*#__PURE__*/React.createElement(Difference, null), /*#__PURE__*/React.createElement(Services, null), /*#__PURE__*/React.createElement(Tech, null), /*#__PURE__*/React.createElement(Tracks, null), /*#__PURE__*/React.createElement(Why, null), /*#__PURE__*/React.createElement(Work, null), /*#__PURE__*/React.createElement(Contact, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/home-sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/pillar-sections.jsx
try { (() => {
/* Quest Digital — Service pillar DETAIL pages.
   One content-driven template; the pillar is chosen via <App pillar="web" />.
   Consumes home-base.jsx (Header / Footer / Reveal / Eyebrow / Icon). */

const {
  A,
  TEAL,
  TEAL_HEX,
  INK,
  INK2,
  INK3,
  Reveal,
  Icon,
  Eyebrow,
  Header,
  Footer
} = window;

/* ─────────────────────────────  DATA  ───────────────────────────── */

const PILLARS = {
  web: {
    key: "web",
    n: "01",
    icon: "code-2",
    primary: true,
    href: "service-web.html",
    name: "Web, Software and Apps",
    tagline: "We design and build the digital things people actually use.",
    lead: "Our primary capability — from large enterprise platforms to fast, lightweight sites for small businesses. We choose the right technology, not the easiest one.",
    facts: [["Pricing", "Project-based"], ["Two tracks", "Enterprise & small business"], ["Delivery", "UK & remote"]],
    included: [{
      label: "Enterprise & complex builds",
      items: ["Bespoke software and internal business systems", "Web applications and client portals", "Mobile applications (iOS and Android)", "API integrations and third-party connectivity", "Legacy system modernisation", "E-commerce for complex, high-volume operations"]
    }, {
      label: "Small business & smart sites",
      items: ["Fast Next.js & React sites — no bloat", "WordPress where it genuinely fits", "Built-in booking, inventory & stock logging", "Customer portals done properly", "E-commerce via Shopify, WooCommerce or custom", "CMS integration and content setup"]
    }],
    approach: [{
      icon: "wrench",
      title: "Right tool for the job",
      desc: "We assess what you actually need, then choose the technology — not the other way round."
    }, {
      icon: "shield",
      title: "Built to last",
      desc: "Properly engineered foundations, not plugins fighting each other. Things that still work in three years."
    }, {
      icon: "users",
      title: "Direct access",
      desc: "You talk to the people building it. No account-manager layer between you and the work."
    }],
    pricing: {
      kind: "model",
      model: "Project-based",
      note: "We scope requirements properly before quoting. We don't do fixed packages for bespoke build — scope varies too much. We'd rather give an honest quote than an arbitrary package that doesn't fit.",
      chips: ["Proper scoping first", "Honest quotes", "No arbitrary packages"]
    },
    techLabel: "Technology",
    tech: ["Next.js", "React", "Ruby on Rails", ".NET", "PHP", "WordPress", "Flutter", "Payload CMS", "Stripe"],
    whoFor: [{
      title: "Enterprise & complex platforms",
      desc: "Large organisations needing bespoke software, portals or internal systems — including regulated sectors where ISO 27001 is a genuine advantage."
    }, {
      title: "Small business & smart sites",
      desc: "SMEs who've outgrown WordPress and want booking, inventory or portals done properly — not bolted on with plugins."
    }],
    work: [{
      tag: "Booking & patient portal",
      meta: "Healthcare · Next.js platform"
    }, {
      tag: "Stock management system",
      meta: "Retail · Bespoke web app"
    }],
    ctaTitle: "Got a build in mind?",
    ctaSub: "Tell us what you're trying to make. We'll scope it honestly."
  },
  hosting: {
    key: "hosting",
    n: "02",
    icon: "server",
    primary: false,
    href: "service-hosting.html",
    name: "Hosting and Managed Services",
    tagline: "We keep it running — securely, reliably, and without you thinking about it.",
    lead: "Most agencies build your site and walk away. We don't. Fully managed hosting means we own the uptime, the security, the maintenance and the support.",
    facts: [["Plans", "Three tiers"], ["Security", "ISO 27001 certified"], ["Support", "Incident response"]],
    included: [{
      label: null,
      items: ["Managed web hosting", "Domain registration & DNS management", "SSL certificate management", "Security monitoring and patching", "Platform updates and CMS maintenance", "Regular backups and disaster recovery", "Technical support and incident response", "Performance monitoring"]
    }],
    approach: [{
      icon: "circle-check-big",
      title: "We own it",
      desc: "Uptime, security, maintenance and support — all ours, not your problem to manage."
    }, {
      icon: "shield-check",
      title: "Secure by standard",
      desc: "ISO 27001 certified infrastructure and proactive patching, not reactive firefighting."
    }, {
      icon: "layers",
      title: "Under one roof",
      desc: "Build, host and market with one partner. One number to call when it matters."
    }],
    pricing: {
      kind: "tiers",
      eyebrow: "Plans & pricing",
      note: "Monthly plans, tiered by resources and SLA. Specific pricing on enquiry — plans are scoped to what you're actually running.",
      tiers: [{
        name: "Essentials",
        best: "Small business sites",
        includes: ["Managed hosting & SSL", "Monthly maintenance", "Email support", "Regular backups"]
      }, {
        name: "Business",
        best: "Growing businesses & e-commerce",
        featured: true,
        includes: ["Everything in Essentials", "Priority support", "Enhanced backups", "Uptime monitoring"]
      }, {
        name: "Enterprise",
        best: "Applications, portals & regulated clients",
        includes: ["Everything in Business", "Dedicated resource", "SLA guarantee", "Security reporting"]
      }]
    },
    techLabel: "Infrastructure",
    tech: ["Docker", "Coolify", "Vercel", "Cloudflare", "ISO 27001 infra"],
    whoFor: [{
      title: "Clients we've built for",
      desc: "Everything we make can sit under one roof — we own the uptime, the security and the support, so you don't think about it."
    }, {
      title: "Regulated industries",
      desc: "ISO 27001 certified infrastructure, suitable for healthcare, legal and financial-services clients."
    }, {
      title: "Anyone left to fend for themselves",
      desc: "If your last agency built it and vanished, we're the opposite. We stay for the long term."
    }],
    work: [{
      tag: "Zero-downtime migration",
      meta: "Legal · Managed platform move"
    }, {
      tag: "Regulated infrastructure",
      meta: "Finance · ISO 27001 hosting"
    }],
    ctaTitle: "Tired of being left to fend for yourself?",
    ctaSub: "Let us take hosting, security and support off your plate for good."
  },
  marketing: {
    key: "marketing",
    n: "03",
    icon: "trending-up",
    primary: false,
    href: "service-marketing.html",
    name: "Marketing and Growth",
    tagline: "We make sure people find you — and that when they do, they convert.",
    lead: "A great website is the start, not the finish. We handle the ongoing work of digital marketing: SEO, paid campaigns, social and email. Performance-led, not vanity-led.",
    facts: [["Pricing", "Monthly retainer"], ["Approach", "Performance-led"], ["Reporting", "Monthly, clear"]],
    included: [{
      label: null,
      items: ["Search engine optimisation — technical, on-page & off-page", "Google Ads and paid search (PPC)", "Paid social advertising", "Social media management and content", "Email marketing — strategy, design & automation", "Analytics setup and reporting", "Content strategy"]
    }],
    approach: [{
      icon: "target",
      title: "Performance-led",
      desc: "We measure what matters — enquiries and revenue, not vanity metrics that look good in a slide."
    }, {
      icon: "file-text",
      title: "Honest reporting",
      desc: "Clear monthly reporting you can actually read. No smoke, no mirrors, no jargon."
    }, {
      icon: "zap",
      title: "Solid foundations",
      desc: "Marketing works better on a fast, well-built site. We do both, so the two pull together."
    }],
    pricing: {
      kind: "tiers",
      eyebrow: "Retainer tiers",
      note: "Monthly retainer, tiered by activity level. Exact pricing on enquiry — retainer scope is shaped to the client.",
      tiers: [{
        name: "Foundation",
        best: "Establishing a baseline",
        includes: ["Core SEO", "Technical & on-page", "Monthly reporting", "Search Console setup"]
      }, {
        name: "Growth",
        best: "Actively seeking leads",
        featured: true,
        includes: ["Everything in Foundation", "One paid channel", "Social management", "Conversion tracking"]
      }, {
        name: "Accelerate",
        best: "Ready to scale",
        includes: ["Everything in Growth", "Full paid media", "Email automation", "Content strategy"]
      }]
    },
    techLabel: "Tools & platforms",
    tech: ["Google Ads", "GA4", "Search Console", "Meta Ads", "Klaviyo", "SEO"],
    whoFor: [{
      title: "Sites that aren't converting",
      desc: "Businesses with a website that simply isn't generating enough enquiries to justify it."
    }, {
      title: "Teams without a marketer",
      desc: "Businesses that want consistent, measurable digital marketing without hiring someone in-house."
    }],
    work: [{
      tag: "Lead-gen SEO campaign",
      meta: "B2B services · enquiry growth"
    }, {
      tag: "Paid social launch",
      meta: "E-commerce · ROAS focus"
    }],
    ctaTitle: "Want more enquiries from your site?",
    ctaSub: "Let's build a marketing engine that actually performs — and prove it monthly."
  },
  brand: {
    key: "brand",
    n: "04",
    icon: "palette",
    primary: false,
    href: "service-brand.html",
    name: "Brand and Design",
    tagline: "We build the visual identity that everything else sits on.",
    lead: "Great digital work starts with a clear identity. We offer brand as a supporting capability — because a software or web project often needs it, and we're good at it.",
    facts: [["Offer", "Supporting capability"], ["Pricing", "Project-based"], ["Output", "Digital & print"]],
    included: [{
      label: null,
      items: ["Logo design and full visual identity", "Brand guidelines and style documentation", "Brand refresh and evolution projects", "Print design — brochures, stationery, signage", "Marketing collateral and campaign assets", "Presentation templates"]
    }],
    approach: [{
      icon: "shapes",
      title: "Design that translates",
      desc: "Identity built to work properly in the digital products and sites it's made from — not just on a logo sheet."
    }, {
      icon: "sparkles",
      title: "Looks great, works great",
      desc: "We don't separate creativity from technology. For us, good design and good engineering are the same conversation."
    }, {
      icon: "package",
      title: "Everything in one place",
      desc: "Brand, build and marketing from one studio. No briefing three different suppliers."
    }],
    pricing: {
      kind: "model",
      model: "Project-based",
      note: "Brand is a supporting capability — we offer it because projects often need it, and because we're good at it. Quoted per project, and frequently bundled with a web or software build.",
      chips: ["Per project", "Often bundled with a build", "Digital & print"]
    },
    techLabel: "Tools",
    tech: ["Figma", "Adobe Creative Suite", "Print production"],
    whoFor: [{
      title: "Existing clients",
      desc: "Who need brand work alongside a build or marketing project, without going elsewhere for it."
    }, {
      title: "Starting from scratch",
      desc: "Businesses who want everything — identity, site and marketing — in one place, from one team."
    }],
    work: [{
      tag: "Identity & guidelines",
      meta: "Group rebrand · Full system"
    }, {
      tag: "Print & collateral",
      meta: "Healthcare · Signage & stationery"
    }],
    ctaTitle: "Need an identity that works as hard as you do?",
    ctaSub: "Let's give your business a look that lasts — and translates everywhere."
  }
};
const ORDER = ["web", "hosting", "marketing", "brand"];

/* ─────────────────────────────  PRIMITIVES  ───────────────────────────── */

function PrimaryBtn({
  href = "contact.html",
  children,
  dark = false
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 600,
      color: INK,
      background: TEAL_HEX,
      padding: "16px 30px",
      borderRadius: "999px",
      textDecoration: "none",
      transform: h ? "translateY(-2px)" : "translateY(0)",
      transition: "transform var(--dur) var(--ease)"
    }
  }, children, " ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18
  }));
}
function GhostBtn({
  href = "#",
  children
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 500,
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.32)",
      background: h ? "rgba(255,255,255,0.1)" : "transparent",
      padding: "15px 28px",
      borderRadius: "999px",
      textDecoration: "none",
      transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease)"
    }
  }, children);
}

/* ─────────────────────────────  HERO  ───────────────────────────── */

function PillarHero({
  p
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff",
      paddingTop: "150px",
      paddingBottom: "96px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-28%",
      right: "-12%",
      width: "58vw",
      height: "58vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.20) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "-26%",
      left: "-14%",
      width: "48vw",
      height: "48vw",
      background: "radial-gradient(circle, rgba(43,123,185,0.20) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "0 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "13.5px",
      fontWeight: 500,
      color: "rgba(255,255,255,0.6)",
      marginBottom: "30px"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "services.html",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      color: "rgba(255,255,255,0.7)",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Services"), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.4
    }
  }, "/"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX
    }
  }, "Pillar ", p.n)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.55fr 1fr",
      gap: "64px",
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      marginBottom: "24px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "58px",
      height: "58px",
      borderRadius: "14px",
      background: "rgba(42,179,192,0.14)",
      border: "1px solid rgba(42,179,192,0.3)",
      color: TEAL_HEX
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: p.icon,
    size: 28
  })), p.primary && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      background: "rgba(42,179,192,0.14)",
      padding: "6px 13px",
      borderRadius: "999px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "5px",
      height: "5px",
      borderRadius: "50%",
      background: TEAL_HEX
    }
  }), " Primary capability")), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 22px",
      fontWeight: 700,
      fontSize: "clamp(40px, 5.4vw, 72px)",
      letterSpacing: "-0.025em",
      lineHeight: 1.02
    }
  }, p.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 18px",
      fontSize: "22px",
      fontWeight: 300,
      lineHeight: 1.5,
      color: "#fff",
      maxWidth: "30ch"
    }
  }, p.tagline), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 38px",
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: "rgba(255,255,255,0.74)",
      maxWidth: "52ch"
    }
  }, p.lead), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "14px",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    href: "contact.html"
  }, "Start a project"), /*#__PURE__*/React.createElement(GhostBtn, {
    href: "#work"
  }, "See selected work"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "1px",
      background: "rgba(255,255,255,0.1)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "16px",
      overflow: "hidden"
    }
  }, p.facts.map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      background: INK2,
      padding: "22px 26px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "8px"
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "20px",
      fontWeight: 500,
      color: "#fff",
      letterSpacing: "-0.01em"
    }
  }, v))))))));
}

/* ─────────────────────────────  WHAT'S INCLUDED  ───────────────────────────── */

function CheckItem({
  children
}) {
  return /*#__PURE__*/React.createElement("li", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      fontSize: "16px",
      fontWeight: 400,
      color: "var(--quest-body)",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      marginTop: "3px",
      color: TEAL_HEX
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16
  })), children);
}
function Included({
  p
}) {
  const grouped = p.included.length > 1;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "What's included"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 54px",
      fontSize: "clamp(30px, 3.6vw, 46px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.1,
      color: "var(--quest-heading)",
      maxWidth: "20ch"
    }
  }, "Everything this pillar covers.")), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.06
  }, grouped ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "30px"
    }
  }, p.included.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.label,
    style: {
      border: "1px solid var(--quest-border)",
      borderRadius: "18px",
      padding: "34px 34px 38px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "22px"
    }
  }, g.label), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "15px"
    }
  }, g.items.map(it => /*#__PURE__*/React.createElement(CheckItem, {
    key: it
  }, it)))))) : /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px 56px"
    }
  }, p.included[0].items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "13px",
      padding: "16px 0",
      borderTop: "1px solid var(--quest-border)",
      fontSize: "17px",
      fontWeight: 400,
      color: "var(--quest-heading)",
      lineHeight: 1.45
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      marginTop: "2px",
      color: TEAL_HEX
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 17
  })), it))))));
}

/* ─────────────────────────────  APPROACH  ───────────────────────────── */

function Approach({
  p
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--quest-surface-alt)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "How we work"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 54px",
      fontSize: "clamp(30px, 3.6vw, 46px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.1,
      color: "var(--quest-heading)",
      maxWidth: "18ch"
    }
  }, "What you can count on.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "22px"
    }
  }, p.approach.map((a, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: a.title,
    delay: 0.05 * i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--quest-border)",
      borderRadius: "18px",
      padding: "34px 32px 36px",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "50px",
      height: "50px",
      borderRadius: "12px",
      background: "rgba(42,179,192,0.12)",
      color: TEAL_HEX,
      marginBottom: "22px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: a.icon,
    size: 23
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 12px",
      fontSize: "20px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "var(--quest-heading)"
    }
  }, a.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)"
    }
  }, a.desc)))))));
}

/* ─────────────────────────────  PRICING  ───────────────────────────── */

function Pricing({
  p
}) {
  const pr = p.pricing;
  if (pr.kind === "tiers") {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: "#fff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "100px 40px"
      }
    }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
      style: {
        marginBottom: "22px"
      }
    }, pr.eyebrow), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "40px",
        flexWrap: "wrap",
        marginBottom: "50px"
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: "clamp(30px, 3.6vw, 46px)",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        color: "var(--quest-heading)",
        maxWidth: "16ch"
      }
    }, "Plans scoped to what you run."), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: "16px",
        fontWeight: 300,
        lineHeight: 1.6,
        color: "var(--quest-body)",
        maxWidth: "400px"
      }
    }, pr.note))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "22px",
        alignItems: "stretch"
      }
    }, pr.tiers.map((t, i) => /*#__PURE__*/React.createElement(Reveal, {
      key: t.name,
      delay: 0.05 * i
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "18px",
        padding: "34px 32px 34px",
        background: t.featured ? INK : "#fff",
        border: t.featured ? "none" : "2px solid var(--quest-border)",
        boxShadow: t.featured ? "0 28px 60px -34px rgba(14,36,64,0.55)" : "none"
      }
    }, t.featured && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: 0,
        left: "32px",
        right: "32px",
        height: "3px",
        background: TEAL_HEX,
        borderRadius: "0 0 3px 3px"
      }
    }), t.featured && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: "20px",
        right: "24px",
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: TEAL_HEX
      }
    }, "Most popular"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: TEAL_HEX,
        marginBottom: "10px"
      }
    }, t.best), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "27px",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: t.featured ? "#fff" : "var(--quest-heading)",
        marginBottom: "18px"
      }
    }, t.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: "8px",
        paddingBottom: "22px",
        marginBottom: "22px",
        borderBottom: `1px solid ${t.featured ? "rgba(255,255,255,0.14)" : "var(--quest-border)"}`
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "22px",
        fontWeight: 700,
        color: t.featured ? "#fff" : "var(--quest-heading)"
      }
    }, "On enquiry")), /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: "none",
        margin: "0 0 28px",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "13px",
        flex: 1
      }
    }, t.includes.map(it => /*#__PURE__*/React.createElement("li", {
      key: it,
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: "11px",
        fontSize: "15px",
        fontWeight: 400,
        lineHeight: 1.45,
        color: t.featured ? "rgba(255,255,255,0.86)" : "var(--quest-body)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flexShrink: 0,
        marginTop: "2px",
        color: TEAL_HEX
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 15
    })), it))), /*#__PURE__*/React.createElement("a", {
      href: "contact.html",
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontSize: "15px",
        fontWeight: 600,
        padding: "13px 20px",
        borderRadius: "999px",
        textDecoration: "none",
        background: t.featured ? TEAL_HEX : "transparent",
        color: t.featured ? INK : INK,
        border: t.featured ? "none" : `1.5px solid ${INK}`,
        transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)"
      },
      onMouseEnter: e => {
        if (!t.featured) {
          e.currentTarget.style.background = INK;
          e.currentTarget.style.color = "#fff";
        }
      },
      onMouseLeave: e => {
        if (!t.featured) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = INK;
        }
      }
    }, "Get a quote ", /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 15
    }))))))));
  }
  /* model callout (web, brand) */
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff",
      borderRadius: "22px",
      padding: "56px 56px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-40%",
      right: "-6%",
      width: "34vw",
      height: "34vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.18) 0%, transparent 64%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "1fr 1.2fr",
      gap: "48px",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "16px"
    }
  }, "How we price"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "clamp(34px, 3.4vw, 48px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.05
    }
  }, pr.model), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "9px",
      marginTop: "26px"
    }
  }, pr.chips.map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      fontSize: "13px",
      fontWeight: 500,
      color: "rgba(255,255,255,0.9)",
      border: "1px solid rgba(255,255,255,0.22)",
      padding: "8px 15px",
      borderRadius: "999px"
    }
  }, c)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 28px",
      fontSize: "18px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: "rgba(255,255,255,0.84)"
    }
  }, pr.note), /*#__PURE__*/React.createElement(PrimaryBtn, {
    href: "contact.html"
  }, "Get an honest quote")))))));
}

/* ─────────────────────────────  WHO IT'S FOR  ───────────────────────────── */

function WhoFor({
  p
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--quest-surface-alt)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "Who it's for"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 50px",
      fontSize: "clamp(30px, 3.6vw, 46px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.1,
      color: "var(--quest-heading)",
      maxWidth: "18ch"
    }
  }, "Built for clients like these.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: p.whoFor.length === 3 ? "repeat(3, 1fr)" : "1fr 1fr",
      gap: "22px"
    }
  }, p.whoFor.map((w, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: w.title,
    delay: 0.05 * i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--quest-border)",
      borderRadius: "18px",
      padding: "34px 34px 36px",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px",
      borderRadius: "999px",
      background: "rgba(42,179,192,0.12)",
      color: TEAL_HEX,
      marginBottom: "20px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 19
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 12px",
      fontSize: "20px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "var(--quest-heading)"
    }
  }, w.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "var(--quest-body)"
    }
  }, w.desc)))))));
}

/* ─────────────────────────────  TECH BAND  ───────────────────────────── */

function TechBand({
  p
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "84px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "0.8fr 1.4fr",
      gap: "48px",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "18px"
    }
  }, p.techLabel), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "clamp(26px, 2.8vw, 36px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.12
    }
  }, "The right tool, not the familiar one.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "10px"
    }
  }, p.tech.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontSize: "15px",
      fontWeight: 500,
      color: "rgba(255,255,255,0.92)",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.14)",
      padding: "11px 20px",
      borderRadius: "999px"
    }
  }, t)))))));
}

/* ─────────────────────────────  SELECTED WORK (placeholder)  ───────────────────────────── */

function WorkProof({
  p
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: "work",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "30px",
      flexWrap: "wrap",
      marginBottom: "44px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "Selected work"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "clamp(30px, 3.6vw, 46px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.1,
      color: "var(--quest-heading)"
    }
  }, "Proof, not promises.")), /*#__PURE__*/React.createElement("a", {
    href: "work.html",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "9px",
      fontSize: "15px",
      fontWeight: 600,
      color: INK,
      textDecoration: "none"
    }
  }, "View all work ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX
    }
  }, "\u2192")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px"
    }
  }, p.work.map((w, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: w.tag,
    delay: 0.06 * i
  }, /*#__PURE__*/React.createElement("a", {
    href: "work.html",
    style: {
      display: "block",
      textDecoration: "none",
      borderRadius: "20px",
      overflow: "hidden",
      border: "1px solid var(--quest-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      aspectRatio: "16 / 9",
      background: "repeating-linear-gradient(135deg,#eef2f6,#eef2f6 11px,#e3e9f0 11px,#e3e9f0 22px)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: "14px",
      left: "14px",
      fontSize: "11px",
      fontWeight: 500,
      fontFamily: "var(--font-mono, ui-monospace, monospace)",
      letterSpacing: "0.04em",
      color: "#6a7889",
      background: "rgba(255,255,255,0.85)",
      padding: "6px 10px",
      borderRadius: "6px"
    }
  }, "case study \xB7 16:9")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 26px 28px",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "9px"
    }
  }, w.meta), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: "21px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "var(--quest-heading)"
    }
  }, w.tag), /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX,
      fontSize: "18px"
    }
  }, "\u2192")))))))));
}

/* ─────────────────────────────  PAIRED WITH  ───────────────────────────── */

function PairedWith({
  p
}) {
  const others = ORDER.filter(k => k !== p.key).map(k => PILLARS[k]);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--quest-surface-alt)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "Works well with"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 12px",
      fontSize: "clamp(30px, 3.6vw, 46px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.1,
      color: "var(--quest-heading)"
    }
  }, "Most clients stay for more than one."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 48px",
      fontSize: "18px",
      fontWeight: 300,
      color: "var(--quest-body)",
      maxWidth: "52ch"
    }
  }, "Brand, build, hosting and marketing under one roof \u2014 no handoffs, no gaps.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "22px"
    }
  }, others.map((o, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: o.key,
    delay: 0.05 * i
  }, /*#__PURE__*/React.createElement("a", {
    href: o.href,
    style: {
      display: "block",
      height: "100%",
      background: "#fff",
      border: "1px solid var(--quest-border)",
      borderRadius: "18px",
      padding: "30px 30px 32px",
      textDecoration: "none",
      transition: "transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 16px 40px rgba(33,75,127,0.12)";
      e.currentTarget.style.borderColor = "rgba(42,179,192,0.5)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "var(--quest-border)";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "13px",
      marginBottom: "18px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "44px",
      height: "44px",
      borderRadius: "12px",
      background: "rgba(42,179,192,0.12)",
      color: TEAL_HEX
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: o.icon,
    size: 21
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: TEAL_HEX
    }
  }, o.n)), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 9px",
      fontSize: "19px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "var(--quest-heading)"
    }
  }, o.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 18px",
      fontSize: "15px",
      fontWeight: 300,
      lineHeight: 1.55,
      color: "var(--quest-body)"
    }
  }, o.tagline), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px",
      fontWeight: 600,
      color: INK
    }
  }, "Explore ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX
    }
  }, "\u2192"))))))));
}

/* ─────────────────────────────  FINAL CTA  ───────────────────────────── */

function FinalCTA({
  p
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-30%",
      left: "50%",
      transform: "translateX(-50%)",
      width: "60vw",
      height: "60vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "110px 40px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "26px",
      justifyContent: "center"
    }
  }, "Let's talk"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 auto 18px",
      fontSize: "clamp(32px, 4.4vw, 58px)",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.04,
      maxWidth: "20ch"
    }
  }, p.ctaTitle), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 auto 38px",
      fontSize: "19px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.78)",
      maxWidth: "52ch"
    }
  }, p.ctaSub), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "14px",
      flexWrap: "wrap",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    href: "contact.html"
  }, "Start a conversation"), /*#__PURE__*/React.createElement(GhostBtn, {
    href: "services.html"
  }, "Explore all services")))));
}

/* ─────────────────────────────  APP  ───────────────────────────── */

function App({
  pillar
}) {
  const key = pillar || window.PILLAR_KEY || "web";
  const p = PILLARS[key] || PILLARS.web;
  React.useEffect(() => {
    document.title = `Quest Digital — ${p.name}`;
    const draw = () => {
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    };
    draw();
    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, [key]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement(PillarHero, {
    p: p
  }), /*#__PURE__*/React.createElement(Included, {
    p: p
  }), /*#__PURE__*/React.createElement(Approach, {
    p: p
  }), /*#__PURE__*/React.createElement(Pricing, {
    p: p
  }), /*#__PURE__*/React.createElement(WhoFor, {
    p: p
  }), /*#__PURE__*/React.createElement(TechBand, {
    p: p
  }), /*#__PURE__*/React.createElement(WorkProof, {
    p: p
  }), /*#__PURE__*/React.createElement(PairedWith, {
    p: p
  }), /*#__PURE__*/React.createElement(FinalCTA, {
    p: p
  }), /*#__PURE__*/React.createElement(Footer, null));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/pillar-sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/services-sections.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Quest Digital — Services page sections */
const {
  A,
  TEAL,
  TEAL_HEX,
  INK,
  INK2,
  INK3,
  Reveal,
  Icon,
  Eyebrow,
  Header,
  Footer
} = window;

/* ── shared mini-link ── */
function ArrowLink({
  children,
  href = "#",
  dark = false
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "15px",
      fontWeight: 600,
      color: dark ? "#fff" : "var(--quest-heading)",
      textDecoration: "none"
    }
  }, children, /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX,
      transform: h ? "translateX(6px)" : "translateX(0)",
      transition: "transform 0.4s var(--ease)"
    }
  }, "\u2192"));
}

/* ── Hero ── */
function ServiceHero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff",
      paddingTop: "160px",
      paddingBottom: "110px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-30%",
      right: "-10%",
      width: "60vw",
      height: "60vw",
      background: "radial-gradient(circle, rgba(42,179,192,0.18) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: "-20%",
      left: "-14%",
      width: "50vw",
      height: "50vw",
      background: "radial-gradient(circle, rgba(43,123,185,0.22) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "0 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "28px"
    }
  }, "What we do"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 24px",
      fontWeight: 700,
      fontSize: "clamp(44px, 6vw, 82px)",
      letterSpacing: "-0.025em",
      lineHeight: 1.0,
      maxWidth: "14ch"
    }
  }, "Four pillars. One studio."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 36px",
      fontSize: "20px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.82)",
      maxWidth: "560px"
    }
  }, "Brand, build, hosting and marketing under one roof. No handoffs, no gaps. Most clients come to us for one thing and stay for all four."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "14px",
      flexWrap: "wrap"
    }
  }, [["Web, Software and Apps", "#web"], ["Hosting", "#hosting"], ["Marketing", "#marketing"], ["Brand", "#brand"]].map(([l, h]) => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: h,
    style: {
      fontSize: "14px",
      fontWeight: 500,
      color: "rgba(255,255,255,0.9)",
      border: "1px solid rgba(255,255,255,0.28)",
      padding: "9px 18px",
      borderRadius: "999px",
      textDecoration: "none",
      transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.1)";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
    }
  }, l))))));
}

/* ── Single pillar row — full-width band, alternating tint, consistent rhythm ── */
function PillarRow({
  id,
  n,
  icon,
  title,
  desc,
  features,
  tech,
  tint,
  primary,
  href
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      background: tint ? "var(--quest-surface-alt)" : "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "76px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "92px 1fr 360px",
      gap: "56px",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "15px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      color: TEAL_HEX
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "48px",
      height: "48px",
      borderRadius: "12px",
      background: h ? TEAL : "rgba(42,179,192,0.12)",
      color: h ? INK : TEAL_HEX,
      transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  }))), /*#__PURE__*/React.createElement("div", null, primary && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      background: "rgba(42,179,192,0.12)",
      padding: "5px 12px",
      borderRadius: "999px",
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "5px",
      height: "5px",
      borderRadius: "50%",
      background: TEAL_HEX
    }
  }), "Primary capability"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 16px",
      fontSize: "30px",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      lineHeight: 1.12,
      color: "var(--quest-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 26px",
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: "var(--quest-body)",
      maxWidth: "520px"
    }
  }, desc), /*#__PURE__*/React.createElement(ArrowLink, {
    href: href
  }, "Explore ", title)), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: "4px"
    }
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: "0 0 24px",
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "11px"
    }
  }, features.map(f => /*#__PURE__*/React.createElement("li", {
    key: f,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "11px",
      fontSize: "15px",
      fontWeight: 400,
      color: "var(--quest-body)",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      marginTop: "3px",
      color: TEAL_HEX
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15
  })), f))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px"
    }
  }, tech.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontSize: "12.5px",
      fontWeight: 600,
      letterSpacing: "0.04em",
      color: INK,
      background: "rgba(42,179,192,0.16)",
      padding: "6px 13px",
      borderRadius: "999px"
    }
  }, t)))))));
}
const PILLARS = [{
  id: "web",
  n: "01",
  icon: "code-2",
  title: "Web, Software and Apps",
  flip: false,
  href: "service-web.html",
  desc: "Our primary capability. We design and build digital products that perform — from large enterprise platforms to fast, lightweight sites for small businesses. We choose the right technology, not the easiest one.",
  features: ["Bespoke web applications and internal systems", "Client portals and multi-user platforms", "E-commerce for complex or high-volume operations", "Mobile applications (iOS and Android via Flutter)", "API integrations and third-party connectivity", "Legacy system modernisation"],
  tech: ["Next.js", "React", "Ruby on Rails", ".NET", "PHP", "WordPress", "Flutter"]
}, {
  id: "hosting",
  n: "02",
  icon: "server",
  title: "Hosting and Managed Services",
  flip: true,
  href: "service-hosting.html",
  desc: "We don't build things and disappear. Fully managed hosting means we own the uptime, the security, the maintenance and the support. For clients who also use us for build or marketing, everything sits under one roof.",
  features: ["Managed web hosting and domain management", "SSL certificate management and security monitoring", "Regular backups and disaster recovery", "CMS maintenance and platform updates", "Technical support and incident response", "Performance monitoring and SLA options"],
  tech: ["Docker", "Coolify", "Vercel", "ISO 27001 infra"]
}, {
  id: "marketing",
  n: "03",
  icon: "trending-up",
  title: "Marketing and Growth",
  flip: false,
  href: "service-marketing.html",
  desc: "A great website is the start, not the finish. We handle the ongoing work of digital marketing — the SEO, the paid campaigns, the social presence, the email flows. Performance-led, not vanity-led.",
  features: ["Search engine optimisation (SEO): technical, on-page, off-page", "Google Ads and paid search (PPC)", "Paid social advertising", "Social media management and content", "Email marketing strategy, design and automation", "Analytics setup, reporting and content strategy"],
  tech: ["Google Ads", "SEO", "Paid Social", "Email", "Analytics"]
}, {
  id: "brand",
  n: "04",
  icon: "palette",
  title: "Brand and Design",
  flip: true,
  href: "service-brand.html",
  desc: "Great digital work starts with a clear visual identity. We offer brand as a supporting capability — because a software or web project often needs it, and we're good at it. Clients should not need to go elsewhere for it.",
  features: ["Logo design and full visual identity", "Brand guidelines and style documentation", "Brand refresh and evolution projects", "Print design: brochures, stationery, signage", "Marketing collateral and campaign assets", "Presentation templates"],
  tech: ["Figma", "Adobe CC", "Print production"]
}];
function PillarsDeep() {
  return /*#__PURE__*/React.createElement("div", null, PILLARS.map((p, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: p.id,
    delay: 0
  }, /*#__PURE__*/React.createElement(PillarRow, _extends({}, p, {
    tint: i % 2 === 1,
    primary: i === 0
  })))));
}

/* ── Right tool section ── */
function RightTool() {
  const cats = [{
    label: "Modern web",
    items: ["Next.js", "React", "Tailwind"]
  }, {
    label: "Established platforms",
    items: ["WordPress", "PHP", ".NET"]
  }, {
    label: "Application dev",
    items: ["Ruby on Rails", "Node.js", "REST APIs"]
  }, {
    label: "Mobile",
    items: ["Flutter", "Dart", "iOS / Android"]
  }, {
    label: "Infrastructure",
    items: ["Docker", "Coolify", "Vercel"]
  }, {
    label: "Content and payments",
    items: ["Payload CMS", "Stripe", "Xero"]
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "22px"
    }
  }, "Technology"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "40px",
      flexWrap: "wrap",
      marginBottom: "56px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "clamp(32px, 4.2vw, 54px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.08
    }
  }, "We use what\u2019s right for the job, not what\u2019s familiar."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.65,
      color: "rgba(255,255,255,0.78)",
      maxWidth: "380px"
    }
  }, "Genuine in-house experience across a wide range of technologies. We make informed recommendations, not comfortable ones."))), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.08
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "16px"
    }
  }, cats.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.label,
    style: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "14px",
      padding: "26px 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "14px"
    }
  }, c.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }
  }, c.items.map(it => /*#__PURE__*/React.createElement("span", {
    key: it,
    style: {
      fontSize: "16px",
      fontWeight: 400,
      color: "rgba(255,255,255,0.9)"
    }
  }, it)))))))));
}

/* ── Two tracks callout ── */
function TracksCallout() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--quest-surface-alt)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: "22px"
    }
  }, "Two client tracks"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 14px",
      fontSize: "clamp(32px, 4.2vw, 52px)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      color: "var(--quest-heading)"
    }
  }, "Which best describes you?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 52px",
      fontSize: "18px",
      fontWeight: 300,
      color: "var(--quest-body)"
    }
  }, "Different scales, the same level of care.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "22px"
    }
  }, [{
    title: "Enterprise and complex platforms",
    sub: "Bespoke software, portals, integrations and compliance-grade infrastructure for large organisations.",
    href: "enterprise.html",
    dark: true
  }, {
    title: "Small business",
    sub: "Fast, properly engineered sites with booking, stock and portals built in. You don't have to be large to get enterprise quality.",
    href: "small-business.html",
    dark: false
  }].map(t => /*#__PURE__*/React.createElement(Reveal, {
    key: t.title,
    delay: 0.06
  }, /*#__PURE__*/React.createElement("a", {
    href: t.href,
    style: {
      display: "block",
      padding: "40px 38px",
      borderRadius: "18px",
      background: t.dark ? INK : "#fff",
      border: t.dark ? "none" : "2px solid var(--quest-border)",
      textDecoration: "none",
      transition: "transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = t.dark ? "0 24px 48px rgba(14,36,64,0.28)" : "0 14px 36px rgba(33,75,127,0.12)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: TEAL_HEX,
      marginBottom: "16px"
    }
  }, t.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 28px",
      fontSize: "17px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: t.dark ? "rgba(255,255,255,0.82)" : "var(--quest-body)"
    }
  }, t.sub), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px",
      fontWeight: 600,
      color: t.dark ? "#fff" : INK
    }
  }, "Find out more ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX
    }
  }, "\u2192"))))))));
}

/* ── CTA ── */
function ServiceCTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "32px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "clamp(28px, 3.6vw, 48px)",
      fontWeight: 700,
      letterSpacing: "-0.02em"
    }
  }, "Not sure where to start?", /*#__PURE__*/React.createElement("br", null), "We can help you figure it out.")), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.1
  }, /*#__PURE__*/React.createElement("a", {
    href: "contact.html",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 600,
      color: INK,
      background: TEAL_HEX,
      padding: "18px 32px",
      borderRadius: "999px",
      textDecoration: "none",
      whiteSpace: "nowrap",
      transition: "transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.transform = "translateY(-2px)",
    onMouseLeave: e => e.currentTarget.style.transform = "translateY(0)"
  }, "Start a conversation ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18
  })))));
}
function App() {
  React.useEffect(() => {
    const draw = () => {
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    };
    draw();
    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement(ServiceHero, null), /*#__PURE__*/React.createElement(PillarsDeep, null), /*#__PURE__*/React.createElement(RightTool, null), /*#__PURE__*/React.createElement(TracksCallout, null), /*#__PURE__*/React.createElement(ServiceCTA, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/services-sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/digital/work-sections.jsx
try { (() => {
/* Quest Digital — Work page sections */
const {
  A,
  TEAL,
  TEAL_HEX,
  INK,
  INK2,
  INK3,
  Reveal,
  Icon,
  Eyebrow,
  Header,
  Footer
} = window;
const CASES = [{
  img: `${A}/images/healthcare.jpg`,
  sector: "Healthcare",
  service: "web",
  track: "enterprise",
  title: "Patient booking portal",
  desc: "Replaced a stack of spreadsheets with a self-service booking and patient management system that cut admin time significantly."
}, {
  img: `${A}/images/asset-management.jpg`,
  sector: "Logistics",
  service: "web",
  track: "enterprise",
  title: "Fleet live dashboard",
  desc: "Real-time tracking dashboard giving an entire delivery operation full visibility — location, jobs and status in one view."
}, {
  img: `${A}/images/partnership.jpg`,
  sector: "Professional Services",
  service: "web",
  track: "small",
  title: "Marketing site and CMS",
  desc: "Fast, lightweight Next.js site the team can edit and run themselves, replacing a slow, plugin-heavy WordPress setup."
}, {
  img: `${A}/images/mobile-ct.jpg`,
  sector: "Healthcare",
  service: "web",
  track: "enterprise",
  title: "Mobile diagnostics platform",
  desc: "Specialist booking and information platform for mobile CT and MRI diagnostic services across multiple sites."
}, {
  img: `${A}/images/hero-units.jpg`,
  sector: "Manufacturing",
  service: "brand",
  track: "small",
  title: "Brand refresh and web",
  desc: "Updated visual identity and matching digital presence for a specialist manufacturer entering new markets."
}, {
  img: `${A}/images/news-seacrown.jpg`,
  sector: "Hospitality",
  service: "web",
  track: "small",
  title: "Online booking system",
  desc: "Custom booking and ordering system that replaced a complex multi-plugin WordPress setup with something clean and fast."
}];
const FILTERS = [{
  key: "all",
  label: "All work"
}, {
  key: "web",
  label: "Web and software"
}, {
  key: "brand",
  label: "Brand"
}, {
  key: "enterprise",
  label: "Enterprise"
}, {
  key: "small",
  label: "Small business"
}];
function WorkCard({
  img,
  sector,
  service,
  title,
  desc
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: "#",
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "block",
      textDecoration: "none",
      borderRadius: "18px",
      overflow: "hidden",
      border: `1px solid ${h ? TEAL_HEX : "var(--quest-border)"}`,
      background: "#fff",
      transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
      boxShadow: h ? "0 18px 40px rgba(33,75,127,0.13)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      aspectRatio: "16/10",
      background: INK
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: img,
    alt: title,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: h ? "scale(1.05)" : "scale(1)",
      transition: "transform 0.6s var(--ease)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 26px 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: TEAL_HEX
    }
  }, sector), /*#__PURE__*/React.createElement("span", {
    style: {
      color: TEAL_HEX,
      opacity: h ? 1 : 0,
      transform: h ? "translate(0,0)" : "translate(-4px,4px)",
      transition: "all 0.4s var(--ease)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    size: 16
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 9px",
      fontSize: "20px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.2,
      color: h ? TEAL_HEX : "var(--quest-heading)",
      transition: "color var(--dur) var(--ease)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "14.5px",
      fontWeight: 300,
      lineHeight: 1.55,
      color: "var(--quest-body)"
    }
  }, desc)));
}
function WorkHero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: INK,
      color: "#fff",
      paddingTop: "160px",
      paddingBottom: "100px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-30%",
      left: "-10%",
      width: "60vw",
      height: "60vw",
      background: "radial-gradient(circle, rgba(43,123,185,0.22) 0%, transparent 62%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 1,
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "0 40px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement(Eyebrow, {
    onDark: true,
    style: {
      marginBottom: "26px"
    }
  }, "Selected work"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 22px",
      fontWeight: 700,
      fontSize: "clamp(44px, 6vw, 82px)",
      letterSpacing: "-0.025em",
      lineHeight: 1.0
    }
  }, "What we\u2019ve built."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "20px",
      fontWeight: 300,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.82)",
      maxWidth: "520px"
    }
  }, "From enterprise platforms to small business websites. A selection of projects across different sectors and scales."))));
}
function WorkGrid() {
  const [filter, setFilter] = React.useState("all");
  const visible = CASES.filter(c => filter === "all" || c.service === filter || c.track === filter);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "80px 40px 100px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      marginBottom: "56px"
    }
  }, FILTERS.map(f => {
    const active = filter === f.key;
    return /*#__PURE__*/React.createElement("button", {
      key: f.key,
      onClick: () => setFilter(f.key),
      style: {
        fontSize: "14px",
        fontWeight: active ? 700 : 500,
        color: active ? "#fff" : "var(--quest-body)",
        background: active ? INK : "transparent",
        border: `1.5px solid ${active ? INK : "var(--quest-border)"}`,
        padding: "10px 20px",
        borderRadius: "999px",
        cursor: "pointer",
        transition: "all var(--dur) var(--ease)"
      },
      onMouseEnter: e => {
        if (!active) {
          e.currentTarget.style.borderColor = INK;
          e.currentTarget.style.color = INK;
        }
      },
      onMouseLeave: e => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--quest-border)";
          e.currentTarget.style.color = "var(--quest-body)";
        }
      }
    }, f.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "24px"
    }
  }, visible.map((c, i) => /*#__PURE__*/React.createElement(Reveal, {
    key: c.title,
    delay: i % 3 * 0.05
  }, /*#__PURE__*/React.createElement(WorkCard, c)))), visible.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "80px 0",
      color: "var(--quest-body)",
      fontSize: "17px",
      fontWeight: 300
    }
  }, "No projects in this filter yet. ", /*#__PURE__*/React.createElement("a", {
    href: "contact.html",
    style: {
      color: TEAL_HEX
    }
  }, "Working on something similar?"))));
}
function WorkCTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: INK,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "100px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "32px"
    }
  }, /*#__PURE__*/React.createElement(Reveal, null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 12px",
      fontSize: "clamp(28px, 3.4vw, 46px)",
      fontWeight: 700,
      letterSpacing: "-0.02em"
    }
  }, "Working on something?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "18px",
      fontWeight: 300,
      color: "rgba(255,255,255,0.78)"
    }
  }, "We\u2019d love to hear about it.")), /*#__PURE__*/React.createElement(Reveal, {
    delay: 0.1
  }, /*#__PURE__*/React.createElement("a", {
    href: "contact.html",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "16px",
      fontWeight: 600,
      color: INK,
      background: TEAL_HEX,
      padding: "18px 32px",
      borderRadius: "999px",
      textDecoration: "none",
      whiteSpace: "nowrap",
      transition: "transform var(--dur) var(--ease)"
    },
    onMouseEnter: e => e.currentTarget.style.transform = "translateY(-2px)",
    onMouseLeave: e => e.currentTarget.style.transform = "translateY(0)"
  }, "Start a conversation ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18
  })))));
}
function App() {
  React.useEffect(() => {
    const draw = () => {
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    };
    draw();
    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement(WorkHero, null), /*#__PURE__*/React.createElement(WorkGrid, null), /*#__PURE__*/React.createElement(WorkCTA, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/digital/work-sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.DivisionCard = __ds_scope.DivisionCard;

__ds_ns.FeatureTile = __ds_scope.FeatureTile;

__ds_ns.NewsCard = __ds_scope.NewsCard;

__ds_ns.StatItem = __ds_scope.StatItem;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

})();
