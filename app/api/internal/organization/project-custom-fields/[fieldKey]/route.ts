import { NextRequest, NextResponse } from 'next/server';
import { isProjectCustomFieldScope } from '@/domain/buildcore/projectCustomFields';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCoreProjectCustomFieldsResponse,
  updateProjectCustomFieldDefinitionForOrg,
} from '@/infrastructure/crm/server/buildCoreProjectCustomFieldService';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { fieldKey: string } };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json({ definitions: [], canManage: true }, {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const actorRole = await loadActiveOrganizationMemberRole(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!organizationRoleCanManagePipelineStages(actorRole)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'You do not have permission to manage custom fields.' },
      { status: 403 }
    );
  }

  const fieldKey = context.params.fieldKey?.trim();
  if (!fieldKey) {
    return NextResponse.json({ error: 'not_found', message: 'Custom field not found.' }, { status: 404 });
  }

  const scopeParam = request.nextUrl.searchParams.get('scope')?.trim() ?? '';
  if (!isProjectCustomFieldScope(scopeParam)) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'scope query parameter must be project or subproject.' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required.' }, { status: 400 });
  }

  if (body == null || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_payload', message: 'Invalid request body.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const patch: { label?: string; isArchived?: boolean } = {};
  if ('label' in record && typeof record.label === 'string') {
    patch.label = record.label;
  }
  if ('isArchived' in record && typeof record.isArchived === 'boolean') {
    patch.isArchived = record.isArchived;
  }

  try {
    await updateProjectCustomFieldDefinitionForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      scopeParam,
      fieldKey,
      patch
    );
    const response = await buildBuildCoreProjectCustomFieldsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update custom field.';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: 'request_failed', message }, { status });
  }
}
