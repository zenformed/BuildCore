import type { BuildCorePipelineStagesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import { parseBuildCorePipelineStagesJson } from '@/infrastructure/coreApi/parseBuildCorePipelineStagesJson';
import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export async function fetchBuildCorePipelineStagesBff(
  accessToken: string
): Promise<BuildCorePipelineStagesResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/pipeline-stages'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid workflow stages response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load workflow stages.';
    throw new Error(message);
  }
  const parsed = parseBuildCorePipelineStagesJson(json);
  if (parsed == null) {
    throw new Error('Invalid workflow stages response.');
  }
  return parsed;
}

async function mutateBuildCorePipelineStagesBff(
  accessToken: string,
  path: string,
  init: RequestInit
): Promise<BuildCorePipelineStagesResponse> {
  const res = await fetch(buildCoreAdminFetchUrl(path), buildCoreAdminFetchInit(accessToken, init));
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid workflow stages response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Workflow stage update failed.';
    throw new Error(message);
  }
  const parsed = parseBuildCorePipelineStagesJson(json);
  if (parsed == null) {
    throw new Error('Invalid workflow stages response.');
  }
  return parsed;
}

export async function createBuildCorePipelineStageBff(
  accessToken: string,
  label: string
): Promise<BuildCorePipelineStagesResponse> {
  return mutateBuildCorePipelineStagesBff(accessToken, '/api/internal/organization/pipeline-stages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
}

export async function renameBuildCorePipelineStageBff(
  accessToken: string,
  stageId: string,
  label: string
): Promise<BuildCorePipelineStagesResponse> {
  return mutateBuildCorePipelineStagesBff(
    accessToken,
    `/api/internal/organization/pipeline-stages/${encodeURIComponent(stageId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    }
  );
}

export async function deleteBuildCorePipelineStageBff(
  accessToken: string,
  stageId: string
): Promise<BuildCorePipelineStagesResponse> {
  return mutateBuildCorePipelineStagesBff(
    accessToken,
    `/api/internal/organization/pipeline-stages/${encodeURIComponent(stageId)}`,
    { method: 'DELETE' }
  );
}

export async function reorderBuildCorePipelineStagesBff(
  accessToken: string,
  orderedStageIds: readonly string[]
): Promise<BuildCorePipelineStagesResponse> {
  return mutateBuildCorePipelineStagesBff(
    accessToken,
    '/api/internal/organization/pipeline-stages/reorder',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedStageIds }),
    }
  );
}
