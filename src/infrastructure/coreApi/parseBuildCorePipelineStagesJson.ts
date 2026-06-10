import type { BuildCorePipelineStagesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import type { OrgPipelineStageRecord } from '@/domain/buildcore/orgPipelineStages';
import type { PipelineStage } from '@/domain/crm/pipelineStage';

function isOrgPipelineStageRecord(value: unknown): value is OrgPipelineStageRecord {
  if (value == null || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.organizationId === 'string' &&
    typeof row.slug === 'string' &&
    typeof row.label === 'string' &&
    typeof row.sortOrder === 'number' &&
    typeof row.isActive === 'boolean'
  );
}

function isPipelineStage(value: unknown): value is PipelineStage {
  if (value == null || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.slug === 'string' &&
    typeof row.label === 'string' &&
    typeof row.sortOrder === 'number'
  );
}

export function parseBuildCorePipelineStagesJson(
  json: unknown
): BuildCorePipelineStagesResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const payload = json as Record<string, unknown>;
  if (!Array.isArray(payload.stages) || !Array.isArray(payload.catalog)) return null;
  if (typeof payload.canManage !== 'boolean') return null;
  if (!payload.stages.every(isOrgPipelineStageRecord)) return null;
  if (!payload.catalog.every(isPipelineStage)) return null;
  return {
    stages: payload.stages,
    catalog: payload.catalog,
    canManage: payload.canManage,
  };
}
