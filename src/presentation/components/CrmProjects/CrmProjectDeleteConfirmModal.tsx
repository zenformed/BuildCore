'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';

export type CrmProjectDeleteConfirmModalProps = {
  pendingProject: CrmProjectSummary | null;
  onClose: () => void;
  onConfirm: () => void;
  confirmTitle?: string;
  confirmMessage?: (name: string) => string;
};

export function CrmProjectDeleteConfirmModal({
  pendingProject,
  onClose,
  onConfirm,
  confirmTitle,
  confirmMessage,
}: CrmProjectDeleteConfirmModalProps): ReactElement {
  const deleteCopy = content.crm.delete;

  return (
    <ConfirmModal
      isOpen={pendingProject != null}
      onClose={onClose}
      onConfirm={onConfirm}
      title={confirmTitle ?? deleteCopy.confirmTitle}
      message={
        pendingProject
          ? (confirmMessage ?? deleteCopy.confirmMessage)(pendingProject.name)
          : undefined
      }
      confirmLabel={deleteCopy.confirmLabel}
      cancelLabel={deleteCopy.cancelLabel}
      variant="danger"
    />
  );
}
