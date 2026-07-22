import * as React from "react";

/**
 * Quest Medical primary button. Pill-shaped (rounded-full), restrained
 * color-only hover. Use for all calls to action; renders as a link when `href` is set.
 *
 * @startingPoint section="Buttons" subtitle="Quest CTA button — 5 variants × 3 sizes" viewport="700x120"
 */
export interface ButtonProps {
  /** When set, renders an <a> instead of a <button>. */
  href?: string;
  onClick?: () => void;
  /** Visual style. Default `primary` is a blue outline (light bg); use
   * `outline-white` on dark/navy backgrounds. `ghost` is text-only. */
  variant?: "primary" | "outline" | "outline-white" | "ghost";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** Anchor target (when `href` is set). */
  target?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
