import { completedStagesBefore, type CrmProjectDetail } from '@/domain/crm';
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
  return {
    ...detail,
    stageProgress: {
      currentStageSlug: detail.summary.currentStageSlug,
      completedStageSlugs: completedStagesBefore(detail.summary.currentStageSlug),
    },
  };
}
