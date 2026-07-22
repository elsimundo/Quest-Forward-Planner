import React from "react";

/**
 * Quest Textarea — multiline counterpart to Input. Same skins via `onDark`.
 */
export function Textarea({ onDark = false, rows = 4, className = "", style = {}, ...rest }) {
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
    <textarea
      rows={rows}
      className={className}
      style={{ ...base, ...(onDark ? dark : light), ...style }}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      {...rest}
    />
  );
}
