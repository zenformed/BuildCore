'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmBudgetEntry, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm';
import { archiveCrmWorkflowTask } from '@/application/use-cases/crm';
import { listWorkflowTaskDocuments } from '@/application/use-cases/crm/listWorkflowTaskDocuments';
import { validateWorkflowTaskDocumentUpload } from '@/domain/crm/documentUpload';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { performCrmDirectUpload } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import { useProjectSummaryPatch } from '@/presentation/features/crmProjectDetail/useProjectSummaryPatch';
import { useBudgetSection } from '@/presentation/features/crmProjectDetail/useBudgetSection';
import { useWorkflowTasksSection } from '@/presentation/features/crmProjectDetail/useWorkflowTasksSection';
import type { WorkflowTaskDrawerContext } from '@/presentation/components/CrmProjectDetail/WorkflowTaskDrawer';
import { crmRepositories } from '@/shared/di/container';
import { useWorkflowTaskAssignedNotifyPrompt } from '@/presentation/features/crmProjectDetail/useWorkflowTaskCustomerNotifyPrompt';
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
  const assignedNotify = useWorkflowTaskAssignedNotifyPrompt(project.summary.contact);
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
      const prepared = await performCrmDirectUpload(file, {
        scope: 'workflow_task',
        projectSlug: project.summary.slug,
        workflowTaskId: task.id,
      });
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

  const openCreateTask = useCallback((context: WorkflowTaskDrawerContext) => {
    setTaskDrawer({ open: true, mode: 'create', context, task: null });
  }, []);

  const openEditWorkflowTask = useCallback((task: CrmWorkflowTask) => {
    setTaskDrawer({
      open: true,
      mode: 'edit',
      context: isPaymentWorkflowTask(task) ? 'payment' : 'workflow',
      task,
    });
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
    openEditWorkflowTask,
    closeTaskDrawer,
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
    onProjectSaved: handleProjectSaved,
    onPrimaryPhotoUpdated: handlePrimaryPhotoUpdated,
    refreshRollupIndexes,
  };
}
