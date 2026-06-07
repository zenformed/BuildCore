/**
 * PATCH /api/internal/organization/role-permissions/[roleKey]?domain=workflow_tasks|payments|budget
 * BuildCore-only upsert into buildcore_role_permissions (not ForgeCore relay).
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionFlags,
} from '@/domain/buildcore/rolePermissions';
import {
  canEditBuildCorePermissionRoleRow,
  parseBuildCorePermissionDomain,
} from '@/domain/buildcore/rolePermissions';
import { isBuildCoreTeamsManagerRole } from '@/domain/buildcore/memberRole';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildCoreEditablePermissionRoleKeys,
  saveBuildCoreRolePermissionRow,
} from '@/infrastructure/crm/server/buildCoreRolePermissionService';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

function parseFlags(body: unknown): BuildCoreRolePermissionFlags | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (
    typeof o.canView !== 'boolean' ||
    typeof o.canCreate !== 'boolean' ||
    typeof o.canEdit !== 'boolean' ||
    typeof o.canDelete !== 'boolean' ||
    typeof o.canApprove !== 'boolean' ||
    typeof o.canUpload !== 'boolean'
  ) {
    return null;
  }
  return {
    canView: o.canView,
    canCreate: o.canCreate,
    canEdit: o.canEdit,
    canDelete: o.canDelete,
    canApprove: o.canApprove,
    canUpload: o.canUpload,
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ roleKey: string }> }
): Promise<NextResponse> {
  const { roleKey: roleKeyRaw } = await context.params;
  const roleKey = roleKeyRaw as BuildCorePermissionRoleKey;
  if (roleKey !== 'admin' && roleKey !== 'coordinator' && roleKey !== 'member') {
    return NextResponse.json({ error: 'invalid_role', message: 'Invalid role key.' }, { status: 400 });
  }

  const domain = parseBuildCorePermissionDomain(
    request.nextUrl.searchParams.get('domain') ?? 'workflow_tasks'
  );
  if (domain == null) {
    return NextResponse.json(
      { error: 'invalid_domain', message: 'Unsupported permission domain.' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const flags = parseFlags(body);
  if (flags == null) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'Request body must include boolean permission flags.' },
      { status: 400 }
    );
  }

  if (runtimeModes.useMockAuth()) {
    return NextResponse.json({ row: { roleKey, ...flags } }, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const actorRole = await loadActiveOrganizationMemberRole(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!isBuildCoreTeamsManagerRole(actorRole)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'You do not have permission to update role permissions.' },
      { status: 403 }
    );
  }

  const editableRoleKeys = buildCoreEditablePermissionRoleKeys(actorRole ?? 'member');
  if (!canEditBuildCorePermissionRoleRow(editableRoleKeys, roleKey)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'You do not have permission to update this role row.' },
      { status: 403 }
    );
  }

  try {
    const row = await saveBuildCoreRolePermissionRow(
      auth.context.supabase,
      auth.context.organizationId,
      domain,
      roleKey,
      flags
    );
    return NextResponse.json({ row }, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not save BuildCore role permissions.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
