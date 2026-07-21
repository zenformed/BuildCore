'use client';

import type { ReactElement } from 'react';
import styles from './ProjectDetail.module.css';

export type DocumentsGallerySelectCircleProps = {
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly ariaLabel: string;
  readonly visible: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly className?: string;
};

/** Google Photos–style circular select control for tiles and date headings. */
export function DocumentsGallerySelectCircle({
  checked,
  indeterminate = false,
  ariaLabel,
  visible,
  onChange,
  className,
}: DocumentsGallerySelectCircleProps): ReactElement {
  return (
    <button
      type="button"
      className={[
        styles.docGallerySelectCircle,
        checked || indeterminate ? styles.docGallerySelectCircle_checked : '',
        visible ? styles.docGallerySelectCircle_visible : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
      aria-pressed={checked}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange(!(checked || indeterminate));
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <span className={styles.docGallerySelectCircleMark} aria-hidden>
        {indeterminate && !checked ? '–' : checked ? '✓' : ''}
      </span>
    </button>
  );
}
