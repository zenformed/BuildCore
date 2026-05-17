'use client';

import type { ReactElement } from 'react';
import { useEffect } from 'react';
import styles from './ProjectDetail.module.css';

export type DetailToastKind = 'success' | 'error';

export type DetailToastProps = {
  kind: DetailToastKind;
  message: string;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS: Record<DetailToastKind, number> = {
  success: 3500,
  error: 6000,
};

export function DetailToast({ kind, message, onDismiss }: DetailToastProps): ReactElement {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, AUTO_DISMISS_MS[kind]);
    return () => window.clearTimeout(timeout);
  }, [kind, message, onDismiss]);

  return (
    <div
      className={styles.toastHost}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <p className={kind === 'error' ? styles.toastError : styles.toastSuccess}>{message}</p>
      <button type="button" className={styles.toastDismiss} onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
