'use client';

import { useEffect, type ReactElement, type ReactNode } from 'react';
import styles from './RightSideDrawer.module.css';

export type RightSideDrawerProps = {
  readonly open: boolean;
  readonly title: string;
  readonly titleId: string;
  readonly onClose: () => void;
  readonly closeAriaLabel: string;
  readonly closeDisabled?: boolean;
  readonly children: ReactNode;
  /** Extra class on the fixed overlay (e.g. nested-above-importer z-index). */
  readonly overlayClassName?: string;
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
  overlayClassName,
}: RightSideDrawerProps): ReactElement | null {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (closeDisabled) return;
      // Close this drawer before any underlying modal (e.g. spreadsheet importer).
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [closeDisabled, onClose, open]);

  if (!open) return null;

  return (
    <div
      className={[styles.overlay, overlayClassName].filter(Boolean).join(' ')}
      onClick={closeDisabled ? undefined : onClose}
      role="presentation"
    >
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
