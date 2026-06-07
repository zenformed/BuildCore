import {
  buildCoreAdminFetchInit,
  buildCoreAdminFetchUrl,
} from '@/infrastructure/coreApi/buildCoreAdminFetch';

export type BuildCoreWorkflowTaskMemberVisibilityResponse = {
  readonly onlyAssignedUserCanView: boolean;
  readonly canEdit: boolean;
  readonly memberRoleUserIds: readonly string[];
};

export function parseBuildCoreWorkflowTaskMemberVisibilityJson(
  json: unknown
): BuildCoreWorkflowTaskMemberVisibilityResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (typeof o.onlyAssignedUserCanView !== 'boolean' || typeof o.canEdit !== 'boolean') {
    return null;
  }
  return {
    onlyAssignedUserCanView: o.onlyAssignedUserCanView,
    canEdit: o.canEdit,
    memberRoleUserIds: Array.isArray(o.memberRoleUserIds)
      ? o.memberRoleUserIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export async function fetchBuildCoreWorkflowTaskMemberVisibilityBff(
  accessToken: string
): Promise<BuildCoreWorkflowTaskMemberVisibilityResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/workflow-task-member-visibility'),
    buildCoreAdminFetchInit(accessToken, { method: 'GET' })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid workflow task visibility settings response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load workflow task visibility settings.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskMemberVisibilityJson(json);
  if (parsed == null) {
    throw new Error('Invalid workflow task visibility settings response.');
  }
  return parsed;
}

export async function patchBuildCoreWorkflowTaskMemberVisibilityBff(
  accessToken: string,
  onlyAssignedUserCanView: boolean
): Promise<BuildCoreWorkflowTaskMemberVisibilityResponse> {
  const res = await fetch(
    buildCoreAdminFetchUrl('/api/internal/organization/workflow-task-member-visibility'),
    buildCoreAdminFetchInit(accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onlyAssignedUserCanView }),
    })
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid workflow task visibility settings response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not save workflow task visibility settings.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreWorkflowTaskMemberVisibilityJson(json);
  if (parsed == null) {
    throw new Error('Invalid workflow task visibility settings response.');
  }
  return parsed;
}
