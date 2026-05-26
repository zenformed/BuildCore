/**
 * GET /api/crm/projects/[slug]/tasks — list workflow tasks for a project.
 * POST /api/crm/projects/[slug]/tasks — create a workflow task for a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { resolveCrmProjectIdBySlug } from '@/infrastructure/crm/server/resolveCrmProjectIdBySlug';
import {
  createCrmWorkflowTaskForOrg,
  listCrmWorkflowTasksForOrg,
} from '@/infrastructure/crm/server/crmWorkflowTaskService';
import {
  validateCreateWorkflowTaskBody,
  type WorkflowTaskBody,
} from '@/infrastructure/crm/server/validateWorkflowTaskBody';
import {
  resolveBuildCoreWorkflowTaskAccessForUser,
  workflowTaskPermissionFlagsFromAccess,
  workflowTaskPermissionForbiddenResponse,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';
import { assertWorkflowTaskCreateAllowed } from '@/domain/buildcore/rolePermissions';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const access = await resolveBuildCoreWorkflowTaskAccessForUser(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    if (!access.canView) {
      return workflowTaskPermissionForbiddenResponse(
        'You do not have permission to view workflow tasks.'
      );
    }

    const tasks = await listCrmWorkflowTasksForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      slug
    );
    return NextResponse.json({ tasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list workflow tasks';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

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

  let body: WorkflowTaskBody;
  try {
    body = (await request.json()) as WorkflowTaskBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const validated = validateCreateWorkflowTaskBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  try {
    const access = await resolveBuildCoreWorkflowTaskAccessForUser(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    const permissions = workflowTaskPermissionFlagsFromAccess(access);
    const createCheck = assertWorkflowTaskCreateAllowed(permissions, validated.input.status);
    if (!createCheck.ok) {
      return workflowTaskPermissionForbiddenResponse(createCheck.message);
    }

    const projectId = await resolveCrmProjectIdBySlug(
      auth.context.supabase,
      auth.context.organizationId,
      slug
    );
    if (!projectId) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const task = await createCrmWorkflowTaskForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      { projectId, projectSlug: slug, ...validated.input }
    );
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create workflow task';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
