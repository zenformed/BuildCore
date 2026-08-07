/**
 * POST /api/crm/projects/[slug]/completion — mark project complete or incomplete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  setCrmProjectCompletionBySlugForOrg,
  CrmProjectCompletionConfirmationRequiredError,
  CrmProjectCompletionForbiddenError,
} from '@/infrastructure/crm/server/crmSetProjectCompletionService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

type CompletionBody = {
  complete?: unknown;
  confirmIncompleteTasks?: unknown;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  let body: CompletionBody;
  try {
    body = (await request.json()) as CompletionBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  if (typeof body.complete !== 'boolean') {
    return NextResponse.json(
      { error: 'validation_error', message: 'Body must include complete: boolean' },
      { status: 400 }
    );
  }

  try {
    const project = await setCrmProjectCompletionBySlugForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      slug,
      body.complete,
      {
        confirmIncompleteTasks: body.confirmIncompleteTasks === true,
      }
    );
    if (project == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err) {
    if (err instanceof CrmProjectCompletionConfirmationRequiredError) {
      return NextResponse.json(
        {
          error: 'confirmation_required',
          message: err.message,
          incompleteTaskCount: err.incompleteTaskCount,
          incompleteStages: err.incompleteStages,
        },
        { status: 409 }
      );
    }
    if (err instanceof CrmProjectCompletionForbiddenError) {
      return NextResponse.json({ error: 'forbidden', message: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Failed to update project completion';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
