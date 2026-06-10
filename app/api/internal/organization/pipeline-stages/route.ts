/**
 * GET /api/internal/organization/pipeline-stages
 * POST /api/internal/organization/pipeline-stages
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCorePipelineStagesResponse,
  buildDefaultBuildCorePipelineStagesResponse,
  createOrganizationPipelineStage,
} from '@/infrastructure/crm/server/pipelineStageService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCorePipelineStagesResponse(), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const response = await buildBuildCorePipelineStagesResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not load workflow stages.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCorePipelineStagesResponse(), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'Invalid JSON body.' }, { status: 400 });
  }

  const label =
    body != null && typeof body === 'object' && typeof (body as Record<string, unknown>).label === 'string'
      ? String((body as Record<string, unknown>).label)
      : '';

  try {
    const response = await createOrganizationPipelineStage(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      label
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not create workflow stage.';
    const status = message.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: 'request_failed', message }, { status });
  }
}
