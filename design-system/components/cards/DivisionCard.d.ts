import * as React from "react";

/**
 * Quest division card — an outlined, tappable card promoting one of the seven
 * Quest divisions. Used in 4-up / 2-up grids on the homepage and service pages.
 *
 * @startingPoint section="Cards" subtitle="Outlined division card — dark & light variants" viewport="320x180"
 */
export interface DivisionCardProps {
  /** Division name, e.g. "Quest Hub". */
  name: string;
  /** Route slug (e.g. "hub") or an anchor ("#..."). */
  slug?: string;
  /** `dark` = white border on navy/photo panels; `light` = blue border on white. */
  variant?: "dark" | "light";
  className?: string;
  style?: React.CSSProperties;
}

export function DivisionCard(props: DivisionCardProps): JSX.Element;
