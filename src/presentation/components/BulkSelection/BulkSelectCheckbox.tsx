'use client';

import type { ChangeEvent, MouseEvent, ReactElement } from 'react';
import styles from './BulkSelection.module.css';

export type BulkSelectCheckboxProps = {
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
  readonly ariaLabel: string;
  readonly onChange: (checked: boolean) => void;
  readonly className?: string;
};

export function BulkSelectCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onChange,
  className,
}: BulkSelectCheckboxProps): ReactElement {
  const setCheckboxRef = (element: HTMLInputElement | null): void => {
    if (element != null) {
      element.indeterminate = indeterminate;
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.checked);
  };

  const handleClick = (event: MouseEvent<HTMLInputElement>): void => {
    event.stopPropagation();
  };

  return (
    <input
      ref={setCheckboxRef}
      type="checkbox"
      className={[styles.bulkSelectCheckbox, className].filter(Boolean).join(' ')}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={handleChange}
      onClick={handleClick}
    />
  );
}
