import * as React from "react";

/**
 * Quest text input. Square 4px corners, hairline border, blue focus ring.
 * Spreads native <input> props (type, name, value, placeholder, …).
 *
 * @startingPoint section="Forms" subtitle="Text input — light & on-dark skins" viewport="700x90"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Translucent-white skin for navy / photo panels (contact form). */
  onDark?: boolean;
}

export function Input(props: InputProps): JSX.Element;
