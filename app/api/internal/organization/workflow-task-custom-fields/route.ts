/**
 * GET /api/internal/organization/workflow-task-custom-fields
 * POST /api/internal/organization/workflow-task-custom-fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { isWorkflowTaskCustomFieldType, isWorkflowTaskCustomFieldScope } from '@/domain/buildcore/workflowTaskCustomFields';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCoreWorkflowTaskCustomFieldsResponse,
  buildDefaultBuildCoreWorkflowTaskCustomFieldsResponse,
  createWorkflowTaskCustomFieldDefinitionForOrg,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskCustomFieldService';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreWorkflowTaskCustomFieldsResponse(true), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const response = await buildBuildCoreWorkflowTaskCustomFieldsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load custom fields.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreWorkflowTaskCustomFieldsResponse(true), {
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
  const fieldType =
    typeof record.fieldType === 'string' && isWorkflowTaskCustomFieldType(record.fieldType)
      ? record.fieldType
      : 'text';
  const scope =
    typeof record.scope === 'string' && isWorkflowTaskCustomFieldScope(record.scope)
      ? record.scope
      : null;
  if (scope == null) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'Custom field scope is required.' },
      { status: 400 }
    );
  }

  try {
    const definition = await createWorkflowTaskCustomFieldDefinitionForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { label, fieldType, scope }
    );
    const response = await buildBuildCoreWorkflowTaskCustomFieldsResponse(
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
