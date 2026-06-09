'use client';

import type { ReactElement } from 'react';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import formStyles from '../CrmProjects/CreateCrmProjectDrawer.module.css';

export type SaveProjectTemplateDialogProps = {
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly isOpen: boolean;
  readonly templateName: string;
  readonly setAsDefault: boolean;
  readonly saving: boolean;
  readonly onTemplateNameChange: (value: string) => void;
  readonly onSetAsDefaultChange: (value: boolean) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
};

export function SaveProjectTemplateDialog({
  templateScope,
  isOpen,
  templateName,
  setAsDefault,
  saving,
  onTemplateNameChange,
  onSetAsDefaultChange,
  onClose,
  onSave,
}: SaveProjectTemplateDialogProps): ReactElement {
  const copy = getProjectTemplateScopeCopy(templateScope).save;

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={copy.title}
      body={
        <>
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
          <label className={formStyles.checkboxRow}>
            <input
              type="checkbox"
              checked={setAsDefault}
              disabled={saving}
              onChange={(event) => onSetAsDefaultChange(event.target.checked)}
            />
            <span>{copy.setAsDefaultLabel}</span>
          </label>
          <p className={formStyles.checkboxHint}>{copy.setAsDefaultHint}</p>
        </>
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
