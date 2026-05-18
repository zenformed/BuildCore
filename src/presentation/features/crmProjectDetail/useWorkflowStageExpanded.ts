'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { PipelineStageSlug } from '@/domain/crm';
import {
  readWorkflowStageExpanded,
  subscribeWorkflowStageCollapse,
  writeWorkflowStageExpanded,
} from './workflowStageCollapseStorage';

export function useWorkflowStageExpanded(
  projectSlug: string,
  stageSlug: PipelineStageSlug
): { expanded: boolean; toggle: () => void } {
  const expanded = useSyncExternalStore(
    subscribeWorkflowStageCollapse,
    () => readWorkflowStageExpanded(projectSlug, stageSlug),
    () => true
  );

  const toggle = useCallback(() => {
    writeWorkflowStageExpanded(projectSlug, stageSlug, !expanded);
  }, [expanded, projectSlug, stageSlug]);

  return { expanded, toggle };
}
