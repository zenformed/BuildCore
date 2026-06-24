'use client';

import { useEffect, useId, useMemo, useState, type ReactElement } from 'react';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import styles from './DestructiveConfirmationWorkflowDialog.module.css';

function AlertTriangleIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export type DestructiveConfirmationWorkflowDialogProps = {
  readonly open: boolean;
  readonly title: string;
  readonly itemTypeLabel: string;
  readonly selectedCount: number;
  readonly selectedItemLabels: readonly string[];
  readonly maxVisibleItems?: number;
  readonly selectedCountMessage: string;
  readonly moreItemsLabel: (hiddenCount: number) => string;
  readonly consequenceDescription: string;
  readonly affectedDataSummary: string;
  readonly irrevocableWarning: string;
  readonly confirmationPhrase: string;
  readonly confirmationInstructions: string;
  readonly intentActionLabel: string;
  readonly consequencesAcknowledgeLabel: string;
  readonly finalActionLabel: string;
  readonly closeAriaLabel: string;
  readonly confirmDisabled?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

type WorkflowStep = 1 | 2 | 3;

export function DestructiveConfirmationWorkflowDialog({
  open,
  title,
  selectedCount,
  selectedItemLabels,
  maxVisibleItems = 5,
  selectedCountMessage,
  moreItemsLabel,
  consequenceDescription,
  affectedDataSummary,
  irrevocableWarning,
  confirmationPhrase,
  confirmationInstructions,
  intentActionLabel,
  consequencesAcknowledgeLabel,
  finalActionLabel,
  closeAriaLabel,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: DestructiveConfirmationWorkflowDialogProps): ReactElement | null {
  const phraseInputId = useId();
  const [step, setStep] = useState<WorkflowStep>(1);
  const [typedPhrase, setTypedPhrase] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(1);
      setTypedPhrase('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel, open]);

  const { visibleItems, hiddenCount } = useMemo(() => {
    const visible = selectedItemLabels.slice(0, maxVisibleItems);
    return {
      visibleItems: visible,
      hiddenCount: Math.max(0, selectedItemLabels.length - visible.length),
    };
  }, [maxVisibleItems, selectedItemLabels]);

  const phraseMatches = typedPhrase.trim() === confirmationPhrase;

  if (!open) {
    return null;
  }

  const handlePrimaryAction = (): void => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    onConfirm();
  };

  const primaryLabel =
    step === 1 ? intentActionLabel : step === 2 ? consequencesAcknowledgeLabel : finalActionLabel;

  const primaryDisabled =
    step === 3 ? confirmDisabled || !phraseMatches || selectedCount === 0 : selectedCount === 0;

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="destructive-workflow-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="destructive-workflow-dialog-title" className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label={closeAriaLabel}
          >
            <CloseIcon className={styles.closeBtnIcon} />
          </button>
        </div>

        <div className={styles.body}>
          {step === 1 ? (
            <div key="step-1" className={styles.stepBody}>
              <p className={styles.selectedCountMessage}>{selectedCountMessage}</p>
              {visibleItems.length > 0 ? (
                <div className={styles.selectedItemsList} aria-label={selectedCountMessage}>
                  {visibleItems.map((label, index) => (
                    <div key={`${label}-${index}`} className={styles.selectedItemRow}>
                      {label}
                    </div>
                  ))}
                  {hiddenCount > 0 ? (
                    <div className={styles.selectedItemMore}>{moreItemsLabel(hiddenCount)}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div key="step-2" className={styles.stepBody}>
              <p className={styles.consequenceAlert}>
                <AlertTriangleIcon className={styles.consequenceAlertIcon} />
                <span>
                  {consequenceDescription} {irrevocableWarning}
                </span>
              </p>
              <p className={styles.affectedDataSummary}>{affectedDataSummary}</p>
            </div>
          ) : null}

          {step === 3 ? (
            <div key="step-3" className={styles.stepBody}>
              <div className={styles.confirmationSection}>
                <p className={styles.confirmationInstructions}>{confirmationInstructions}</p>
                <input
                  id={phraseInputId}
                  type="text"
                  className={styles.confirmationInput}
                  value={typedPhrase}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={confirmationInstructions}
                  onChange={(event) => setTypedPhrase(event.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={step === 3 ? styles.destructiveBtn : styles.primaryBtn}
            disabled={primaryDisabled}
            onClick={handlePrimaryAction}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
