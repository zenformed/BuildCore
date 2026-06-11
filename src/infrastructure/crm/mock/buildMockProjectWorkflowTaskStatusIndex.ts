import type { WorkflowTaskStatus } from '@/domain/crm';
import type { CrmProjectWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';
import { MOCK_CRM_PROJECT_DETAILS } from '@/platform/mock/crm';
import { getEffectiveMockProjectDetailBySlug } from './mockCrmMutationStore';

export function buildMockProjectWorkflowTaskStatusIndex(): CrmProjectWorkflowTaskStatusIndex {
  const index = new Map<string, Set<WorkflowTaskStatus>>();

  for (const seed of MOCK_CRM_PROJECT_DETAILS) {
    const effective = getEffectiveMockProjectDetailBySlug(seed.summary.slug);
    const detail = effective ?? seed;
    const statuses = new Set<WorkflowTaskStatus>();

    for (const task of detail.workflowTasks) {
      statuses.add(task.status);
    }

    index.set(detail.summary.id, statuses);
  }

  return index;
}
