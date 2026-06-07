/**
 * BuildCore role permissions (BuildCore DB, not ForgeCore/ZenformedCore relay).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import {
  BUILDCORE_PERMISSION_ROLE_KEYS,
  defaultBuildCoreRolePermissionFlags,
  type BuildCorePermissionDomain,
  type BuildCorePermissionRoleKey,
  type BuildCoreRolePermissionFlags,
  type BuildCoreRolePermissionRow,
  type BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';

type DbPermissionRow = {
  role_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_upload: boolean;
};

function rowFromDb(db: DbPermissionRow): BuildCoreRolePermissionRow | null {
  if (
    db.role_key !== 'admin' &&
    db.role_key !== 'coordinator' &&
    db.role_key !== 'member'
  ) {
    return null;
  }
  return {
    roleKey: db.role_key,
    canView: Boolean(db.can_view),
    canCreate: Boolean(db.can_create),
    canEdit: Boolean(db.can_edit),
    canDelete: Boolean(db.can_delete),
    canApprove: Boolean(db.can_approve),
    canUpload: Boolean(db.can_upload),
  };
}

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

export async function loadBuildCoreRolePermissionRows(
  supabase: SupabaseClient,
  organizationId: string,
  domain: BuildCorePermissionDomain
): Promise<BuildCoreRolePermissionRow[]> {
  const { data, error } = await supabase
    .from('buildcore_role_permissions')
    .select(
      'role_key, can_view, can_create, can_edit, can_delete, can_approve, can_upload'
    )
    .eq('organization_id', organizationId)
    .eq('permission_domain', domain);

  if (error != null) {
    throw new Error(`buildcore_role_permissions_read_failed: ${error.message}`);
  }

  const byKey = new Map<BuildCorePermissionRoleKey, BuildCoreRolePermissionRow>();
  for (const raw of data ?? []) {
    const parsed = rowFromDb(raw as DbPermissionRow);
    if (parsed != null) {
      byKey.set(parsed.roleKey, parsed);
    }
  }

  return BUILDCORE_PERMISSION_ROLE_KEYS.map((roleKey) =>
    byKey.has(roleKey)
      ? byKey.get(roleKey)!
      : { roleKey, ...defaultBuildCoreRolePermissionFlags(roleKey) }
  );
}

export function buildDefaultBuildCoreRolePermissionsResponse(
  domain: BuildCorePermissionDomain,
  actorRole: OrganizationMemberRole = 'owner'
): BuildCoreRolePermissionsResponse {
  return {
    domain,
    actorRole,
    editableRoleKeys: buildCoreEditablePermissionRoleKeys(actorRole),
    rows: BUILDCORE_PERMISSION_ROLE_KEYS.map((roleKey) => ({
      roleKey,
      ...defaultBuildCoreRolePermissionFlags(roleKey),
    })),
  };
}

export async function buildBuildCoreRolePermissionsResponse(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  domain: BuildCorePermissionDomain
): Promise<BuildCoreRolePermissionsResponse> {
  const actorRole = await loadActiveOrganizationMemberRole(
    supabase,
    organizationId,
    userId
  );
  if (actorRole == null) {
    throw new Error('org_member_role_not_found');
  }

  const rows = await loadBuildCoreRolePermissionRows(supabase, organizationId, domain);
  return {
    domain,
    actorRole,
    editableRoleKeys: buildCoreEditablePermissionRoleKeys(actorRole),
    rows,
  };
}

export async function saveBuildCoreRolePermissionRow(
  supabase: SupabaseClient,
  organizationId: string,
  domain: BuildCorePermissionDomain,
  roleKey: BuildCorePermissionRoleKey,
  flags: BuildCoreRolePermissionFlags
): Promise<BuildCoreRolePermissionRow> {
  const { data, error } = await supabase
    .from('buildcore_role_permissions')
    .upsert(
      {
        organization_id: organizationId,
        role_key: roleKey,
        permission_domain: domain,
        can_view: flags.canView,
        can_create: flags.canCreate,
        can_edit: flags.canEdit,
        can_delete: flags.canDelete,
        can_approve: flags.canApprove,
        can_upload: flags.canUpload,
      },
      { onConflict: 'organization_id,role_key,permission_domain' }
    )
    .select(
      'role_key, can_view, can_create, can_edit, can_delete, can_approve, can_upload'
    )
    .single();

  if (error != null || data == null) {
    throw new Error(`buildcore_role_permissions_write_failed: ${error?.message ?? 'unknown'}`);
  }

  const parsed = rowFromDb(data as DbPermissionRow);
  if (parsed == null) {
    throw new Error('buildcore_role_permissions_write_failed: invalid row');
  }
  return parsed;
}
