/**

 * POST /api/crm/projects/[slug]/stages/[stageSlug]/complete — manually mark an empty workflow stage complete.

 * DELETE /api/crm/projects/[slug]/stages/[stageSlug]/complete — undo manual completion for an empty stage.

 */



import { NextRequest, NextResponse } from 'next/server';

import { isKnownPipelineStageSlug, type PipelineStageSlug } from '@/domain/crm';

import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';

import { scopeCrmProjectDetailForViewer } from '@/infrastructure/crm/server/crmMemberProjectDetailService';

import {

  CrmProjectStageManualCompletionBlockedError,

  CrmProjectStageManualCompletionInvalidStageError,

  clearCrmProjectStageManualCompletionForOrg,

  markCrmProjectStageCompleteManualForOrg,

} from '@/infrastructure/crm/server/crmProjectStageCompletionService';

import {

  resolveBuildCoreWorkflowTaskAccessForUser,

  workflowTaskPermissionForbiddenResponse,

} from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';



export const dynamic = 'force-dynamic';



type RouteContext = { params: { slug: string; stageSlug: string } };



async function resolveManualStageCompletionRequest(

  request: NextRequest,

  context: RouteContext

): Promise<

  | { ok: false; response: NextResponse }

  | {

      ok: true;

      slug: string;

      stageSlug: PipelineStageSlug;

      supabase: import('@supabase/supabase-js').SupabaseClient;

      organizationId: string;

      userId: string;

    }

> {

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));

  if (!auth.ok) return { ok: false, response: auth.response };



  const slug = context.params.slug?.trim();

  const stageSlugRaw = context.params.stageSlug?.trim();

  if (!slug || !stageSlugRaw || !isKnownPipelineStageSlug(stageSlugRaw)) {

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

    slug,

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



export async function POST(

  request: NextRequest,

  context: RouteContext

): Promise<NextResponse> {

  const resolved = await resolveManualStageCompletionRequest(request, context);

  if (!resolved.ok) return resolved.response;



  try {

    const project = await markCrmProjectStageCompleteManualForOrg(

      resolved.supabase,

      resolved.organizationId,

      resolved.userId,

      resolved.slug,

      resolved.stageSlug

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



export async function DELETE(

  request: NextRequest,

  context: RouteContext

): Promise<NextResponse> {

  const resolved = await resolveManualStageCompletionRequest(request, context);

  if (!resolved.ok) return resolved.response;



  try {

    const project = await clearCrmProjectStageManualCompletionForOrg(

      resolved.supabase,

      resolved.organizationId,

      resolved.userId,

      resolved.slug,

      resolved.stageSlug

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


