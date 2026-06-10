/**
 * GET /api/crm/projects — org-scoped project summaries for the dashboard pipeline.
 * POST /api/crm/projects — create client, contact, project, and initial accountability event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { createCrmProjectForOrg } from '@/infrastructure/crm/server/crmCreateService';
import { listCrmProjectSummariesForOrg } from '@/infrastructure/crm/server/crmReadService';
import { scopeCrmProjectSummariesForViewer } from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';
import {
  validateCreateCrmProjectBody,
  type CreateCrmProjectBody,
} from '@/infrastructure/crm/server/validateCreateCrmProjectBody';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const includeSubprojects = request.nextUrl.searchParams.get('includeSubprojects') === '1';

  try {
    const projects = await scopeCrmProjectSummariesForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      await listCrmProjectSummariesForOrg(
        auth.context.supabase,
        auth.context.organizationId,
        { rootsOnly: !includeSubprojects }
      )
    );
    return NextResponse.json({
      projects,
      total: projects.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load CRM projects';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'create'
  );
  if (!access.ok) return access.response;

  let body: CreateCrmProjectBody;
  try {
    body = (await request.json()) as CreateCrmProjectBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const validated = validateCreateCrmProjectBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  try {
    const created = await createCrmProjectForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      validated.input
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create CRM project';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
