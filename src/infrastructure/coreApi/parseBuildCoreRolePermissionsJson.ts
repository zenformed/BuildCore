import type {
  BuildCorePermissionDomain,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionRow,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';
import { parseBuildCorePermissionDomain } from '@/domain/buildcore/rolePermissions';

export function parseBuildCoreRolePermissionsJson(
  json: unknown,
  expectedDomain?: BuildCorePermissionDomain
): BuildCoreRolePermissionsResponse | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const domain = parseBuildCorePermissionDomain(
    typeof o.domain === 'string' ? o.domain : null
  );
  if (domain == null) return null;
  if (expectedDomain != null && domain !== expectedDomain) return null;
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
      typeof r.canUpload !== 'boolean' ||
      typeof r.canDownload !== 'boolean' ||
      typeof r.canSendFiles !== 'boolean' ||
      typeof r.canViewAllStages !== 'boolean'
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
      canDownload: r.canDownload,
      canSendFiles: r.canSendFiles,
      canViewAllStages: r.canViewAllStages,
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
    domain,
    actorRole,
    editableRoleKeys,
    rows,
  };
}

export function parseBuildCoreRolePermissionPatchRowJson(
  json: unknown,
  domain: BuildCorePermissionDomain
): BuildCoreRolePermissionRow | null {
  if (json == null || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const parsed = parseBuildCoreRolePermissionsJson(
    {
      domain,
      actorRole: 'owner',
      editableRoleKeys: [],
      rows: [o.row],
    },
    domain
  );
  if (parsed == null || parsed.rows.length !== 1) return null;
  return parsed.rows[0];
}
