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
import { pipelineStageSlugSet } from '@/domain/crm';
import {
  validateCreateCrmProjectBody,
  type CreateCrmProjectBody,
} from '@/infrastructure/crm/server/validateCreateCrmProjectBody';
import { loadOrganizationPipelineStageCatalog } from '@/infrastructure/crm/server/pipelineStageService';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { resolveBuildCoreProjectAccessScopeForUser } from '@/infrastructure/crm/server/buildCoreProjectAccessScopeService';
import { normalizeProjectAssigneeForAccessScope } from '@/domain/buildcore/projectAccessScope';
import { createCrmServiceRoleClient } from '@/infrastructure/crm/server/createCrmServiceRoleClient';

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
    return mapCrmRouteError(err, 'Failed to load CRM projects');
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

  const parentProjectId =
    body != null && typeof body === 'object' && 'parentProjectId' in body
      ? (body as CreateCrmProjectBody).parentProjectId
      : undefined;
  const stageScope =
    parentProjectId != null && parentProjectId !== '' ? 'subproject' : 'project';

  const stageCatalog = await loadOrganizationPipelineStageCatalog(
    auth.context.supabase,
    auth.context.organizationId,
    stageScope
  );
  const validated = validateCreateCrmProjectBody(body, {
    allowedStageSlugs: pipelineStageSlugSet(stageCatalog),
  });
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  const projectAccessScope = await resolveBuildCoreProjectAccessScopeForUser(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  const createInput = {
    ...validated.input,
    assignedMemberId: normalizeProjectAssigneeForAccessScope({
      scope: projectAccessScope,
      actorUserId: auth.context.user.id,
      requestedAssigneeId: validated.input.assignedMemberId,
    }),
  };

  // A new Client/Contact is deliberately not selectable through RLS until it
  // is linked to its Project. Project creation needs the generated IDs for
  // that first link, so perform the authorized server-side write sequence
  // with the service client after all caller and scope checks above.
  const service = createCrmServiceRoleClient();
  if (service == null) {
    return NextResponse.json({ error: 'misconfigured', message: 'CRM create service is unavailable.' }, { status: 503 });
  }

  try {
    const created = await createCrmProjectForOrg(
      service,
      auth.context.organizationId,
      auth.context.user.id,
      createInput
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return mapCrmRouteError(err, 'Failed to create CRM project');
  }
}
