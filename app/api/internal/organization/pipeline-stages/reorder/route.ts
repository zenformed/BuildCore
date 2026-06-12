/**
 * PUT /api/internal/organization/pipeline-stages/reorder
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildDefaultBuildCorePipelineStagesResponse,
  parsePipelineStageScope,
  reorderOrganizationPipelineStages,
} from '@/infrastructure/crm/server/pipelineStageService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest): Promise<NextResponse> {
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

  const record = body != null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const orderedStageIds =
    Array.isArray(record.orderedStageIds)
      ? record.orderedStageIds.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
      : [];
  const scope = parsePipelineStageScope(typeof record.scope === 'string' ? record.scope : null);
  if (scope == null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Stage scope must be project or subproject.' },
      { status: 400 }
    );
  }

  try {
    const response = await reorderOrganizationPipelineStages(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      orderedStageIds,
      scope
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not reorder workflow stages.';
    const status = message.includes('permission') ? 403 : 400;
    return NextResponse.json({ error: 'request_failed', message }, { status });
  }
}
