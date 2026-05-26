/**
 * Resolve persisted BuildCore workflow task permissions for CRM API enforcement.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import {
  BUILDCORE_WORKFLOW_TASK_PERMISSION_ROLE_KEYS,
  defaultBuildCoreRolePermissionFlags,
  resolveBuildCoreWorkflowTaskPermissions,
  fullOwnerBuildCoreWorkflowTaskAccess,
  type BuildCoreRolePermissionFlags,
  type BuildCoreRolePermissionRow,
  type BuildCoreWorkflowTaskAccess,
} from '@/domain/buildcore/rolePermissions';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';

type DbPermissionRow = {
  role_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_upload: boolean;
};

function parseOrganizationMemberRole(raw: string | null | undefined): OrganizationMemberRole | null {
  if (raw === 'owner' || raw === 'admin' || raw === 'coordinator' || raw === 'member') return raw;
  return null;
}

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

async function loadActiveMemberRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<OrganizationMemberRole | null> {
  const { data, error } = await supabase
    .from('platform_organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('membership_status', 'active')
    .maybeSingle();

  if (error != null) {
    throw new Error(`org_member_role_read_failed: ${error.message}`);
  }
  return parseOrganizationMemberRole(data?.role != null ? String(data.role) : null);
}

async function loadWorkflowTaskPermissionRows(
  supabase: SupabaseClient,
  organizationId: string
): Promise<BuildCoreRolePermissionRow[]> {
  const { data, error } = await supabase
    .from('buildcore_role_permissions')
    .select(
      'role_key, can_view, can_create, can_edit, can_delete, can_approve, can_upload'
    )
    .eq('organization_id', organizationId)
    .eq('permission_domain', 'workflow_tasks');

  if (error != null) {
    throw new Error(`buildcore_role_permissions_read_failed: ${error.message}`);
  }

  const byKey = new Map<string, BuildCoreRolePermissionRow>();
  for (const raw of data ?? []) {
    const parsed = rowFromDb(raw as DbPermissionRow);
    if (parsed != null) {
      byKey.set(parsed.roleKey, parsed);
    }
  }

  return BUILDCORE_WORKFLOW_TASK_PERMISSION_ROLE_KEYS.map((roleKey) =>
    byKey.has(roleKey)
      ? byKey.get(roleKey)!
      : { roleKey, ...defaultBuildCoreRolePermissionFlags(roleKey) }
  );
}

export async function resolveBuildCoreWorkflowTaskAccessForUser(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCoreWorkflowTaskAccess> {
  if (runtimeModes.useMockAuth()) {
    return fullOwnerBuildCoreWorkflowTaskAccess();
  }

  const actorRole = await loadActiveMemberRole(supabase, organizationId, userId);
  const rows = await loadWorkflowTaskPermissionRows(supabase, organizationId);
  return resolveBuildCoreWorkflowTaskPermissions(actorRole, rows);
}

export function workflowTaskPermissionFlagsFromAccess(
  access: BuildCoreWorkflowTaskAccess
): BuildCoreRolePermissionFlags {
  return {
    canView: access.canView,
    canCreate: access.canCreate,
    canEdit: access.canEdit,
    canDelete: access.canDelete,
    canApprove: access.canApprove,
    canUpload: access.canUpload,
  };
}

export function workflowTaskPermissionForbiddenResponse(message: string): NextResponse {
  return NextResponse.json({ error: 'forbidden', message }, { status: 403 });
}

export async function requireBuildCoreWorkflowTaskPermission(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  check: (flags: BuildCoreRolePermissionFlags) => boolean,
  message: string
): Promise<
  | { ok: true; permissions: BuildCoreRolePermissionFlags }
  | { ok: false; response: NextResponse }
> {
  const access = await resolveBuildCoreWorkflowTaskAccessForUser(supabase, organizationId, userId);
  const permissions = workflowTaskPermissionFlagsFromAccess(access);
  if (!check(permissions)) {
    return { ok: false, response: workflowTaskPermissionForbiddenResponse(message) };
  }
  return { ok: true, permissions };
}
