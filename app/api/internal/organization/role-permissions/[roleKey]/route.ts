/**
 * PATCH /api/internal/organization/role-permissions/[roleKey]?domain=workflow_tasks
 */

import { NextRequest } from 'next/server';
import { patchBuildCoreRolePermission } from '@/infrastructure/coreApi/buildCoreRolePermissionsClient';
import type {
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionFlags,
} from '@/domain/buildcore/rolePermissions';
import { relayOrganizationMutate } from '../../coreOrganizationRelay';

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
) {
  const { roleKey: roleKeyRaw } = await context.params;
  const roleKey = roleKeyRaw as BuildCorePermissionRoleKey;
  if (roleKey !== 'admin' && roleKey !== 'coordinator' && roleKey !== 'member') {
    return Response.json({ error: 'invalid_role', message: 'Invalid role key.' }, { status: 400 });
  }

  const domainParam = request.nextUrl.searchParams.get('domain') ?? 'workflow_tasks';
  if (domainParam !== 'workflow_tasks') {
    return Response.json({ error: 'invalid_domain', message: 'Unsupported permission domain.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const flags = parseFlags(body);
  if (flags == null) {
    return Response.json(
      { error: 'invalid_payload', message: 'Request body must include boolean permission flags.' },
      { status: 400 }
    );
  }

  return relayOrganizationMutate(
    request,
    (token) => patchBuildCoreRolePermission(token, 'workflow_tasks', roleKey, flags),
    { rejectedError: 'role_permission_update_rejected' }
  );
}
