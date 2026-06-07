/**
 * Effective BuildCore workflow task permission resolution (runtime enforcement).
 * Source of truth: zenformed-core-package/buildCoreWorkflowTaskPermissionModel.ts
 */

import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import type {
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionFlags,
  BuildCoreRolePermissionRow,
} from './rolePermissions';

export type BuildCoreWorkflowTaskAccess = BuildCoreRolePermissionFlags & {
  readonly roleKey: BuildCorePermissionRoleKey | null;
  readonly actorRole: OrganizationMemberRole | null;
  readonly onlyAssignedUserCanView: boolean;
  readonly viewerUserId: string | null;
  readonly memberRoleUserIds: readonly string[];
};

export const DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS: BuildCoreRolePermissionFlags = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canUpload: false,
};

/** Organization owners are not in the permission matrix and cannot be restricted. */
export const UNRESTRICTED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS: BuildCoreRolePermissionFlags = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
  canUpload: true,
};

export function isBuildCoreWorkflowTaskOwnerUnrestricted(
  actorRole: OrganizationMemberRole | null | undefined
): boolean {
  return actorRole === 'owner';
}

export function defaultBuildCoreRolePermissionFlags(
  roleKey: BuildCorePermissionRoleKey
): BuildCoreRolePermissionFlags {
  switch (roleKey) {
    case 'admin':
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canUpload: true,
      };
    case 'coordinator':
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canUpload: true,
      };
    case 'member':
      return {
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canUpload: true,
      };
    default: {
      const _exhaustive: never = roleKey;
      return _exhaustive;
    }
  }
}

/** Maps org membership to a persisted matrix row. Owner is excluded — use isBuildCoreWorkflowTaskOwnerUnrestricted. */
export function organizationRoleToBuildCorePermissionRoleKey(
  actorRole: OrganizationMemberRole | null | undefined
): BuildCorePermissionRoleKey | null {
  if (actorRole == null || actorRole === 'owner') return null;
  if (actorRole === 'admin') return 'admin';
  if (actorRole === 'coordinator') return 'coordinator';
  if (actorRole === 'member') return 'member';
  return null;
}

export function pickBuildCoreRolePermissionRow(
  rows: readonly BuildCoreRolePermissionRow[],
  roleKey: BuildCorePermissionRoleKey
): BuildCoreRolePermissionRow {
  const match = rows.find((row) => row.roleKey === roleKey);
  if (match != null) return match;
  return { roleKey, ...defaultBuildCoreRolePermissionFlags(roleKey) };
}

export function resolveBuildCoreWorkflowTaskPermissions(
  actorRole: OrganizationMemberRole | null | undefined,
  rows: readonly BuildCoreRolePermissionRow[]
): BuildCoreWorkflowTaskAccess {
  if (isBuildCoreWorkflowTaskOwnerUnrestricted(actorRole)) {
    return fullOwnerBuildCoreWorkflowTaskAccess();
  }

  const roleKey = organizationRoleToBuildCorePermissionRoleKey(actorRole);
  if (roleKey == null) {
    return {
      actorRole: actorRole ?? null,
      roleKey: null,
      onlyAssignedUserCanView: false,
      viewerUserId: null,
      memberRoleUserIds: [],
      ...DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
    };
  }
  const flags = pickBuildCoreRolePermissionRow(rows, roleKey);
  return {
    actorRole: actorRole ?? null,
    roleKey,
    onlyAssignedUserCanView: false,
    viewerUserId: null,
    memberRoleUserIds: [],
    canView: flags.canView,
    canCreate: flags.canCreate,
    canEdit: flags.canEdit,
    canDelete: flags.canDelete,
    canApprove: flags.canApprove,
    canUpload: flags.canUpload,
  };
}

export function fullOwnerBuildCoreWorkflowTaskAccess(): BuildCoreWorkflowTaskAccess {
  return {
    actorRole: 'owner',
    roleKey: null,
    onlyAssignedUserCanView: false,
    viewerUserId: null,
    memberRoleUserIds: [],
    ...UNRESTRICTED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  };
}

/** Unrestricted access (mock auth / tests). Prefer fullOwnerBuildCoreWorkflowTaskAccess for owners. */
export function fullAdminBuildCoreWorkflowTaskAccess(
  actorRole: OrganizationMemberRole | null = 'owner'
): BuildCoreWorkflowTaskAccess {
  if (actorRole === 'owner') {
    return fullOwnerBuildCoreWorkflowTaskAccess();
  }
  return {
    actorRole,
    roleKey: 'admin',
    onlyAssignedUserCanView: false,
    viewerUserId: null,
    memberRoleUserIds: [],
    ...defaultBuildCoreRolePermissionFlags('admin'),
  };
}

export type WorkflowTaskUpdatePermissionRequirements = {
  /** Non-status field changes (title, assignee, due date, etc.). */
  readonly requiresCanEdit: boolean;
  /** Status change to a value other than done (view permission is sufficient). */
  readonly requiresCanView: boolean;
  /** Status change to done. */
  readonly requiresCanApprove: boolean;
};

export type WorkflowTaskUpdatePatchLike = {
  readonly status?: string;
  readonly title?: string;
  readonly stageSlug?: string;
  readonly documentsRequired?: boolean;
  readonly dueAt?: string | null;
  readonly notes?: string | null;
  readonly assignedMemberId?: string | null;
  readonly amountCents?: number | null;
  readonly invoicedAt?: string | null;
  readonly paidAt?: string | null;
};

export function isWorkflowTaskStatusOnlyPatch(patch: WorkflowTaskUpdatePatchLike): boolean {
  const keys = Object.keys(patch) as (keyof WorkflowTaskUpdatePatchLike)[];
  return keys.length === 1 && keys[0] === 'status';
}

export function classifyWorkflowTaskUpdatePatch(
  patch: WorkflowTaskUpdatePatchLike
): WorkflowTaskUpdatePermissionRequirements {
  const keys = Object.keys(patch) as (keyof WorkflowTaskUpdatePatchLike)[];
  const hasStatus = keys.includes('status');
  const statusIsDone = patch.status === 'done';
  const hasNonStatusFields = keys.some((key) => key !== 'status');

  return {
    requiresCanApprove: hasStatus && statusIsDone,
    requiresCanView: hasStatus && !statusIsDone,
    requiresCanEdit: hasNonStatusFields,
  };
}

export function assertWorkflowTaskUpdateAllowed(
  permissions: BuildCoreRolePermissionFlags,
  patch: WorkflowTaskUpdatePatchLike
): { ok: true } | { ok: false; message: string } {
  const requirements = classifyWorkflowTaskUpdatePatch(patch);
  if (requirements.requiresCanEdit && !permissions.canEdit) {
    return { ok: false, message: 'You do not have permission to edit workflow tasks.' };
  }
  if (requirements.requiresCanView && !permissions.canView) {
    return { ok: false, message: 'You do not have permission to view workflow tasks.' };
  }
  if (requirements.requiresCanApprove && !permissions.canApprove) {
    return { ok: false, message: 'You do not have permission to mark workflow tasks as done.' };
  }
  return { ok: true };
}

export function assertWorkflowTaskCreateAllowed(
  permissions: BuildCoreRolePermissionFlags,
  status: string | undefined
): { ok: true } | { ok: false; message: string } {
  if (!permissions.canCreate) {
    return { ok: false, message: 'You do not have permission to create workflow tasks.' };
  }
  if (status === 'done' && !permissions.canApprove) {
    return { ok: false, message: 'You do not have permission to mark workflow tasks as done.' };
  }
  return { ok: true };
}

export const BUILDCORE_WORKFLOW_TASK_PERMISSION_ROLE_KEYS: readonly BuildCorePermissionRoleKey[] = [
  'admin',
  'coordinator',
  'member',
];
