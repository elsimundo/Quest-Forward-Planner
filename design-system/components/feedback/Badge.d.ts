import * as React from "react";

/**
 * Quest badge — a small label for a category, status or certification. Square
 * 4px corners, palette-mapped tones.
 *
 * @startingPoint section="Feedback" subtitle="Category / status badge" viewport="700x80"
 */
export interface BadgeProps {
  children: React.ReactNode;
  /** Color tone. `on-dark` for navy/photo backgrounds. */
  tone?: "blue" | "navy" | "accent" | "neutral" | "on-dark";
  size?: "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
