'use client';

import { useCallback, useState, type ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import type { WorkflowTaskCustomFieldCopy } from './WorkflowTaskCustomFieldsSection';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';

export type AddWorkflowTaskCustomFieldDialogProps = {
  readonly isOpen: boolean;
  readonly saving: boolean;
  readonly copy: WorkflowTaskCustomFieldCopy & {
    readonly addDialogTitle: string;
    readonly labelField: string;
    readonly typeField: string;
    readonly typeText: string;
    readonly addConfirm: string;
    readonly creating: string;
    readonly createFailed: string;
    readonly closeAriaLabel: string;
  };
  readonly onClose: () => void;
  readonly onCreate: (label: string) => Promise<boolean>;
};

export function AddWorkflowTaskCustomFieldDialog({
  isOpen,
  saving,
  copy,
  onClose,
  onCreate,
}: AddWorkflowTaskCustomFieldDialogProps): ReactElement {
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (saving) return;
    setLabel('');
    setError(null);
    onClose();
  }, [onClose, saving]);

  const handleConfirm = useCallback(async () => {
    setError(null);
    const ok = await onCreate(label);
    if (!ok) {
      setError(copy.createFailed);
      return;
    }
    setLabel('');
    setError(null);
    onClose();
  }, [copy.createFailed, label, onClose, onCreate]);

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={copy.addDialogTitle}
      body={
        <>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="workflow-custom-field-label">
              {copy.labelField}
            </label>
            <input
              id="workflow-custom-field-label"
              type="text"
              className={formStyles.input}
              value={label}
              disabled={saving}
              autoFocus
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="workflow-custom-field-type">
              {copy.typeField}
            </label>
            <select id="workflow-custom-field-type" className={formStyles.select} disabled value="text">
              <option value="text">{copy.typeText}</option>
            </select>
          </div>
          {error ? <p className={formStyles.error}>{error}</p> : null}
        </>
      }
      cancelLabel={content.projectDetail.edit.cancel}
      confirmLabel={saving ? copy.creating : copy.addConfirm}
      onClose={handleClose}
      onConfirm={() => void handleConfirm()}
      confirmDisabled={saving || label.trim().length === 0}
      cancelDisabled={saving}
      closeAriaLabel={copy.closeAriaLabel}
    />
  );
}
