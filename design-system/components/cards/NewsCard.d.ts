import * as React from "react";

/**
 * Quest news / insight card — outlined card with a 16:9 cover image (zooms on
 * hover), date, headline, 3-line excerpt and a full-width "Read more" button.
 *
 * @startingPoint section="Cards" subtitle="News card with image, date & excerpt" viewport="360x420"
 */
export interface NewsCardProps {
  title: string;
  /** Formatted date string, e.g. "January 12, 2026". */
  date: string;
  excerpt: string;
  /** Cover image URL (rendered 16:9, object-fit cover). */
  image: string;
  href?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function NewsCard(props: NewsCardProps): JSX.Element;
