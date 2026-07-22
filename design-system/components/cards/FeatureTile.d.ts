import * as React from "react";

/**
 * Quest "What We Deliver" feature tile — square-cornered, hairline-bordered,
 * white, no shadow. Optional icon is a Lucide icon name; the tile calls
 * lucide.createIcons() itself on mount, so just ensure the Lucide UMD script
 * is loaded on the page (in <head> is safest).
 */
export interface FeatureTileProps {
  title: string;
  description: string;
  /** Lucide icon name, e.g. "shield-check". Requires lucide.createIcons(). */
  icon?: string;
  /** Icon color — defaults to Quest Blue; pass a `--division-*` token to theme. */
  iconColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function FeatureTile(props: FeatureTileProps): JSX.Element;
