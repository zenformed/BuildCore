'use client';

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import {
  CRM_INACTIVE_REASON_OPTIONS,
  type CrmInactiveReason,
  type CrmProjectSummary,
} from '@/domain/crm';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import styles from './MarkInactiveDialog.module.css';

export type MarkInactiveDialogTarget =
  | { readonly mode: 'single'; readonly project: CrmProjectSummary }
  | { readonly mode: 'bulk'; readonly projects: readonly CrmProjectSummary[] };

export type MarkInactiveDialogProps = {
  readonly target: MarkInactiveDialogTarget | null;
  readonly submitting?: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: {
    readonly reason: CrmInactiveReason;
    readonly customReason: string | null;
  }) => void;
};

export function MarkInactiveDialog({
  target,
  submitting = false,
  onClose,
  onSubmit,
}: MarkInactiveDialogProps): ReactElement | null {
  const copy = content.projectDetail.subprojects.markInactive;
  const [reason, setReason] = useState<CrmInactiveReason | ''>('');
  const [customReason, setCustomReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (target == null) return;
    setReason('');
    setCustomReason('');
    setValidationError(null);
  }, [target]);

  useEffect(() => {
    if (target == null) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting, target]);

  if (target == null) return null;

  const message =
    target.mode === 'single'
      ? copy.singleMessage(target.project.name)
      : copy.bulkMessage(target.projects.length);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (reason === '') {
      setValidationError(copy.reasonRequired);
      return;
    }
    if (reason === 'other' && !customReason.trim()) {
      setValidationError(copy.customReasonRequired);
      return;
    }
    setValidationError(null);
    onSubmit({
      reason,
      customReason: reason === 'other' ? customReason.trim() : null,
    });
  };

  return (
    <div
      className={styles.overlay}
      onClick={submitting ? undefined : onClose}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-inactive-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="mark-inactive-dialog-title" className={styles.title}>
            {copy.title}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label={copy.closeAriaLabel}
            disabled={submitting}
            onClick={onClose}
          >
            <CloseIcon className={styles.closeBtnIcon} />
          </button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.body}>
            <p className={styles.message}>{message}</p>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="mark-inactive-reason">
                {copy.reasonLabel} *
              </label>
              <select
                id="mark-inactive-reason"
                className={formStyles.select}
                value={reason}
                disabled={submitting}
                onChange={(event) => {
                  setReason(event.target.value as CrmInactiveReason | '');
                  setValidationError(null);
                }}
              >
                <option value="">{copy.reasonPlaceholder}</option>
                {CRM_INACTIVE_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {reason === 'other' ? (
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="mark-inactive-custom-reason">
                  {copy.customReasonLabel} *
                </label>
                <textarea
                  id="mark-inactive-custom-reason"
                  className={`${formStyles.input} ${styles.textarea}`}
                  value={customReason}
                  disabled={submitting}
                  rows={3}
                  onChange={(event) => {
                    setCustomReason(event.target.value);
                    setValidationError(null);
                  }}
                />
              </div>
            ) : null}
            {validationError ? <p className={formStyles.error}>{validationError}</p> : null}
          </div>
          <div className={styles.footer}>
            <button type="submit" className={`${formStyles.submitButton} ${styles.submitBtn}`} disabled={submitting}>
              {submitting ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
