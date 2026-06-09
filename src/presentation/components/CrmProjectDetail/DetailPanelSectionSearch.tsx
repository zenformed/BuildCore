'use client';

import type { ReactElement } from 'react';
import styles from './ProjectDetail.module.css';

export type DetailPanelSectionSearchProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly ariaLabel: string;
};

export function DetailPanelSectionSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: DetailPanelSectionSearchProps): ReactElement {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={styles.detailPanelSectionSearch}
    />
  );
}
