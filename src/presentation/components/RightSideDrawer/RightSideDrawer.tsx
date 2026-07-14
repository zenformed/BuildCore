'use client';

import type { ReactElement, ReactNode } from 'react';
import styles from './RightSideDrawer.module.css';

export type RightSideDrawerProps = {
  readonly open: boolean;
  readonly title: string;
  readonly titleId: string;
  readonly onClose: () => void;
  readonly closeAriaLabel: string;
  readonly closeDisabled?: boolean;
  readonly children: ReactNode;
};

/**
 * Generic right-edge slide-over dialog shell.
 * Caller owns form content, footer actions, and close/dirty policies.
 */
export function RightSideDrawer({
  open,
  title,
  titleId,
  onClose,
  closeAriaLabel,
  closeDisabled = false,
  children,
}: RightSideDrawerProps): ReactElement | null {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={closeDisabled}
            aria-label={closeAriaLabel}
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
