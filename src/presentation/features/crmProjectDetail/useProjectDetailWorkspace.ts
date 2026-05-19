'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
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
import type { WorkflowTaskDrawerContext } from '@/presentation/components/CrmProjectDetail/WorkflowTaskDrawer';
import { crmRepositories } from '@/shared/di/container';

export type ProjectDetailToast = { kind: 'success' | 'error'; message: string };

export function useProjectDetailWorkspace(
  initialProject: CrmProjectDetail,
  onRefresh: () => Promise<void>
) {
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

  const handleProjectSaved = useCallback((next: CrmProjectDetail) => {
    setProject(next);
    setToast({ kind: 'success', message: content.projectDetail.saveSuccess });
  }, []);

  const handleTaskSaved = useCallback(async () => {
    try {
      await onRefresh();
      setToast({ kind: 'success', message: content.projectDetail.saveSuccess });
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  }, [onRefresh]);

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
      await uploadWorkflowTaskDocument(crmRepositories, {
        projectSlug: project.summary.slug,
        workflowTaskId: task.id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        body: buffer,
      });
      await onRefresh();
      setToast({ kind: 'success', message: wf.documentUploadSuccess });
    } catch (err) {
      setToast({ kind: 'error', message: mapDocumentUploadError(err) });
    }
  }, [
    documentUploadConfirm,
    mapDocumentUploadError,
    onRefresh,
    project.summary.slug,
    wf.documentUploadSuccess,
  ]);

  const handleConfirmArchiveTask = useCallback(async () => {
    if (!archiveConfirmTask) return;
    try {
      await archiveCrmWorkflowTask(crmRepositories, archiveConfirmTask.id);
      await onRefresh();
      setToast({ kind: 'success', message: wf.archiveTaskSuccess });
    } catch {
      setToast({ kind: 'error', message: wf.archiveTaskFailed });
    }
  }, [archiveConfirmTask, onRefresh, wf.archiveTaskFailed, wf.archiveTaskSuccess]);

  const openCreateTask = useCallback((context: WorkflowTaskDrawerContext) => {
    setTaskDrawer({ open: true, mode: 'create', context, task: null });
  }, []);

  const closeTaskDrawer = useCallback(() => {
    setTaskDrawer({ open: false, mode: 'create', context: 'workflow', task: null });
  }, []);

  const { savingField, patchField } = useProjectSummaryPatch(
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
    handleTaskSaved,
    handleTaskDocumentDrop,
    handleConfirmDocumentUpload,
    handleConfirmArchiveTask,
    openCreateTask,
    closeTaskDrawer,
    wf,
  };
}
