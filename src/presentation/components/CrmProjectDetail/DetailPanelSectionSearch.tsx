'use client';

import type { FocusEventHandler, KeyboardEventHandler, ReactElement } from 'react';
import styles from './ProjectDetail.module.css';

export type DetailPanelSectionSearchProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  readonly onFocus?: FocusEventHandler<HTMLInputElement>;
  readonly role?: string;
  readonly ariaExpanded?: boolean;
  readonly ariaControls?: string;
  readonly ariaAutocomplete?: 'list' | 'none' | 'inline' | 'both';
};

export function DetailPanelSectionSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  onKeyDown,
  onFocus,
  role,
  ariaExpanded,
  ariaControls,
  ariaAutocomplete,
}: DetailPanelSectionSearchProps): ReactElement {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      role={role}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-autocomplete={ariaAutocomplete}
      className={[styles.detailPanelSectionSearch, className].filter(Boolean).join(' ')}
    />
  );
}
