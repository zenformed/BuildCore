'use client';

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import {
  CRM_INACTIVE_REASON_OPTIONS,
  CRM_LOSS_REASON_OPTIONS,
  type CrmProjectSummary,
} from '@/domain/crm';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';
import styles from './MarkInactiveDialog.module.css';

export type MarkInactiveDialogTarget =
  | { readonly mode: 'single'; readonly project: CrmProjectSummary }
  | { readonly mode: 'bulk'; readonly projects: readonly CrmProjectSummary[] };

export type MarkInactiveDialogVariant = 'inactive' | 'lost';

type MarkInactiveDialogCopy = {
  readonly title: string;
  readonly singleMessage: (name: string) => string;
  readonly bulkMessage: (count: number) => string;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly customReasonLabel: string;
  readonly reasonRequired: string;
  readonly customReasonRequired: string;
  readonly submit: string;
  readonly submitting: string;
  readonly closeAriaLabel: string;
};

export type MarkInactiveDialogProps = {
  readonly target: MarkInactiveDialogTarget | null;
  readonly submitting?: boolean;
  /** `lost` uses CRM loss reasons (Phase 3 status pill). Default keeps legacy Mark Inactive. */
  readonly variant?: MarkInactiveDialogVariant;
  readonly onClose: () => void;
  readonly onSubmit: (input: {
    readonly reason: string;
    readonly customReason: string | null;
  }) => void;
};

export function MarkInactiveDialog({
  target,
  submitting = false,
  variant = 'inactive',
  onClose,
  onSubmit,
}: MarkInactiveDialogProps): ReactElement | null {
  const inactiveCopy = content.projectDetail.subprojects.markInactive;
  const lostCopy = content.projectDetail.projectStatus.lostReasonDialog;
  const copy: MarkInactiveDialogCopy = variant === 'lost' ? lostCopy : inactiveCopy;
  const reasonOptions = variant === 'lost' ? CRM_LOSS_REASON_OPTIONS : CRM_INACTIVE_REASON_OPTIONS;
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (target == null) return;
    setReason('');
    setCustomReason('');
    setValidationError(null);
  }, [target, variant]);

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

  const titleId =
    variant === 'lost' ? 'mark-lost-dialog-title' : 'mark-inactive-dialog-title';
  const reasonFieldId =
    variant === 'lost' ? 'mark-lost-reason' : 'mark-inactive-reason';
  const customFieldId =
    variant === 'lost' ? 'mark-lost-custom-reason' : 'mark-inactive-custom-reason';

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
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
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
              <label className={formStyles.label} htmlFor={reasonFieldId}>
                {copy.reasonLabel} *
              </label>
              <select
                id={reasonFieldId}
                className={formStyles.select}
                value={reason}
                disabled={submitting}
                onChange={(event) => {
                  setReason(event.target.value);
                  setValidationError(null);
                }}
              >
                <option value="">{copy.reasonPlaceholder}</option>
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {reason === 'other' ? (
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor={customFieldId}>
                  {copy.customReasonLabel} *
                </label>
                <textarea
                  id={customFieldId}
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
