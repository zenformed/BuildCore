import type { CrmProjectBudgetEntriesIndex } from '@/domain/crm/projectBudgetRollup';
import { MOCK_CRM_PROJECT_DETAILS } from '@/platform/mock/crm';
import { getEffectiveMockProjectDetailBySlug } from './mockCrmMutationStore';

export function buildMockProjectBudgetEntriesIndex(): CrmProjectBudgetEntriesIndex {
  const index = new Map<string, readonly import('@/domain/crm').CrmBudgetEntry[]>();
  for (const seed of MOCK_CRM_PROJECT_DETAILS) {
    const effective = getEffectiveMockProjectDetailBySlug(seed.summary.slug);
    const detail = effective ?? seed;
    index.set(detail.summary.id, detail.budget.entries);
  }
  return index;
}
