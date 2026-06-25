'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useCrmProjectDeleteActions } from './useCrmProjectDeleteActions';

export function useCrmProjectDeleteConfirmation(input: {
  onProjectDeleted: (projectId: string) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}): {
  pendingDeleteProject: CrmProjectSummary | null;
  setPendingDeleteProject: (project: CrmProjectSummary | null) => void;
  deletingProjectId: string | null;
  canDelete: boolean;
  deleteCopy: (typeof content.crm)['delete'];
  handleConfirmDelete: () => Promise<void>;
} {
  const [pendingDeleteProject, setPendingDeleteProject] = useState<CrmProjectSummary | null>(null);
  const deleteCopy = content.crm.delete;
  const canDelete = canMutateCrmProjectsInCurrentRuntime();

  const { deletingProjectId, deleteProject } = useCrmProjectDeleteActions(input);

  const handleConfirmDelete = useCallback(async () => {
    if (pendingDeleteProject == null) return;
    const project = pendingDeleteProject;
    setPendingDeleteProject(null);
    await deleteProject(project);
  }, [deleteProject, pendingDeleteProject]);

  return {
    pendingDeleteProject,
    setPendingDeleteProject,
    deletingProjectId,
    canDelete,
    deleteCopy,
    handleConfirmDelete,
  };
}
