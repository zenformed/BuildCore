'use client';

import type { ReactElement } from 'react';
import { getProjectTemplateScopeCopy } from '@/presentation/features/projectTemplates/projectTemplateCopy';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import type { useProjectTemplateManager } from '@/presentation/features/projectTemplates/useProjectTemplateManager';
import {
  ProjectTemplateListModal,
  type ProjectTemplateListModalMode,
} from './ProjectTemplateListModal';
import styles from './ProjectTemplates.module.css';

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
        onClearDefault={controller.clearDefault}
        overlayClassName={overlayClassName}
      />

      {isManageMode ? null : (
        <CenterConfirmDialog
          isOpen={controller.pendingApply != null}
          onClose={controller.cancelApply}
          onConfirm={() => void controller.confirmApply()}
          title={copy.applyConfirmTitle}
          message={controller.applyConfirmMessage}
          confirmLabel={controller.applying ? 'Applying…' : copy.applyConfirmLabel}
          cancelLabel={saveCancel}
          confirmDisabled={controller.applying}
          cancelDisabled={controller.applying}
          closeAriaLabel={copy.applyConfirmTitle}
          overlayClassName={styles.stackedOverlayConfirm}
        />
      )}

      <CenterConfirmDialog
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
        confirmDisabled={controller.busy}
        cancelDisabled={controller.busy}
        closeAriaLabel={copy.deleteConfirmTitle}
        overlayClassName={styles.stackedOverlayConfirm}
      />
    </>
  );
}
