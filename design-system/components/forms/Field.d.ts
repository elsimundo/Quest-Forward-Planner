import * as React from "react";

/** Label wrapper for a Quest form control, with optional required asterisk. */
export interface FieldProps {
  label?: string;
  required?: boolean;
  /** White label for navy panels. */
  onDark?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Field(props: FieldProps): JSX.Element;
