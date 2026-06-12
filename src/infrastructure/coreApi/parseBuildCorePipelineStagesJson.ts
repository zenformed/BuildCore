import type { BuildCorePipelineStagesBothScopesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import type { BuildCorePipelineStagesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import type { OrgPipelineStageRecord } from '@/domain/buildcore/orgPipelineStages';
import type { PipelineStage } from '@/domain/crm/pipelineStage';

function isOrgPipelineStageRecord(value: unknown): value is OrgPipelineStageRecord {
  if (value == null || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.organizationId === 'string' &&
    (row.stageScope === 'project' || row.stageScope === 'subproject') &&
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

function isScopedPipelineStagesResponse(value: unknown): value is BuildCorePipelineStagesResponse {
  if (value == null || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  if (payload.scope !== 'project' && payload.scope !== 'subproject') return false;
  if (!Array.isArray(payload.stages) || !Array.isArray(payload.catalog)) return false;
  if (typeof payload.canManage !== 'boolean') return false;
  if (!payload.stages.every(isOrgPipelineStageRecord)) return false;
  if (!payload.catalog.every(isPipelineStage)) return false;
  return true;
}

export function parseBuildCorePipelineStagesJson(
  json: unknown
): BuildCorePipelineStagesResponse | null {
  return isScopedPipelineStagesResponse(json) ? json : null;
}

export function parseBuildCorePipelineStagesBothScopesJson(
  json: unknown
): BuildCorePipelineStagesBothScopesResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const payload = json as Record<string, unknown>;
  if (typeof payload.canManage !== 'boolean') return null;
  if (!isScopedPipelineStagesResponse(payload.project)) return null;
  if (!isScopedPipelineStagesResponse(payload.subproject)) return null;
  return {
    project: payload.project,
    subproject: payload.subproject,
    canManage: payload.canManage,
  };
}
