'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmBudgetEntry, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { archiveCrmWorkflowTask } from '@/application/use-cases/crm';
import { uploadWorkflowTaskDocument } from '@/application/use-cases/crm/uploadWorkflowTaskDocument';
import {
  STORAGE_LIMIT_EXCEEDED_CODE,
  validateWorkflowTaskDocumentUpload,
} from '@/domain/crm/documentUpload';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectSummaryPatch } from '@/presentation/features/crmProjectDetail/useProjectSummaryPatch';
import { useBudgetSection } from '@/presentation/features/crmProjectDetail/useBudgetSection';
import { useWorkflowTasksSection } from '@/presentation/features/crmProjectDetail/useWorkflowTasksSection';
import type { WorkflowTaskDrawerContext } from '@/presentation/components/CrmProjectDetail/WorkflowTaskDrawer';
import { crmRepositories } from '@/shared/di/container';
import { useWorkflowTaskCustomerNotifyPrompt } from '@/presentation/features/crmProjectDetail/useWorkflowTaskCustomerNotifyPrompt';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';

export type ProjectDetailToast = { kind: 'success' | 'error'; message: string };

export function useProjectDetailWorkspace(initialProject: CrmProjectDetail) {
  const [project, setProject] = useState(initialProject);
  const [toast, setToast] = useState<ProjectDetailToast | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [taskDrawer, setTaskDrawer] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    context: WorkflowTaskDrawerContext;
    task: CrmWorkflowTask | null;
  }>({ open: false, mode: 'create', context: 'workflow', task: null });
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
  const customerNotify = useWorkflowTaskCustomerNotifyPrompt(project.summary.contact);
  const { refetch: refetchFinancialRollupIndexes } = useCrmPaymentTasksIndexContext();

  const refreshPaymentTasksIndexIfPayment = useCallback(
    (task: Pick<CrmWorkflowTask, 'amountCents'>) => {
      if (isPaymentWorkflowTask(task)) {
        void refetchFinancialRollupIndexes();
      }
    },
    [refetchFinancialRollupIndexes]
  );

  const refreshBudgetEntriesIndex = useCallback(() => {
    void refetchFinancialRollupIndexes();
  }, [refetchFinancialRollupIndexes]);

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
      refreshPaymentTasksIndexIfPayment(task);
    },
    [onWorkflowTaskPatched, refreshPaymentTasksIndexIfPayment]
  );

  const handleWorkflowTaskCreated = useCallback(
    async (task: CrmWorkflowTask) => {
      onWorkflowTaskCreated(task);
      refreshPaymentTasksIndexIfPayment(task);
      setToast({ kind: 'success', message: content.projectDetail.workflow.taskAddedSuccess });
    },
    [onWorkflowTaskCreated, refreshPaymentTasksIndexIfPayment]
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
      if (err instanceof CrmDocumentServiceError) {
        if (err.code === STORAGE_LIMIT_EXCEEDED_CODE) return wf.storageLimitExceeded;
        return err.message;
      }
      if (err instanceof CrmApiError) {
        if (err.code === STORAGE_LIMIT_EXCEEDED_CODE) return wf.storageLimitExceeded;
        return err.message;
      }
      return err instanceof Error ? err.message : wf.documentUploadFailed;
    },
    [wf.documentUploadFailed, wf.storageLimitExceeded]
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
      const buffer = await file.arrayBuffer();
      const result = await uploadWorkflowTaskDocument(crmRepositories, {
        projectSlug: project.summary.slug,
        workflowTaskId: task.id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        body: buffer,
      });
      onWorkflowTaskDocumentUploaded(result.document);
      setToast({ kind: 'success', message: wf.documentUploadSuccess });
    } catch (err) {
      setToast({ kind: 'error', message: mapDocumentUploadError(err) });
    }
  }, [
    documentUploadConfirm,
    mapDocumentUploadError,
    onWorkflowTaskDocumentUploaded,
    project.summary.slug,
    wf.documentUploadSuccess,
  ]);

  const handleConfirmArchiveTask = useCallback(async () => {
    if (!archiveConfirmTask) return;
    const archivedTask = archiveConfirmTask;
    try {
      await archiveCrmWorkflowTask(crmRepositories, archivedTask.id);
      onWorkflowTaskArchived(archivedTask.id);
      refreshPaymentTasksIndexIfPayment(archivedTask);
      setArchiveConfirmTask(null);
      setToast({ kind: 'success', message: wf.archiveTaskSuccess });
    } catch {
      setToast({ kind: 'error', message: wf.archiveTaskFailed });
    }
  }, [
    archiveConfirmTask,
    onWorkflowTaskArchived,
    refreshPaymentTasksIndexIfPayment,
    wf.archiveTaskFailed,
    wf.archiveTaskSuccess,
  ]);

  const openCreateTask = useCallback((context: WorkflowTaskDrawerContext) => {
    setTaskDrawer({ open: true, mode: 'create', context, task: null });
  }, []);

  const closeTaskDrawer = useCallback(() => {
    setTaskDrawer({ open: false, mode: 'create', context: 'workflow', task: null });
  }, []);

  const { savingField, patchField, patchIndustry } = useProjectSummaryPatch(
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
    taskDrawer,
    archiveConfirmTask,
    setArchiveConfirmTask,
    documentUploadConfirm,
    setDocumentUploadConfirm,
    savingField,
    patchField,
    patchIndustry,
    handleWorkflowTaskPatched,
    handleWorkflowTaskCreated,
    refreshWorkflowTasks,
    onWorkflowTaskDocumentUploaded,
    onWorkflowTaskDocumentDeleted,
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
    openCreateTask,
    closeTaskDrawer,
    wf,
    customerNotifyPrompt: customerNotify.customerNotifyPrompt,
    customerNotifySending: customerNotify.customerNotifySending,
    customerNotifyFeedback: customerNotify.customerNotifyFeedback,
    closeCustomerNotifyPrompt: customerNotify.closeCustomerNotifyPrompt,
    requestCustomerNotifyAfterAssigneeChange:
      customerNotify.requestCustomerNotifyAfterAssigneeChange,
    sendCustomerNotifyEmail: customerNotify.sendCustomerNotifyEmail,
    onProjectSaved: handleProjectSaved,
    onPrimaryPhotoUpdated: handlePrimaryPhotoUpdated,
  };
}
