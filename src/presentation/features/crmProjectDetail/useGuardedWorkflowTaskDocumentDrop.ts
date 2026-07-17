'use client';

import { useCallback } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';

export function useGuardedWorkflowTaskDocumentDrop(
  onTaskDocumentDrop: (task: CrmWorkflowTask, file: File) => void,
  onDenied?: (message: string) => void
): (task: CrmWorkflowTask, file: File) => void {
  const { permissions, isReady } = useBuildCoreWorkflowTaskAccess();
  const { projectMutationsLocked, guardProjectEdit } = useProjectDetailShell();
  const wf = content.projectDetail.workflow;

  return useCallback(
    (task: CrmWorkflowTask, file: File) => {
      if (!isReady || !permissions.canUpload) {
        onDenied?.(wf.noUploadPermission);
        return;
      }
      if (projectMutationsLocked) {
        guardProjectEdit(() => {
          onTaskDocumentDrop(task, file);
        });
        return;
      }
      onTaskDocumentDrop(task, file);
    },
    [
      guardProjectEdit,
      isReady,
      onDenied,
      onTaskDocumentDrop,
      permissions.canUpload,
      projectMutationsLocked,
      wf.noUploadPermission,
    ]
  );
}
