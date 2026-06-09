'use client';

import type { ReactElement } from 'react';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import type { useProjectTemplateManager } from '@/presentation/features/projectTemplates/useProjectTemplateManager';
import {
  ProjectTemplateListModal,
  type ProjectTemplateListModalMode,
} from './ProjectTemplateListModal';

export type LoadProjectTemplateDialogsProps = {
  readonly controller: ReturnType<typeof useProjectTemplateManager>;
  readonly mode?: ProjectTemplateListModalMode;
  readonly onCloseList?: () => void;
  readonly overlayClassName?: string;
};

export function LoadProjectTemplateDialogs({
  controller,
  mode = 'load',
  onCloseList,
  overlayClassName,
}: LoadProjectTemplateDialogsProps): ReactElement {
  const copy = getProjectTemplateScopeCopy(controller.templateScope).load;
  const saveCancel = getProjectTemplateScopeCopy(controller.templateScope).save.cancel;
  const isManageMode = mode === 'manage';

  return (
    <>
      <ProjectTemplateListModal
        templateScope={controller.templateScope}
        mode={mode}
        isOpen={controller.listOpen}
        templates={controller.templates}
        loading={controller.loading}
        loadError={controller.loadError}
        busy={controller.busy}
        settingDefaultId={controller.settingDefaultId}
        onClose={onCloseList ?? controller.closeList}
        onLoad={controller.requestApply}
        onDelete={controller.requestDelete}
        onToggleDefault={controller.toggleDefault}
        overlayClassName={overlayClassName}
      />

      {isManageMode ? null : (
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
      )}

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
