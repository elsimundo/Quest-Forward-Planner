import * as React from "react";

/**
 * Quest impact statistic — an oversized Quest-Blue number (counts up on scroll
 * into view for numeric values) above a bold caption. Use in the 4-up StatsBar.
 *
 * @startingPoint section="Data" subtitle="Animated impact counter" viewport="320x200"
 */
export interface StatItemProps {
  /** The figure. Numeric strings ("10500") animate; others ("24/7") render as-is. */
  value: string;
  /** Appended after the number, e.g. "%" or "+". */
  suffix?: string;
  /** Caption beneath the number. */
  label: string;
  className?: string;
  style?: React.CSSProperties;
}

export function StatItem(props: StatItemProps): JSX.Element;
