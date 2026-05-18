import { applyPaymentBalanceToProjectDetail, completedStagesThrough, type CrmProjectDetail } from '@/domain/crm';
import { getMockCrmProjectDetailById, getMockCrmProjectDetailBySlug } from '@/platform/mock/crm';

const projectOverrides = new Map<string, CrmProjectDetail>();

export function getEffectiveMockProjectDetailBySlug(slug: string): CrmProjectDetail | null {
  return projectOverrides.get(slug) ?? getMockCrmProjectDetailBySlug(slug) ?? null;
}

export function getEffectiveMockProjectDetailById(id: string): CrmProjectDetail | null {
  for (const detail of projectOverrides.values()) {
    if (detail.summary.id === id) return detail;
  }
  return getMockCrmProjectDetailById(id) ?? null;
}

export function saveMockProjectDetail(slug: string, detail: CrmProjectDetail): void {
  projectOverrides.set(slug, withStageProgress(detail));
}

function withStageProgress(detail: CrmProjectDetail): CrmProjectDetail {
  const balanced = applyPaymentBalanceToProjectDetail(detail);
  return {
    ...balanced,
    stageProgress: {
      currentStageSlug: balanced.summary.currentStageSlug,
      completedStageSlugs: completedStagesThrough(balanced.summary.currentStageSlug),
    },
  };
}
