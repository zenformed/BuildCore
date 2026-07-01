import { NextRequest, NextResponse } from 'next/server';
import { isProjectCustomFieldScope, isProjectCustomFieldType } from '@/domain/buildcore/projectCustomFields';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCoreProjectCustomFieldsResponse,
  buildDefaultBuildCoreProjectCustomFieldsResponse,
  createProjectCustomFieldDefinitionForOrg,
} from '@/infrastructure/crm/server/buildCoreProjectCustomFieldService';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreProjectCustomFieldsResponse(true), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const scopeParam = request.nextUrl.searchParams.get('scope')?.trim();
  const scopeFilter =
    scopeParam != null && scopeParam.length > 0 && isProjectCustomFieldScope(scopeParam)
      ? scopeParam
      : undefined;
  if (scopeParam != null && scopeParam.length > 0 && scopeFilter == null) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'scope must be project or subproject.' },
      { status: 400 }
    );
  }

  try {
    const response = await buildBuildCoreProjectCustomFieldsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      scopeFilter
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load custom fields.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreProjectCustomFieldsResponse(true), {
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
  const label = typeof record.label === 'string' ? record.label : '';
  const scopeRaw = typeof record.scope === 'string' ? record.scope : '';
  if (!isProjectCustomFieldScope(scopeRaw)) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'scope must be project or subproject.' },
      { status: 400 }
    );
  }
  const fieldType =
    typeof record.fieldType === 'string' && isProjectCustomFieldType(record.fieldType)
      ? record.fieldType
      : 'text';

  try {
    const definition = await createProjectCustomFieldDefinitionForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { label, scope: scopeRaw, fieldType }
    );
    const response = await buildBuildCoreProjectCustomFieldsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(
      { ...response, created: definition },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create custom field.';
    return NextResponse.json({ error: 'request_failed', message }, { status: 400 });
  }
}
