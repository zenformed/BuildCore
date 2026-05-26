'use client';

import { useCallback } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';

export function useGuardedWorkflowTaskDocumentDrop(
  onTaskDocumentDrop: (task: CrmWorkflowTask, file: File) => void,
  onDenied?: (message: string) => void
): (task: CrmWorkflowTask, file: File) => void {
  const { permissions, isReady } = useBuildCoreWorkflowTaskAccess();
  const wf = content.projectDetail.workflow;

  return useCallback(
    (task: CrmWorkflowTask, file: File) => {
      if (!isReady || !permissions.canUpload) {
        onDenied?.(wf.noUploadPermission);
        return;
      }
      onTaskDocumentDrop(task, file);
    },
    [isReady, onDenied, onTaskDocumentDrop, permissions.canUpload, wf.noUploadPermission]
  );
}
