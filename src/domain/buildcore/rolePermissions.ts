/**
 * BuildCore role permission types (mirrors @zenformed/core/buildcore-permissions until published).
 */

import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

export type BuildCorePermissionDomain = 'workflow_tasks' | 'payments' | 'budget';

export const BUILDCORE_PERMISSION_DOMAINS: readonly BuildCorePermissionDomain[] = [
  'workflow_tasks',
  'payments',
  'budget',
];

export function parseBuildCorePermissionDomain(
  raw: string | null | undefined
): BuildCorePermissionDomain | null {
  if (raw === 'workflow_tasks' || raw === 'payments' || raw === 'budget') return raw;
  return null;
}

export type BuildCorePermissionRoleKey = 'admin' | 'coordinator' | 'member';

export const BUILDCORE_PERMISSION_ROLE_KEYS: readonly BuildCorePermissionRoleKey[] = [
  'admin',
  'coordinator',
  'member',
];

export type BuildCorePermissionColumnId =
  | 'canView'
  | 'canEdit'
  | 'canApprove'
  | 'canDelete'
  | 'canCreate'
  | 'canUpload'
  | 'canSendFiles';

export const BUILDCORE_PERMISSION_COLUMNS: readonly {
  readonly id: BuildCorePermissionColumnId;
  readonly label: string;
}[] = [
  { id: 'canView', label: 'View' },
  { id: 'canEdit', label: 'Edit' },
  { id: 'canApprove', label: 'Approve' },
  { id: 'canDelete', label: 'Delete' },
  { id: 'canCreate', label: 'Create' },
  { id: 'canUpload', label: 'Upload' },
  { id: 'canSendFiles', label: 'Send Files' },
];

export const BUILDCORE_WORKFLOW_TASK_PERMISSION_COLUMNS = BUILDCORE_PERMISSION_COLUMNS;

export type BuildCoreRolePermissionFlags = {
  readonly canView: boolean;
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly canApprove: boolean;
  readonly canUpload: boolean;
  readonly canSendFiles: boolean;
};

export type BuildCoreRolePermissionRow = BuildCoreRolePermissionFlags & {
  readonly roleKey: BuildCorePermissionRoleKey;
};

export type BuildCoreRolePermissionsResponse = {
  readonly domain: BuildCorePermissionDomain;
  readonly actorRole: OrganizationMemberRole;
  readonly editableRoleKeys: readonly BuildCorePermissionRoleKey[];
  readonly rows: readonly BuildCoreRolePermissionRow[];
};

export function roleLabelForBuildCorePermissionKey(roleKey: BuildCorePermissionRoleKey): string {
  switch (roleKey) {
    case 'admin':
      return 'Admin';
    case 'coordinator':
      return 'Coordinator';
    case 'member':
      return 'Member';
    default: {
      const _exhaustive: never = roleKey;
      return _exhaustive;
    }
  }
}

export function canEditBuildCorePermissionRoleRow(
  editableRoleKeys: readonly BuildCorePermissionRoleKey[],
  roleKey: BuildCorePermissionRoleKey
): boolean {
  return editableRoleKeys.includes(roleKey);
}

/** Which matrix rows the signed-in actor may edit (Teams UI + server PATCH guard). */
export function buildCoreEditablePermissionRoleKeys(
  actorRole: OrganizationMemberRole
): readonly BuildCorePermissionRoleKey[] {
  if (actorRole === 'owner' || actorRole === 'admin') {
    return BUILDCORE_PERMISSION_ROLE_KEYS;
  }
  if (actorRole === 'coordinator') {
    return ['member'];
  }
  return [];
}

export {
  assertWorkflowTaskCreateAllowed,
  assertWorkflowTaskUpdateAllowed,
  BUILDCORE_WORKFLOW_TASK_PERMISSION_ROLE_KEYS,
  classifyWorkflowTaskUpdatePatch,
  isWorkflowTaskStatusOnlyPatch,
  defaultBuildCoreRolePermissionFlags,
  DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  fullAdminBuildCoreWorkflowTaskAccess,
  fullOwnerBuildCoreWorkflowTaskAccess,
  isBuildCoreWorkflowTaskOwnerUnrestricted,
  organizationRoleToBuildCorePermissionRoleKey,
  pickBuildCoreRolePermissionRow,
  resolveBuildCoreWorkflowTaskPermissions,
  UNRESTRICTED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  type BuildCoreWorkflowTaskAccess,
  type WorkflowTaskUpdatePatchLike,
  type WorkflowTaskUpdatePermissionRequirements,
} from './workflowTaskPermissions';

export {
  defaultBuildCoreRolePermissionFlagsForDomain,
  fullAdminBuildCoreRoleAccess,
  fullOwnerBuildCoreRoleAccess,
  pickBuildCoreRolePermissionRowForDomain,
  resolveBuildCoreRoleAccess,
  type BuildCoreRoleAccess,
} from './roleAccessPermissions';
