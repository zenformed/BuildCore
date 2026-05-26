'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import type { useLoadProjectTemplate } from '@/presentation/features/crmProjectDetail/useLoadProjectTemplate';
import { ProjectTemplateListModal } from './ProjectTemplateListModal';

export type LoadProjectTemplateDialogsProps = {
  readonly controller: ReturnType<typeof useLoadProjectTemplate>;
};

export function LoadProjectTemplateDialogs({
  controller,
}: LoadProjectTemplateDialogsProps): ReactElement {
  const copy = content.projectDetail.loadTemplate;

  return (
    <>
      <ProjectTemplateListModal
        isOpen={controller.listOpen}
        templates={controller.templates}
        loading={controller.loading}
        loadError={controller.loadError}
        busy={controller.busy}
        onClose={controller.closeList}
        onLoad={controller.requestApply}
        onDelete={controller.requestDelete}
      />

      <ConfirmModal
        isOpen={controller.pendingApply != null}
        onClose={controller.cancelApply}
        onConfirm={() => void controller.confirmApply()}
        title={copy.applyConfirmTitle}
        message={copy.applyConfirmMessage}
        confirmLabel={controller.applying ? 'Applying…' : copy.applyConfirmLabel}
        cancelLabel={content.projectDetail.saveTemplate.cancel}
        variant="primary"
      />

      <ConfirmModal
        isOpen={controller.pendingDelete != null}
        onClose={controller.cancelDelete}
        onConfirm={() => void controller.confirmDelete()}
        title={copy.deleteConfirmTitle}
        message={
          controller.pendingDelete
            ? copy.deleteConfirmMessage(controller.pendingDelete.name)
            : undefined
        }
        confirmLabel={copy.deleteConfirmLabel}
        cancelLabel={content.projectDetail.saveTemplate.cancel}
        variant="danger"
      />
    </>
  );
}
