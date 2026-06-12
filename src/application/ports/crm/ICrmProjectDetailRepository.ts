import type { CrmProjectDetail, UpdateCrmProjectInput, PipelineStageSlug } from '@/domain/crm';
import type { CrmRepositoryResult } from '@/infrastructure/crm/types';

export type CrmProjectRouteScope = {
  readonly parentSlug?: string;
};

/** Project hub aggregate (summary + nested collections). */
export interface ICrmProjectDetailRepository {
  getBySlug(slug: string): CrmRepositoryResult<CrmProjectDetail | null>;
  getById(id: string): CrmRepositoryResult<CrmProjectDetail | null>;
  updateBySlug(slug: string, input: UpdateCrmProjectInput): CrmRepositoryResult<CrmProjectDetail | null>;
  setCompletion(slug: string, complete: boolean): CrmRepositoryResult<CrmProjectDetail | null>;
  markStageCompleteManual(
    slug: string,
    stageSlug: PipelineStageSlug,
    scope?: CrmProjectRouteScope
  ): CrmRepositoryResult<CrmProjectDetail | null>;
  clearStageManualCompletion(
    slug: string,
    stageSlug: PipelineStageSlug,
    scope?: CrmProjectRouteScope
  ): CrmRepositoryResult<CrmProjectDetail | null>;
  markEmptyStagesCompleteBatch(
    slug: string,
    scope?: CrmProjectRouteScope
  ): CrmRepositoryResult<CrmProjectDetail | null>;
}
