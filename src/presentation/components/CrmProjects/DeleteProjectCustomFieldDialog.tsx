'use client';

import { useCallback, useState, type ReactElement } from 'react';
import type { ProjectCustomFieldScope } from '@/domain/buildcore/projectCustomFields';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';

export type DeleteProjectCustomFieldDialogProps = {
  readonly isOpen: boolean;
  readonly saving: boolean;
  readonly scope: ProjectCustomFieldScope;
  readonly fieldLabel: string;
  readonly onClose: () => void;
  readonly onConfirm: () => Promise<boolean>;
};

export function DeleteProjectCustomFieldDialog({
  isOpen,
  saving,
  scope,
  fieldLabel,
  onClose,
  onConfirm,
}: DeleteProjectCustomFieldDialogProps): ReactElement {
  const copy = content.crm.projectCustomFields.deleteField;
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (saving) return;
    setError(null);
    onClose();
  }, [onClose, saving]);

  const handleConfirm = useCallback(async () => {
    setError(null);
    const ok = await onConfirm();
    if (!ok) {
      setError(copy.failed);
      return;
    }
    setError(null);
    onClose();
  }, [copy.failed, onClose, onConfirm]);

  const bodyMessage = scope === 'project' ? copy.bodyProject : copy.bodySubproject;

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={copy.title(fieldLabel)}
      message={bodyMessage}
      feedback={error != null ? { kind: 'error', message: error } : null}
      cancelLabel={copy.cancel}
      confirmLabel={saving ? copy.deleting : copy.confirm}
      onClose={handleClose}
      onConfirm={() => void handleConfirm()}
      confirmDisabled={saving}
      cancelDisabled={saving}
      closeAriaLabel={copy.closeAriaLabel}
    />
  );
}
