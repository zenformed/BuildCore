import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { MOCK_CRM_PROJECT_DETAILS } from '@/platform/mock/crm';
import { getEffectiveMockProjectDetailBySlug } from './mockCrmMutationStore';

export function buildMockProjectWorkflowProgressInputIndex(): CrmProjectWorkflowProgressInputIndex {
  const index = new Map<
    string,
    import('@/domain/crm/projectWorkflowProgressInput').CrmProjectWorkflowProgressInput
  >();

  for (const seed of MOCK_CRM_PROJECT_DETAILS) {
    const effective = getEffectiveMockProjectDetailBySlug(seed.summary.slug);
    const detail = effective ?? seed;
    index.set(detail.summary.id, {
      tasks: detail.workflowTasks.map((task) => ({
        stageSlug: task.stageSlug,
        status: task.status,
        amountCents: task.amountCents,
      })),
      manualStageCompletionSlugs: detail.manualStageCompletions.map(
        (completion) => completion.stageSlug
      ),
    });
  }

  return index;
}
