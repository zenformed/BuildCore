'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionBlockedDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { CrmProjectDeleteConfirmModal } from '@/presentation/components/CrmProjects/CrmProjectDeleteConfirmModal';
import { WorkflowTaskCustomerNotifyDialog } from '@/presentation/components/CrmProjectDetail/WorkflowTaskCustomerNotifyDialog';
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
    | 'customerNotifyPrompt'
    | 'customerNotifySending'
    | 'customerNotifyFeedback'
    | 'closeCustomerNotifyPrompt'
    | 'sendCustomerNotifyEmail'
  >;
  pendingDeleteProject: CrmProjectSummary | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
};

export function ProjectDetailShellModals({
  showCompletion,
  completion,
  workspace,
  pendingDeleteProject,
  onCloseDelete,
  onConfirmDelete,
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
    customerNotifyPrompt,
    customerNotifySending,
    customerNotifyFeedback,
    closeCustomerNotifyPrompt,
    sendCustomerNotifyEmail,
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
          <ProjectCompletionBlockedDialog
            isOpen={completion.completionBlockedStageStatuses != null}
            stageStatuses={completion.completionBlockedStageStatuses}
            onClose={() => completion.setCompletionBlockedStageStatuses(null)}
          />
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
            message={detail.markCompleteConfirmMessage}
            confirmLabel={detail.markComplete}
            cancelLabel={wf.archiveTaskCancelLabel}
            variant="primary"
            hideIcon
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
            message={detail.markIncompleteConfirmMessage}
            confirmLabel={detail.markIncomplete}
            cancelLabel={wf.archiveTaskCancelLabel}
            variant="primary"
            hideIcon
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
      <CrmProjectDeleteConfirmModal
        pendingProject={pendingDeleteProject}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
      <WorkflowTaskCustomerNotifyDialog
        prompt={customerNotifyPrompt}
        sending={customerNotifySending}
        feedback={customerNotifyFeedback}
        onClose={closeCustomerNotifyPrompt}
        onSendEmail={() => {
          void sendCustomerNotifyEmail();
        }}
      />
    </>
  );
}
