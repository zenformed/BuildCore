'use client';

import type { ReactElement } from 'react';
import type { CrmLossReason, CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { ProjectCompletionWarningDialog } from '@/presentation/components/CrmProjectDetail/ProjectCompletionBlockedDialog';
import { CrmProjectDeleteWorkflowDialog } from '@/presentation/components/CrmProjects/CrmProjectDeleteWorkflowDialog';
import { MarkInactiveDialog } from '@/presentation/components/CrmProjects/MarkInactiveDialog';
import { WorkflowTaskCustomerNotifyDialog } from '@/presentation/components/CrmProjectDetail/WorkflowTaskCustomerNotifyDialog';
import { SendAttachmentDialog } from '@/presentation/components/communications/SendAttachmentDialog';
import type { useCrmProjectStatusChange } from '@/presentation/features/crmProjectDetail/useCrmProjectStatusChange';
import type { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';

export type CrmProjectStatusChangeDialogsProps = {
  statusChange: ReturnType<typeof useCrmProjectStatusChange>;
  onError: (message: string) => void;
};

/** Lost reason, Cancelled confirm, and Completed incomplete-task warning for the status pill. */
export function CrmProjectStatusChangeDialogs({
  statusChange,
  onError,
}: CrmProjectStatusChangeDialogsProps): ReactElement {
  const statusCopy = content.projectDetail.projectStatus;

  return (
    <>
      <ProjectCompletionWarningDialog
        isOpen={statusChange.incompleteTasksWarningCount != null}
        incompleteTaskCount={statusChange.incompleteTasksWarningCount ?? 0}
        onClose={() => statusChange.setIncompleteTasksWarningCount(null)}
        onConfirm={() => {
          void statusChange.confirmCompleteAnyway().catch(() => onError(statusCopy.failed));
        }}
      />
      <ConfirmModal
        isOpen={statusChange.cancelledConfirmOpen}
        onClose={statusChange.closeCancelledConfirm}
        onConfirm={() => {
          void statusChange.confirmCancelled().catch(() => onError(statusCopy.failed));
        }}
        title={statusCopy.cancelledConfirmTitle}
        message={statusCopy.cancelledConfirmMessage}
        confirmLabel={statusCopy.cancelledConfirmLabel}
        cancelLabel={statusCopy.cancelledConfirmCancel}
        variant="primary"
        hideIcon
      />
      <MarkInactiveDialog
        target={statusChange.lostDialogTarget}
        submitting={statusChange.busy}
        variant="lost"
        onClose={statusChange.closeLostDialog}
        onSubmit={(values) => {
          void statusChange.submitLost({
            reason: values.reason as CrmLossReason,
            customReason: values.customReason,
          });
        }}
      />
    </>
  );
}

export type ProjectDetailShellModalsProps = {
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
    | 'sendAttachmentDialogContext'
    | 'sendAttachmentRecipientOptions'
    | 'sendAttachmentSelectedRecipient'
    | 'onSendAttachmentRecipientChange'
    | 'sendAttachmentSubject'
    | 'setSendAttachmentSubject'
    | 'sendAttachmentMessage'
    | 'setSendAttachmentMessage'
    | 'sendAttachmentSelectedAttachments'
    | 'sendAttachmentSending'
    | 'sendAttachmentFeedback'
    | 'sendAttachmentCanSend'
    | 'closeSendAttachmentDialog'
    | 'addSendAttachmentFiles'
    | 'addSendAttachmentExistingDocument'
    | 'removeSendAttachmentSelected'
    | 'sendAttachmentEmail'
  >;
  pendingDeleteProject: CrmProjectSummary | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  deleteConfirmDisabled?: boolean;
};

export function ProjectDetailShellModals({
  workspace,
  pendingDeleteProject,
  onCloseDelete,
  onConfirmDelete,
  deleteConfirmDisabled = false,
}: ProjectDetailShellModalsProps): ReactElement {
  const detail = content.projectDetail;
  const deleteWorkflowCopy =
    pendingDeleteProject?.parentProjectId != null
      ? detail.subprojects.delete.workflow
      : content.crm.delete.workflow;
  const {
    archiveConfirmTask,
    setArchiveConfirmTask,
    documentUploadConfirm,
    setDocumentUploadConfirm,
    handleConfirmDocumentUpload,
    handleConfirmArchiveTask,
    wf,
    customerNotifyPrompt,
    customerNotifySending,
    customerNotifyFeedback,
    closeCustomerNotifyPrompt,
    sendCustomerNotifyEmail,
    sendAttachmentDialogContext,
    sendAttachmentRecipientOptions,
    sendAttachmentSelectedRecipient,
    onSendAttachmentRecipientChange,
    sendAttachmentSubject,
    setSendAttachmentSubject,
    sendAttachmentMessage,
    setSendAttachmentMessage,
    sendAttachmentSelectedAttachments,
    sendAttachmentSending,
    sendAttachmentFeedback,
    sendAttachmentCanSend,
    closeSendAttachmentDialog,
    addSendAttachmentFiles,
    addSendAttachmentExistingDocument,
    removeSendAttachmentSelected,
    sendAttachmentEmail,
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
      <ConfirmModal
        isOpen={archiveConfirmTask != null}
        onClose={() => setArchiveConfirmTask(null)}
        onConfirm={() => {
          void handleConfirmArchiveTask();
        }}
        title={wf.archiveTaskConfirmTitle}
        message={
          archiveConfirmTask
            ? `“${archiveConfirmTask.title}” will be removed from this ${content.projectDetail.pageTitleFallback.toLocaleLowerCase('en-US')}.`
            : undefined
        }
        confirmLabel={wf.archiveTaskConfirmLabel}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="danger"
      />
      <CrmProjectDeleteWorkflowDialog
        pendingProject={pendingDeleteProject}
        workflowCopy={deleteWorkflowCopy}
        confirmDisabled={deleteConfirmDisabled}
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
      <SendAttachmentDialog
        context={sendAttachmentDialogContext}
        recipientOptions={sendAttachmentRecipientOptions}
        selectedRecipient={sendAttachmentSelectedRecipient}
        onRecipientChange={onSendAttachmentRecipientChange}
        subject={sendAttachmentSubject}
        message={sendAttachmentMessage}
        selectedAttachments={sendAttachmentSelectedAttachments}
        sending={sendAttachmentSending}
        feedback={sendAttachmentFeedback}
        canSend={sendAttachmentCanSend}
        onSubjectChange={setSendAttachmentSubject}
        onMessageChange={setSendAttachmentMessage}
        onAddFiles={addSendAttachmentFiles}
        onAddExistingDocument={addSendAttachmentExistingDocument}
        onRemoveSelectedAttachment={removeSendAttachmentSelected}
        onClose={closeSendAttachmentDialog}
        onSend={() => {
          void sendAttachmentEmail();
        }}
      />
    </>
  );
}
