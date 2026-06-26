/**
 * Effective BuildCore role permission resolution for payments and budget domains.
 */

import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import type {
  BuildCorePermissionDomain,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionFlags,
  BuildCoreRolePermissionRow,
} from './rolePermissions';
import {
  DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  UNRESTRICTED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  defaultBuildCoreRolePermissionFlags,
  isBuildCoreWorkflowTaskOwnerUnrestricted,
  organizationRoleToBuildCorePermissionRoleKey,
} from './workflowTaskPermissions';

export type BuildCoreRoleAccess = BuildCoreRolePermissionFlags & {
  readonly actorRole: OrganizationMemberRole | null;
  readonly roleKey: BuildCorePermissionRoleKey | null;
};

export type BuildCorePaymentAccess = BuildCoreRoleAccess & {
  readonly onlyAssignedUserCanView: boolean;
  readonly viewerUserId: string | null;
  readonly memberRoleUserIds: readonly string[];
};

export function defaultBuildCoreRolePermissionFlagsForDomain(
  domain: BuildCorePermissionDomain,
  roleKey: BuildCorePermissionRoleKey
): BuildCoreRolePermissionFlags {
  const base = defaultBuildCoreRolePermissionFlags(roleKey);
  if (domain !== 'workflow_tasks' && roleKey === 'member') {
    return { ...base, canView: false };
  }
  return base;
}

export function pickBuildCoreRolePermissionRowForDomain(
  domain: BuildCorePermissionDomain,
  rows: readonly BuildCoreRolePermissionRow[],
  roleKey: BuildCorePermissionRoleKey
): BuildCoreRolePermissionRow {
  const match = rows.find((row) => row.roleKey === roleKey);
  if (match != null) return match;
  return { roleKey, ...defaultBuildCoreRolePermissionFlagsForDomain(domain, roleKey) };
}

export function resolveBuildCoreRoleAccess(
  domain: BuildCorePermissionDomain,
  actorRole: OrganizationMemberRole | null | undefined,
  rows: readonly BuildCoreRolePermissionRow[]
): BuildCoreRoleAccess {
  if (isBuildCoreWorkflowTaskOwnerUnrestricted(actorRole)) {
    return {
      actorRole: 'owner',
      roleKey: null,
      ...UNRESTRICTED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
    };
  }

  const roleKey = organizationRoleToBuildCorePermissionRoleKey(actorRole);
  if (roleKey == null) {
    return {
      actorRole: actorRole ?? null,
      roleKey: null,
      ...DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
    };
  }

  const flags = pickBuildCoreRolePermissionRowForDomain(domain, rows, roleKey);
  return {
    actorRole: actorRole ?? null,
    roleKey,
    canView: flags.canView,
    canCreate: flags.canCreate,
    canEdit: flags.canEdit,
    canDelete: flags.canDelete,
    canApprove: flags.canApprove,
    canUpload: flags.canUpload,
    canDownload: flags.canDownload,
    canSendFiles: flags.canSendFiles,
    canViewAllStages: flags.canViewAllStages,
  };
}

export function fullOwnerBuildCoreRoleAccess(): BuildCoreRoleAccess {
  return {
    actorRole: 'owner',
    roleKey: null,
    ...UNRESTRICTED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  };
}

export function fullAdminBuildCoreRoleAccess(
  actorRole: OrganizationMemberRole | null = 'owner'
): BuildCoreRoleAccess {
  if (actorRole === 'owner') {
    return fullOwnerBuildCoreRoleAccess();
  }
  return {
    actorRole,
    roleKey: 'admin',
    ...defaultBuildCoreRolePermissionFlags('admin'),
  };
}
