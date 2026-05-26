'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';

export type SaveProjectTemplateDialogProps = {
  readonly isOpen: boolean;
  readonly templateName: string;
  readonly saving: boolean;
  readonly onTemplateNameChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
};

export function SaveProjectTemplateDialog({
  isOpen,
  templateName,
  saving,
  onTemplateNameChange,
  onClose,
  onSave,
}: SaveProjectTemplateDialogProps): ReactElement {
  const copy = content.projectDetail.saveTemplate;

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={copy.title}
      body={
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="save-project-template-name">
            {copy.nameLabel}
          </label>
          <input
            id="save-project-template-name"
            type="text"
            className={formStyles.input}
            value={templateName}
            onChange={(event) => onTemplateNameChange(event.target.value)}
            placeholder={copy.namePlaceholder}
            disabled={saving}
            autoFocus
          />
        </div>
      }
      cancelLabel={copy.cancel}
      confirmLabel={saving ? copy.saving : copy.confirm}
      onClose={onClose}
      onConfirm={() => void onSave()}
      confirmDisabled={saving || templateName.trim().length === 0}
      cancelDisabled={saving}
      closeAriaLabel={copy.closeAriaLabel}
    />
  );
}
