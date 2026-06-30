/**
 * GET /api/internal/organization/field-labels
 * PATCH /api/internal/organization/field-labels
 */

import { NextRequest, NextResponse } from 'next/server';
import { isRegisteredBuildCoreFieldKey } from '@/domain/buildcore/fieldLabels';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCoreFieldLabelsResponse,
  buildDefaultBuildCoreFieldLabelsResponse,
  upsertBuildCoreFieldLabelForOrg,
} from '@/infrastructure/crm/server/buildCoreFieldLabelService';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreFieldLabelsResponse(true), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const response = await buildBuildCoreFieldLabelsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load field labels.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreFieldLabelsResponse(true), {
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
      { error: 'forbidden', message: 'You do not have permission to edit field labels.' },
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
  const fieldKey =
    typeof record.fieldKey === 'string' ? record.fieldKey.trim() : '';
  const label = typeof record.label === 'string' ? record.label : '';

  if (!fieldKey) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'fieldKey is required.' },
      { status: 400 }
    );
  }
  if (!isRegisteredBuildCoreFieldKey(fieldKey)) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'Unknown field key.' },
      { status: 400 }
    );
  }

  try {
    const labels = await upsertBuildCoreFieldLabelForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      fieldKey,
      label
    );
    const response = await buildBuildCoreFieldLabelsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(
      { ...response, labels },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save field label.';
    const status = message.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: 'request_failed', message }, { status });
  }
}
