'use client';

import type { ReactElement } from 'react';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import type { useProjectTemplateManager } from '@/presentation/features/projectTemplates/useProjectTemplateManager';
import { ProjectTemplateListModal } from './ProjectTemplateListModal';

export type LoadProjectTemplateDialogsProps = {
  readonly controller: ReturnType<typeof useProjectTemplateManager>;
};

export function LoadProjectTemplateDialogs({
  controller,
}: LoadProjectTemplateDialogsProps): ReactElement {
  const copy = getProjectTemplateScopeCopy(controller.templateScope).load;
  const saveCancel = getProjectTemplateScopeCopy(controller.templateScope).save.cancel;

  return (
    <>
      <ProjectTemplateListModal
        templateScope={controller.templateScope}
        isOpen={controller.listOpen}
        templates={controller.templates}
        loading={controller.loading}
        loadError={controller.loadError}
        busy={controller.busy}
        settingDefaultId={controller.settingDefaultId}
        onClose={controller.closeList}
        onLoad={controller.requestApply}
        onDelete={controller.requestDelete}
        onToggleDefault={controller.toggleDefault}
      />

      <ConfirmModal
        isOpen={controller.pendingApply != null}
        onClose={controller.cancelApply}
        onConfirm={() => void controller.confirmApply()}
        title={copy.applyConfirmTitle}
        message={controller.applyConfirmMessage}
        confirmLabel={controller.applying ? 'Applying…' : copy.applyConfirmLabel}
        cancelLabel={saveCancel}
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
        cancelLabel={saveCancel}
        variant="danger"
      />
    </>
  );
}
