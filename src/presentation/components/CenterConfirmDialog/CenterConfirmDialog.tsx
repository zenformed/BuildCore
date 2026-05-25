'use client';

import type { ReactElement, ReactNode } from 'react';
import styles from './CenterConfirmDialog.module.css';

export type CenterConfirmDialogProps = {
  readonly isOpen: boolean;
  readonly title: string;
  readonly message?: ReactNode;
  readonly feedback?: { readonly kind: 'success' | 'error'; readonly message: string } | null;
  readonly cancelLabel: string;
  readonly confirmLabel?: string;
  readonly onClose: () => void;
  readonly onConfirm?: () => void;
  readonly confirmDisabled?: boolean;
  readonly cancelDisabled?: boolean;
  readonly hideActions?: boolean;
  readonly closeAriaLabel: string;
};

export function CenterConfirmDialog({
  isOpen,
  title,
  message,
  feedback,
  cancelLabel,
  confirmLabel,
  onClose,
  onConfirm,
  confirmDisabled = false,
  cancelDisabled = false,
  hideActions = false,
  closeAriaLabel,
}: CenterConfirmDialogProps): ReactElement | null {
  if (!isOpen) return null;

  const showConfirm = confirmLabel != null && onConfirm != null;

  return (
    <div
      className={styles.overlay}
      onClick={cancelDisabled ? undefined : onClose}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="center-confirm-dialog-title"
        aria-label={closeAriaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="center-confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        {message != null ? <p className={styles.message}>{message}</p> : null}
        {feedback != null ? (
          <p
            className={`${styles.feedback} ${
              feedback.kind === 'success' ? styles.feedbackSuccess : styles.feedbackError
            }`}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}
        {hideActions ? null : (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={cancelDisabled}
            >
              {cancelLabel}
            </button>
            {showConfirm ? (
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={onConfirm}
                disabled={confirmDisabled}
              >
                {confirmLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
