'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { listCrmWorkflowTasksByProject } from '@/application/use-cases/crm/listCrmWorkflowTasksByProject';
import { getCrmProjectDetailBySlug } from '@/application/use-cases/crm/getCrmProjectDetailBySlug';
import { listWorkflowTaskDocuments } from '@/application/use-cases/crm/listWorkflowTaskDocuments';
import { crmRepositories } from '@/shared/di/container';
import {
  appendWorkflowTaskDocument,
  applyWorkflowTasksToProject,
  patchWorkflowTaskInProject,
  removeWorkflowTaskDocument,
  removeWorkflowTaskFromProject,
  replaceWorkflowTaskDocuments,
} from './workflowTasksSectionState';

export function useWorkflowTasksSection(
  project: CrmProjectDetail,
  setProject: Dispatch<SetStateAction<CrmProjectDetail>>
): {
  refreshWorkflowTasks: () => Promise<void>;
  onWorkflowTaskPatched: (task: CrmWorkflowTask) => void;
  onWorkflowTaskCreated: (task: CrmWorkflowTask) => void;
  onWorkflowTaskArchived: (taskId: string) => void;
  onWorkflowTaskDocumentUploaded: (document: CrmDocumentMetadata) => void;
  onWorkflowTaskDocumentDeleted: (documentId: string) => void;
  syncWorkflowTaskDocuments: (taskId: string) => Promise<void>;
} {
  const refreshWorkflowTasks = useCallback(async () => {
    const [workflowTasks, detail] = await Promise.all([
      listCrmWorkflowTasksByProject(crmRepositories, {
        projectId: project.summary.id,
        projectSlug: project.summary.slug,
      }),
      getCrmProjectDetailBySlug(crmRepositories, project.summary.slug),
    ]);
    setProject((prev) => ({
      ...applyWorkflowTasksToProject(prev, workflowTasks),
      documents: detail?.documents ?? prev.documents,
      manualStageCompletions: detail?.manualStageCompletions ?? prev.manualStageCompletions,
    }));
  }, [project.summary.id, project.summary.slug, setProject]);

  const onWorkflowTaskPatched = useCallback(
    (task: CrmWorkflowTask) => {
      setProject((prev) => patchWorkflowTaskInProject(prev, task));
    },
    [setProject]
  );

  const onWorkflowTaskCreated = useCallback(
    (task: CrmWorkflowTask) => {
      setProject((prev) => patchWorkflowTaskInProject(prev, task));
    },
    [setProject]
  );

  const onWorkflowTaskArchived = useCallback(
    (taskId: string) => {
      setProject((prev) => removeWorkflowTaskFromProject(prev, taskId));
    },
    [setProject]
  );

  const onWorkflowTaskDocumentUploaded = useCallback(
    (document: CrmDocumentMetadata) => {
      setProject((prev) => appendWorkflowTaskDocument(prev, document));
    },
    [setProject]
  );

  const onWorkflowTaskDocumentDeleted = useCallback(
    (documentId: string) => {
      setProject((prev) => removeWorkflowTaskDocument(prev, documentId));
    },
    [setProject]
  );

  const syncWorkflowTaskDocuments = useCallback(
    async (taskId: string) => {
      const taskDocuments = await listWorkflowTaskDocuments(crmRepositories, {
        projectSlug: project.summary.slug,
        workflowTaskId: taskId,
      });
      setProject((prev) => replaceWorkflowTaskDocuments(prev, taskId, taskDocuments));
    },
    [project.summary.slug, setProject]
  );

  return {
    refreshWorkflowTasks,
    onWorkflowTaskPatched,
    onWorkflowTaskCreated,
    onWorkflowTaskArchived,
    onWorkflowTaskDocumentUploaded,
    onWorkflowTaskDocumentDeleted,
    syncWorkflowTaskDocuments,
  };
}
