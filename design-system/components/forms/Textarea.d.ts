import * as React from "react";

/** Quest multiline text area — same skins as Input via `onDark`. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onDark?: boolean;
}

export function Textarea(props: TextareaProps): JSX.Element;
