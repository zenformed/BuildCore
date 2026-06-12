'use client';

import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { pickConfirmSnackbarClassNames } from '@zenformed/core/dashboard-shell';
import styles from './ConfirmModal.module.css';

const confirmClassNames = pickConfirmSnackbarClassNames(styles);

function TrashIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  hideIcon?: boolean;
  titleClassName?: string;
}

export function ConfirmModal({
  hideIcon = false,
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'primary',
  titleClassName,
}: ConfirmModalProps): ReactElement {
  const classNames = hideIcon
    ? {
        ...confirmClassNames,
        snackbarIcon: `${confirmClassNames.snackbarIcon} ${styles.snackbarIconHidden}`,
      }
    : confirmClassNames;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return <></>;

  const content = (
    <div
      className={classNames.snackbar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-snackbar-title"
      aria-describedby={message ? 'confirm-snackbar-desc' : undefined}
    >
      <div className={classNames.snackbarInner}>
        <div className={classNames.snackbarIcon}>
          <TrashIcon className={variant === 'danger' ? classNames.iconDanger : classNames.icon} />
        </div>
        <div className={classNames.snackbarText}>
          <span
            id="confirm-snackbar-title"
            className={titleClassName ?? classNames.snackbarTitle}
          >
            {title}
          </span>
          {message ? (
            <span id="confirm-snackbar-desc" className={classNames.snackbarMessage}>
              {message}
            </span>
          ) : null}
        </div>
        <div className={classNames.snackbarActions}>
          <button type="button" className={classNames.cancelBtn} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === 'danger' ? classNames.confirmBtnDanger : classNames.confirmBtn}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return <></>;
  return createPortal(content, document.body);
}
