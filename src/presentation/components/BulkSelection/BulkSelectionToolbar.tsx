'use client';

import type { ReactElement } from 'react';
import styles from './BulkSelection.module.css';

export type BulkSelectionToolbarAction = {
  readonly id: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly variant?: 'default' | 'danger';
  readonly title?: string;
};

export type BulkSelectionToolbarVariant = 'standalone' | 'header';

export type BulkSelectionToolbarProps = {
  readonly selectedCount: number;
  readonly selectedCountLabel: string;
  readonly ariaLabel: string;
  readonly actions: readonly BulkSelectionToolbarAction[];
  readonly onCancel: () => void;
  readonly cancelLabel: string;
  readonly variant?: BulkSelectionToolbarVariant;
  readonly className?: string;
};

export function BulkSelectionToolbar({
  selectedCount,
  selectedCountLabel,
  ariaLabel,
  actions,
  onCancel,
  cancelLabel,
  variant = 'standalone',
  className,
}: BulkSelectionToolbarProps): ReactElement {
  return (
    <div
      className={[
        styles.bulkSelectionToolbar,
        variant === 'header' ? styles.bulkSelectionToolbar_header : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <span className={styles.bulkSelectionToolbarCount}>{selectedCountLabel}</span>
      <div className={styles.bulkSelectionToolbarActions}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={[
              styles.bulkSelectionToolbarBtn,
              action.variant === 'danger' ? styles.bulkSelectionToolbarBtn_danger : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={action.disabled}
            title={action.title}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
        <button type="button" className={styles.bulkSelectionToolbarBtn} onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
