import type {
  BuildCorePermissionColumnId,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionFlags,
  BuildCoreRolePermissionRow,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';

const FLAG_KEYS = [
  'canView',
  'canCreate',
  'canEdit',
  'canDelete',
  'canApprove',
  'canUpload',
] as const;

export function parseBuildCoreRolePermissionsBffJson(
  json: unknown
): BuildCoreRolePermissionsResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (o.domain !== 'workflow_tasks') return null;
  if (!Array.isArray(o.rows) || !Array.isArray(o.editableRoleKeys)) return null;

  const rows: BuildCoreRolePermissionRow[] = [];
  for (const rawRow of o.rows) {
    if (rawRow == null || typeof rawRow !== 'object') return null;
    const r = rawRow as Record<string, unknown>;
    if (r.roleKey !== 'admin' && r.roleKey !== 'coordinator' && r.roleKey !== 'member') {
      return null;
    }
    if (
      typeof r.canView !== 'boolean' ||
      typeof r.canCreate !== 'boolean' ||
      typeof r.canEdit !== 'boolean' ||
      typeof r.canDelete !== 'boolean' ||
      typeof r.canApprove !== 'boolean' ||
      typeof r.canUpload !== 'boolean'
    ) {
      return null;
    }
    rows.push({
      roleKey: r.roleKey,
      canView: r.canView,
      canCreate: r.canCreate,
      canEdit: r.canEdit,
      canDelete: r.canDelete,
      canApprove: r.canApprove,
      canUpload: r.canUpload,
    });
  }

  const editableRoleKeys = o.editableRoleKeys.filter(
    (k): k is BuildCorePermissionRoleKey =>
      k === 'admin' || k === 'coordinator' || k === 'member'
  );

  const actorRole = o.actorRole;
  if (
    actorRole !== 'owner' &&
    actorRole !== 'admin' &&
    actorRole !== 'coordinator' &&
    actorRole !== 'member'
  ) {
    return null;
  }

  return {
    domain: 'workflow_tasks',
    actorRole,
    editableRoleKeys,
    rows,
  };
}

export async function fetchBuildCoreRolePermissionsBff(
  accessToken: string
): Promise<BuildCoreRolePermissionsResponse> {
  const res = await fetch('/api/internal/organization/role-permissions?domain=workflow_tasks', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid permissions response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not load permissions.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreRolePermissionsBffJson(json);
  if (parsed == null) {
    throw new Error('Invalid permissions response.');
  }
  return parsed;
}

export async function patchBuildCoreRolePermissionBff(
  accessToken: string,
  roleKey: BuildCorePermissionRoleKey,
  flags: BuildCoreRolePermissionFlags
): Promise<BuildCoreRolePermissionRow> {
  const res = await fetch(
    `/api/internal/organization/role-permissions/${encodeURIComponent(roleKey)}?domain=workflow_tasks`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flags),
      cache: 'no-store',
    }
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid permissions response.');
  }
  if (!res.ok) {
    const message =
      json != null && typeof json === 'object' && typeof (json as Record<string, unknown>).message === 'string'
        ? String((json as Record<string, unknown>).message)
        : 'Could not update permissions.';
    throw new Error(message);
  }
  const parsed = parseBuildCoreRolePermissionsBffJson({
    domain: 'workflow_tasks',
    actorRole: 'owner',
    editableRoleKeys: [],
    rows: [(json as Record<string, unknown>).row],
  });
  if (parsed == null || parsed.rows.length !== 1) {
    throw new Error('Invalid permissions response.');
  }
  return parsed.rows[0];
}
