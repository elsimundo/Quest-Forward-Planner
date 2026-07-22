import React from "react";

/**
 * Quest Field — label (with optional required asterisk) wrapping a form control.
 * Pass `onDark` to color the label white for navy panels.
 */
export function Field({ label, required = false, onDark = false, htmlFor, children, className = "", style = {} }) {
  return (
    <div className={className} style={{ fontFamily: "var(--font-sans)", ...style }}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{ display: "block", fontSize: "14px", marginBottom: "6px", color: onDark ? "#fff" : "var(--quest-heading)" }}
        >
          {label}
          {required && <span style={{ color: onDark ? "#fca5a5" : "var(--quest-accent)", marginLeft: "4px" }}>*</span>}
        </label>
      )}
      {children}
    </div>
  );
}
