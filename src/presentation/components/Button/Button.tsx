'use client';

import React from 'react';
import styles from './Button.module.css';

/**
 * Button variants for consistent UI.
 * @expandable Add 'ghost', 'danger', or size variants.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. */
  variant?: ButtonVariant;
  /** Optional additional class names. */
  className?: string;
  /** Child content. */
  children: React.ReactNode;
}

/**
 * Documented, accessible button component. Styles via CSS Module only; no inline styles.
 * @expandable Add loading state, icon slot, or fullWidth prop.
 */
export function Button({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps): React.ReactElement {
  const classNames = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classNames} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
