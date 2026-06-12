/**
 * PATCH /api/internal/organization/pipeline-stages/[stageId]
 * DELETE /api/internal/organization/pipeline-stages/[stageId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildDefaultBuildCorePipelineStagesResponse,
  deleteOrganizationPipelineStage,
  renameOrganizationPipelineStage,
} from '@/infrastructure/crm/server/pipelineStageService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: { stageId: string };
};

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCorePipelineStagesResponse('project'), {
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
    const response = await renameOrganizationPipelineStage(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      context.params.stageId,
      label
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not rename workflow stage.';
    const status = message.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: 'request_failed', message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(buildDefaultBuildCorePipelineStagesResponse('project'), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(_request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const response = await deleteOrganizationPipelineStage(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      context.params.stageId
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not delete workflow stage.';
    const status = message.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: 'request_failed', message }, { status });
  }
}
