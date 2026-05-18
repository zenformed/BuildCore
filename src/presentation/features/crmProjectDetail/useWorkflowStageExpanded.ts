'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { WorkflowStageCollapseKey } from '@/domain/crm';
import {
  readWorkflowStageExpanded,
  subscribeWorkflowStageCollapse,
  writeWorkflowStageExpanded,
} from './workflowStageCollapseStorage';

export function useWorkflowStageExpanded(
  projectSlug: string,
  collapseKey: WorkflowStageCollapseKey
): { expanded: boolean; toggle: () => void } {
  const expanded = useSyncExternalStore(
    subscribeWorkflowStageCollapse,
    () => readWorkflowStageExpanded(projectSlug, collapseKey),
    () => true
  );

  const toggle = useCallback(() => {
    writeWorkflowStageExpanded(projectSlug, collapseKey, !expanded);
  }, [collapseKey, expanded, projectSlug]);

  return { expanded, toggle };
}
