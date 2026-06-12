import { NextRequest, NextResponse } from 'next/server';
import { isKnownPipelineStageSlug, type PipelineStageSlug } from '@/domain/crm';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { scopeCrmProjectDetailForViewer } from '@/infrastructure/crm/server/crmMemberProjectDetailService';
import {
  CrmProjectStageManualCompletionBlockedError,
  CrmProjectStageManualCompletionBatchEmptyError,
  CrmProjectStageManualCompletionInvalidStageError,
  clearCrmProjectStageManualCompletionForOrg,
  markCrmProjectEmptyStagesCompleteBatchForOrg,
  markCrmProjectStageCompleteManualForOrg,
} from '@/infrastructure/crm/server/crmProjectStageCompletionService';
import {
  resolveBuildCoreWorkflowTaskAccessForUser,
  workflowTaskPermissionForbiddenResponse,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';
import { loadOrganizationPipelineStageCatalog } from '@/infrastructure/crm/server/pipelineStageService';

type ManualStageCompletionRouteParams = {
  readonly slug: string;
  readonly subSlug?: string;
  readonly stageSlug: string;
};

type BatchEmptyStageCompletionRouteParams = {
  readonly slug: string;
  readonly subSlug?: string;
};

async function resolveBatchEmptyStageCompletionRequest(
  request: NextRequest,
  params: BatchEmptyStageCompletionRouteParams
): Promise<
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      slug: string;
      parentSlug?: string;
      supabase: import('@supabase/supabase-js').SupabaseClient;
      organizationId: string;
      userId: string;
    }
> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return { ok: false, response: auth.response };

  const parentSlug = params.subSlug != null ? params.slug?.trim() : undefined;
  const projectSlug = (params.subSlug ?? params.slug)?.trim();

  if (!projectSlug) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 }),
    };
  }

  const access = await resolveBuildCoreWorkflowTaskAccessForUser(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!access.canCreate) {
    return {
      ok: false,
      response: workflowTaskPermissionForbiddenResponse(
        'You do not have permission to mark workflow stages complete.'
      ),
    };
  }

  return {
    ok: true,
    slug: projectSlug,
    parentSlug,
    supabase: auth.context.supabase,
    organizationId: auth.context.organizationId,
    userId: auth.context.user.id,
  };
}

async function resolveManualStageCompletionRequest(
  request: NextRequest,
  params: ManualStageCompletionRouteParams
): Promise<
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      slug: string;
      parentSlug?: string;
      stageSlug: PipelineStageSlug;
      supabase: import('@supabase/supabase-js').SupabaseClient;
      organizationId: string;
      userId: string;
    }
> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return { ok: false, response: auth.response };

  const parentSlug = params.subSlug != null ? params.slug?.trim() : undefined;
  const projectSlug = (params.subSlug ?? params.slug)?.trim();
  const stageSlugRaw = params.stageSlug?.trim();

  if (!projectSlug || !stageSlugRaw) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'not_found', message: 'Project or stage not found' },
        { status: 404 }
      ),
    };
  }

  const stageScope = params.subSlug != null ? 'subproject' : 'project';
  const stageCatalog = await loadOrganizationPipelineStageCatalog(
    auth.context.supabase,
    auth.context.organizationId,
    stageScope
  );
  if (!isKnownPipelineStageSlug(stageSlugRaw, stageCatalog)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'not_found', message: 'Project or stage not found' },
        { status: 404 }
      ),
    };
  }

  const access = await resolveBuildCoreWorkflowTaskAccessForUser(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!access.canCreate) {
    return {
      ok: false,
      response: workflowTaskPermissionForbiddenResponse(
        'You do not have permission to mark workflow stages complete.'
      ),
    };
  }

  return {
    ok: true,
    slug: projectSlug,
    parentSlug,
    stageSlug: stageSlugRaw as PipelineStageSlug,
    supabase: auth.context.supabase,
    organizationId: auth.context.organizationId,
    userId: auth.context.user.id,
  };
}

async function scopeManualStageCompletionProject(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  organizationId: string,
  userId: string,
  project: import('@/domain/crm').CrmProjectDetail | null
): Promise<NextResponse> {
  if (project == null) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  const scoped = await scopeCrmProjectDetailForViewer(
    supabase,
    organizationId,
    userId,
    project
  );
  if (scoped == null) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(scoped);
}

export async function postManualStageCompletionRoute(
  request: NextRequest,
  params: ManualStageCompletionRouteParams
): Promise<NextResponse> {
  const resolved = await resolveManualStageCompletionRequest(request, params);
  if (!resolved.ok) return resolved.response;

  try {
    const project = await markCrmProjectStageCompleteManualForOrg(
      resolved.supabase,
      resolved.organizationId,
      resolved.userId,
      resolved.slug,
      resolved.stageSlug,
      { parentSlug: resolved.parentSlug }
    );
    return scopeManualStageCompletionProject(
      resolved.supabase,
      resolved.organizationId,
      resolved.userId,
      project
    );
  } catch (err) {
    if (
      err instanceof CrmProjectStageManualCompletionBlockedError ||
      err instanceof CrmProjectStageManualCompletionInvalidStageError
    ) {
      return NextResponse.json({ error: 'validation_error', message: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Failed to mark stage complete';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function postBatchEmptyStageCompletionRoute(
  request: NextRequest,
  params: BatchEmptyStageCompletionRouteParams
): Promise<NextResponse> {
  const resolved = await resolveBatchEmptyStageCompletionRequest(request, params);
  if (!resolved.ok) return resolved.response;

  try {
    const project = await markCrmProjectEmptyStagesCompleteBatchForOrg(
      resolved.supabase,
      resolved.organizationId,
      resolved.userId,
      resolved.slug,
      { parentSlug: resolved.parentSlug }
    );
    return scopeManualStageCompletionProject(
      resolved.supabase,
      resolved.organizationId,
      resolved.userId,
      project
    );
  } catch (err) {
    if (err instanceof CrmProjectStageManualCompletionBatchEmptyError) {
      return NextResponse.json({ error: 'validation_error', message: err.message }, { status: 400 });
    }
    if (
      err instanceof CrmProjectStageManualCompletionBlockedError ||
      err instanceof CrmProjectStageManualCompletionInvalidStageError
    ) {
      return NextResponse.json({ error: 'validation_error', message: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Failed to mark empty stages complete';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function deleteManualStageCompletionRoute(
  request: NextRequest,
  params: ManualStageCompletionRouteParams
): Promise<NextResponse> {
  const resolved = await resolveManualStageCompletionRequest(request, params);
  if (!resolved.ok) return resolved.response;

  try {
    const project = await clearCrmProjectStageManualCompletionForOrg(
      resolved.supabase,
      resolved.organizationId,
      resolved.userId,
      resolved.slug,
      resolved.stageSlug,
      { parentSlug: resolved.parentSlug }
    );
    return scopeManualStageCompletionProject(
      resolved.supabase,
      resolved.organizationId,
      resolved.userId,
      project
    );
  } catch (err) {
    if (
      err instanceof CrmProjectStageManualCompletionBlockedError ||
      err instanceof CrmProjectStageManualCompletionInvalidStageError
    ) {
      return NextResponse.json({ error: 'validation_error', message: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Failed to mark stage incomplete';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
