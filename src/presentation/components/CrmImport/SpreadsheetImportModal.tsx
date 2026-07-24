'use client';

import {
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import centerStyles from '@/presentation/components/CenterConfirmDialog/CenterConfirmDialog.module.css';
import styles from './SpreadsheetImportWizard.module.css';

export type SpreadsheetImportModalProps = {
  readonly open: boolean;
  readonly title: string;
  readonly titleId?: string;
  readonly closeAriaLabel: string;
  readonly closeDisabled?: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
};

/**
 * Large centered import modal built on CenterConfirmDialog visual foundation.
 */
export function SpreadsheetImportModal({
  open,
  title,
  titleId: titleIdProp,
  closeAriaLabel,
  closeDisabled = false,
  onClose,
  children,
}: SpreadsheetImportModalProps): ReactElement | null {
  const generatedId = useId();
  const titleId = titleIdProp ?? generatedId;
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () =>
      panel?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? [];

    window.setTimeout(() => {
      const nodes = focusables();
      const closeBtn = panel?.querySelector<HTMLElement>('[data-import-modal-close]');
      (closeBtn ?? nodes[0])?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Nested drawers (e.g. Create Project) handle Escape first and preventDefault.
        if (event.defaultPrevented) return;
        if (!closeDisabled) {
          event.preventDefault();
          onClose();
        }
        return;
      }
      if (event.key !== 'Tab' || panel == null) return;
      const nodes = Array.from(focusables());
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [closeDisabled, onClose, open]);

  if (!open) return null;

  return (
    <div
      className={[centerStyles.overlay, styles.importModalOverlay].filter(Boolean).join(' ')}
      onClick={closeDisabled ? undefined : onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={[centerStyles.panel, styles.importModalPanel].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.importModalHeader}>
          <h2 id={titleId} className={[centerStyles.title, styles.importModalTitle].join(' ')}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.importModalClose}
            data-import-modal-close
            aria-label={closeAriaLabel}
            disabled={closeDisabled}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={styles.importModalBody}>{children}</div>
      </div>
    </div>
  );
}
