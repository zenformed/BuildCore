/**
 * GET /api/internal/organization/entity-terminology
 * PATCH /api/internal/organization/entity-terminology
 */

import { NextRequest, NextResponse } from 'next/server';
import { isBuildCoreEntityTerminologyKey } from '@/domain/buildcore/entityTerminology';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCoreEntityTerminologyResponse,
  buildDefaultBuildCoreEntityTerminologyResponse,
  upsertBuildCoreEntityTerminologyForOrg,
} from '@/infrastructure/crm/server/buildCoreEntityTerminologyService';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreEntityTerminologyResponse(true), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const response = await buildBuildCoreEntityTerminologyResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load entity terminology.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCoreEntityTerminologyResponse(true), {
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
      { error: 'forbidden', message: 'You do not have permission to rename entity terms.' },
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
  const entityKey =
    typeof record.entityKey === 'string' ? record.entityKey.trim() : '';
  const displayName = typeof record.displayName === 'string' ? record.displayName : '';

  if (!entityKey) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'entityKey is required.' },
      { status: 400 }
    );
  }
  if (!isBuildCoreEntityTerminologyKey(entityKey)) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'Unknown entity key.' },
      { status: 400 }
    );
  }

  try {
    const overrides = await upsertBuildCoreEntityTerminologyForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      entityKey,
      displayName
    );
    const response = await buildBuildCoreEntityTerminologyResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(
      { ...response, overrides },
      { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save entity terminology.';
    const status = message.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: 'request_failed', message }, { status });
  }
}
