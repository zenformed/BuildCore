'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import type { useProjectCompletionToggle } from '@/presentation/features/crmProjectDetail/useProjectCompletionToggle';
import type { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';

export type ProjectDetailShellModalsProps = {
  showCompletion: boolean;
  completion: ReturnType<typeof useProjectCompletionToggle> | null;
  workspace: Pick<
    ReturnType<typeof useProjectDetailWorkspace>,
    | 'archiveConfirmTask'
    | 'setArchiveConfirmTask'
    | 'documentUploadConfirm'
    | 'setDocumentUploadConfirm'
    | 'handleConfirmDocumentUpload'
    | 'handleConfirmArchiveTask'
    | 'setToast'
    | 'wf'
  >;
};

export function ProjectDetailShellModals({
  showCompletion,
  completion,
  workspace,
}: ProjectDetailShellModalsProps): ReactElement {
  const detail = content.projectDetail;
  const {
    archiveConfirmTask,
    setArchiveConfirmTask,
    documentUploadConfirm,
    setDocumentUploadConfirm,
    handleConfirmDocumentUpload,
    handleConfirmArchiveTask,
    setToast,
    wf,
  } = workspace;

  return (
    <>
      <ConfirmModal
        isOpen={documentUploadConfirm != null}
        onClose={() => setDocumentUploadConfirm(null)}
        onConfirm={() => {
          void handleConfirmDocumentUpload();
        }}
        title={wf.documentUploadConfirmTitle}
        message={
          documentUploadConfirm
            ? wf.documentUploadConfirmMessage
                .replace('{fileName}', documentUploadConfirm.file.name)
                .replace('{taskTitle}', documentUploadConfirm.task.title)
            : undefined
        }
        confirmLabel={wf.documentUploadConfirmLabel}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="primary"
      />
      {showCompletion && completion != null ? (
        <>
          <ConfirmModal
            isOpen={completion.completionConfirm === 'complete'}
            onClose={() => completion.setCompletionConfirm(null)}
            onConfirm={() => {
              void completion
                .confirmCompletionChange()
                .then(() => setToast({ kind: 'success', message: detail.markCompleteSuccess }))
                .catch(() => setToast({ kind: 'error', message: detail.markCompleteFailed }));
            }}
            title={detail.markCompleteConfirmTitle}
            confirmLabel={detail.markComplete}
            cancelLabel={wf.archiveTaskCancelLabel}
            variant="primary"
          />
          <ConfirmModal
            isOpen={completion.completionConfirm === 'incomplete'}
            onClose={() => completion.setCompletionConfirm(null)}
            onConfirm={() => {
              void completion
                .confirmCompletionChange()
                .then(() => setToast({ kind: 'success', message: detail.markIncompleteSuccess }))
                .catch(() => setToast({ kind: 'error', message: detail.markCompleteFailed }));
            }}
            title={detail.markIncompleteConfirmTitle}
            confirmLabel={detail.markIncomplete}
            cancelLabel={wf.archiveTaskCancelLabel}
            variant="primary"
          />
        </>
      ) : null}
      <ConfirmModal
        isOpen={archiveConfirmTask != null}
        onClose={() => setArchiveConfirmTask(null)}
        onConfirm={() => {
          void handleConfirmArchiveTask();
        }}
        title={wf.archiveTaskConfirmTitle}
        message={
          archiveConfirmTask
            ? `“${archiveConfirmTask.title}” will be removed from this project.`
            : undefined
        }
        confirmLabel={wf.archiveTaskConfirmLabel}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="danger"
      />
    </>
  );
}
