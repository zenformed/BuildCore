'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmBudgetEntry, CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask, PipelineStageSlug } from '@/domain/crm';
import { archiveCrmWorkflowTask } from '@/application/use-cases/crm';
import { listWorkflowTaskDocuments } from '@/application/use-cases/crm/listWorkflowTaskDocuments';
import { validateWorkflowTaskDocumentUpload } from '@/domain/crm/documentUpload';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  performCrmDirectUploads,
} from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import { useProjectSummaryPatch } from '@/presentation/features/crmProjectDetail/useProjectSummaryPatch';
import { useBudgetSection } from '@/presentation/features/crmProjectDetail/useBudgetSection';
import { useWorkflowTasksSection } from '@/presentation/features/crmProjectDetail/useWorkflowTasksSection';
import type { WorkflowTaskModalContext } from '@/presentation/components/CrmProjectDetail/WorkflowTaskModal';
import { isPaymentWorkflowTask } from '@/domain/crm';
import { crmRepositories } from '@/shared/di/container';
import { useWorkflowTaskAssignedNotifyPrompt } from '@/presentation/features/crmProjectDetail/useWorkflowTaskCustomerNotifyPrompt';
import { useSendAttachmentDialog } from '@/presentation/features/communications/useSendAttachmentDialog';
import { DEMO_COMMUNICATION_SIMULATED_MESSAGE } from '@/infrastructure/demo/demoSafetyPolicy';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { buildWorkflowTaskSendAttachmentContext } from '@/presentation/features/communications/workflowTaskSendAttachmentAdapter';
import { buildPaymentSendAttachmentContext } from '@/presentation/features/communications/paymentSendAttachmentAdapter';
import { buildBudgetEntrySendAttachmentContext } from '@/presentation/features/communications/budgetEntrySendAttachmentAdapter';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';

export type ProjectDetailToast = { kind: 'success' | 'error'; message: string };

export function useProjectDetailWorkspace(initialProject: CrmProjectDetail) {
  const [project, setProject] = useState(initialProject);
  const [toast, setToast] = useState<ProjectDetailToast | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    context: WorkflowTaskModalContext;
    task: CrmWorkflowTask | null;
    defaultStageSlug: PipelineStageSlug | null;
  }>({
    open: false,
    mode: 'create',
    context: 'workflow',
    task: null,
    defaultStageSlug: null,
  });
  const [archiveConfirmTask, setArchiveConfirmTask] = useState<CrmWorkflowTask | null>(null);
  const [documentUploadConfirm, setDocumentUploadConfirm] = useState<{
    task: CrmWorkflowTask;
    file: File;
  } | null>(null);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const {
    refreshWorkflowTasks,
    onWorkflowTaskPatched,
    onWorkflowTaskCreated,
    onWorkflowTaskArchived,
    onWorkflowTaskDocumentUploaded,
    onWorkflowTaskDocumentDeleted,
    onDocumentsDeleted,
    syncWorkflowTaskDocuments,
  } = useWorkflowTasksSection(project, setProject);
  const {
    refreshBudgetSection,
    onBudgetEntryPatched,
    onBudgetEntryCreated,
    onBudgetEntryDeleted,
    onBudgetEntryDocumentUploaded,
    onBudgetEntryDocumentDeleted,
  } = useBudgetSection(project, setProject);
  const assignedNotify = useWorkflowTaskAssignedNotifyPrompt(project.summary.contact);
  const assignmentCatalog = useAssignmentIdentityCatalog();
  const sendAttachment = useSendAttachmentDialog({
    onSent: () => {
      void refreshWorkflowTasks();
      setToast({
        kind: 'success',
        message: isDemoRuntimeClient()
          ? DEMO_COMMUNICATION_SIMULATED_MESSAGE
          : content.projectDetail.communications.sendAttachment.success,
      });
    },
    onError: (message) => {
      setToast({ kind: 'error', message });
    },
  });
  const { refetch: refetchRollupIndexes } = useCrmPaymentTasksIndexContext();

  const refreshRollupIndexes = useCallback(() => {
    void refetchRollupIndexes();
  }, [refetchRollupIndexes]);

  const refreshBudgetEntriesIndex = useCallback(() => {
    refreshRollupIndexes();
  }, [refreshRollupIndexes]);

  const handleProjectSaved = useCallback((next: CrmProjectDetail) => {
    setProject(next);
    setToast({ kind: 'success', message: content.projectDetail.saveSuccess });
  }, []);

  const handlePrimaryPhotoUpdated = useCallback((summary: CrmProjectDetail['summary']) => {
    setProject((prev) => ({ ...prev, summary: { ...prev.summary, ...summary } }));
  }, []);

  const handleWorkflowTaskPatched = useCallback(
    async (task: CrmWorkflowTask) => {
      onWorkflowTaskPatched(task);
      refreshRollupIndexes();
    },
    [onWorkflowTaskPatched, refreshRollupIndexes]
  );

  const handleWorkflowTaskCreated = useCallback(
    async (task: CrmWorkflowTask) => {
      onWorkflowTaskCreated(task);
      refreshRollupIndexes();
      setToast({ kind: 'success', message: content.projectDetail.workflow.taskAddedSuccess });
    },
    [onWorkflowTaskCreated, refreshRollupIndexes]
  );

  const handleBudgetEntryPatched = useCallback(
    async (entry: CrmBudgetEntry) => {
      onBudgetEntryPatched(entry);
      refreshBudgetEntriesIndex();
    },
    [onBudgetEntryPatched, refreshBudgetEntriesIndex]
  );

  const handleBudgetEntryCreated = useCallback(
    async (entry: CrmBudgetEntry) => {
      onBudgetEntryCreated(entry);
      refreshBudgetEntriesIndex();
    },
    [onBudgetEntryCreated, refreshBudgetEntriesIndex]
  );

  const handleBudgetEntryDeleted = useCallback(
    async (entryId: string) => {
      onBudgetEntryDeleted(entryId);
      refreshBudgetEntriesIndex();
    },
    [onBudgetEntryDeleted, refreshBudgetEntriesIndex]
  );

  const wf = content.projectDetail.workflow;

  const mapDocumentUploadError = useCallback(
    (err: unknown): string => {
      return err instanceof Error ? err.message : wf.documentUploadFailed;
    },
    [wf.documentUploadFailed]
  );

  const handleTaskDocumentDrop = useCallback((task: CrmWorkflowTask, file: File) => {
    const validation = validateWorkflowTaskDocumentUpload({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });
    if (!validation.ok) {
      setToast({ kind: 'error', message: validation.message });
      return;
    }
    setDocumentUploadConfirm({ task, file });
  }, []);

  const handleConfirmDocumentUpload = useCallback(async () => {
    if (!documentUploadConfirm) return;
    const { task, file } = documentUploadConfirm;
    try {
      const result = await performCrmDirectUploads({
        files: [file],
        uploadScope: {
          scope: 'workflow_task',
          projectSlug: project.summary.slug,
          workflowTaskId: task.id,
        },
      });
      const prepared = result.succeeded[0];
      if (prepared == null) {
        throw new Error(result.failed[0]?.message ?? result.skipped[0]?.message ?? wf.documentUploadFailed);
      }
      const documents = await listWorkflowTaskDocuments(crmRepositories, {
        projectSlug: project.summary.slug,
        workflowTaskId: task.id,
      });
      const document = documents.find((doc) => doc.id === prepared.documentId);
      if (document == null) {
        throw new Error(wf.documentUploadFailed);
      }
      onWorkflowTaskDocumentUploaded(document);
      setToast({ kind: 'success', message: wf.documentUploadSuccess });
    } catch (err) {
      setToast({ kind: 'error', message: mapDocumentUploadError(err) });
    }
  }, [
    documentUploadConfirm,
    mapDocumentUploadError,
    onWorkflowTaskDocumentUploaded,
    project.summary.slug,
    wf.documentUploadFailed,
    wf.documentUploadSuccess,
  ]);

  const handleConfirmArchiveTask = useCallback(async () => {
    if (!archiveConfirmTask) return;
    const archivedTask = archiveConfirmTask;
    try {
      await archiveCrmWorkflowTask(crmRepositories, archivedTask.id);
      onWorkflowTaskArchived(archivedTask.id);
      refreshRollupIndexes();
      setArchiveConfirmTask(null);
      setToast({ kind: 'success', message: wf.archiveTaskSuccess });
    } catch {
      setToast({ kind: 'error', message: wf.archiveTaskFailed });
    }
  }, [
    archiveConfirmTask,
    onWorkflowTaskArchived,
    refreshRollupIndexes,
    wf.archiveTaskFailed,
    wf.archiveTaskSuccess,
  ]);

  const openCreateWorkflowTask = useCallback(
    (input: { context: WorkflowTaskModalContext; stageSlug?: PipelineStageSlug }) => {
      setTaskModal({
        open: true,
        mode: 'create',
        context: input.context,
        task: null,
        defaultStageSlug: input.stageSlug ?? null,
      });
    },
    []
  );

  const openEditWorkflowTask = useCallback((task: CrmWorkflowTask) => {
    setTaskModal({
      open: true,
      mode: 'edit',
      context: isPaymentWorkflowTask(task) ? 'payment' : 'workflow',
      task,
      defaultStageSlug: null,
    });
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModal({
      open: false,
      mode: 'create',
      context: 'workflow',
      task: null,
      defaultStageSlug: null,
    });
  }, []);

  const openSendAttachmentDialogForTask = useCallback(
    (task: CrmWorkflowTask, taskDocuments: readonly CrmDocumentMetadata[] = []) => {
      const context = buildWorkflowTaskSendAttachmentContext(
        project,
        task,
        taskDocuments,
        assignmentCatalog
      );
      if (context == null) return;
      sendAttachment.openSendAttachmentDialog(context);
    },
    [assignmentCatalog, project, sendAttachment]
  );

  const openSendAttachmentDialogForPayment = useCallback(
    (payment: CrmWorkflowTask, paymentDocuments: readonly CrmDocumentMetadata[] = []) => {
      const context = buildPaymentSendAttachmentContext(
        project,
        payment,
        paymentDocuments,
        assignmentCatalog
      );
      if (context == null) return;
      sendAttachment.openSendAttachmentDialog(context);
    },
    [assignmentCatalog, project, sendAttachment]
  );

  const openSendAttachmentDialogForBudgetEntry = useCallback(
    (
      entry: CrmBudgetEntry,
      entryDocuments: readonly CrmDocumentMetadata[] = []
    ) => {
      const context = buildBudgetEntrySendAttachmentContext(
        project,
        entry,
        entryDocuments,
        assignmentCatalog
      );
      if (context == null) return;
      sendAttachment.openSendAttachmentDialog(context);
    },
    [assignmentCatalog, project, sendAttachment]
  );

  const { savingField, customFieldSavingKey, patchField, patchIndustry, patchCustomFieldValue } =
    useProjectSummaryPatch(
    project,
    handleProjectSaved,
    (message) => setToast({ kind: 'error', message })
  );

  return {
    project,
    toast,
    setToast,
    documentsOpen,
    setDocumentsOpen,
    taskModal,
    archiveConfirmTask,
    setArchiveConfirmTask,
    documentUploadConfirm,
    setDocumentUploadConfirm,
    savingField,
    customFieldSavingKey,
    patchField,
    patchIndustry,
    patchCustomFieldValue,
    handleWorkflowTaskPatched,
    handleWorkflowTaskCreated,
    refreshWorkflowTasks,
    onWorkflowTaskDocumentUploaded,
    onWorkflowTaskDocumentDeleted,
    onDocumentsDeleted,
    syncWorkflowTaskDocuments,
    handleBudgetEntryPatched,
    handleBudgetEntryCreated,
    handleBudgetEntryDeleted,
    refreshBudgetSection,
    onBudgetEntryDocumentUploaded,
    onBudgetEntryDocumentDeleted,
    handleTaskDocumentDrop,
    handleConfirmDocumentUpload,
    handleConfirmArchiveTask,
    openCreateWorkflowTask,
    openEditWorkflowTask,
    closeTaskModal,
    wf,
    assignedNotifyPrompt: assignedNotify.assignedNotifyPrompt,
    assignedNotifySending: assignedNotify.assignedNotifySending,
    assignedNotifyFeedback: assignedNotify.assignedNotifyFeedback,
    closeAssignedNotifyPrompt: assignedNotify.closeAssignedNotifyPrompt,
    requestAssignedNotifyAfterAssigneeChange:
      assignedNotify.requestAssignedNotifyAfterAssigneeChange,
    openAssignedNotifyPromptForTask: assignedNotify.openAssignedNotifyPromptForTask,
    sendAssignedNotifyEmail: assignedNotify.sendAssignedNotifyEmail,
    customerNotifyPrompt: assignedNotify.customerNotifyPrompt,
    customerNotifySending: assignedNotify.customerNotifySending,
    customerNotifyFeedback: assignedNotify.customerNotifyFeedback,
    closeCustomerNotifyPrompt: assignedNotify.closeCustomerNotifyPrompt,
    requestCustomerNotifyAfterAssigneeChange:
      assignedNotify.requestCustomerNotifyAfterAssigneeChange,
    openCustomerNotifyPromptForTask: assignedNotify.openCustomerNotifyPromptForTask,
    sendCustomerNotifyEmail: assignedNotify.sendCustomerNotifyEmail,
    sendAttachmentDialogContext: sendAttachment.dialogContext,
    sendAttachmentRecipientOptions: sendAttachment.recipientOptions,
    sendAttachmentSelectedRecipient: sendAttachment.selectedRecipient,
    onSendAttachmentRecipientChange: sendAttachment.onRecipientChange,
    sendAttachmentSubject: sendAttachment.subject,
    setSendAttachmentSubject: sendAttachment.setSubject,
    sendAttachmentMessage: sendAttachment.message,
    setSendAttachmentMessage: sendAttachment.setMessage,
    sendAttachmentSelectedAttachments: sendAttachment.selectedAttachments,
    sendAttachmentSending: sendAttachment.sending,
    sendAttachmentFeedback: sendAttachment.feedback,
    sendAttachmentCanSend: sendAttachment.canSend,
    closeSendAttachmentDialog: sendAttachment.closeDialog,
    addSendAttachmentFiles: sendAttachment.addFiles,
    addSendAttachmentExistingDocument: sendAttachment.addExistingDocument,
    removeSendAttachmentSelected: sendAttachment.removeSelectedAttachment,
    sendAttachmentEmail: sendAttachment.sendAttachment,
    openSendAttachmentDialogForTask,
    openSendAttachmentDialogForPayment,
    openSendAttachmentDialogForBudgetEntry,
    onProjectSaved: handleProjectSaved,
    onPrimaryPhotoUpdated: handlePrimaryPhotoUpdated,
    refreshRollupIndexes,
  };
}
