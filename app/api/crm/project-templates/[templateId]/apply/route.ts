/**
 * POST /api/crm/project-templates/[templateId]/apply — append template workflow tasks and payments to a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireCanManageBuildCoreProjectTemplates } from '@/infrastructure/crm/server/buildCoreProjectTemplatePermissionService';
import { applyBuildCoreProjectTemplateToProject } from '@/infrastructure/crm/server/crmProjectTemplateService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { templateId: string } };

type ApplyProjectTemplateBody = {
  projectSlug?: unknown;
};

function parseProjectSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const permission = await requireCanManageBuildCoreProjectTemplates(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!permission.ok) return permission.response;

  const templateId = context.params.templateId?.trim();
  if (!templateId) {
    return NextResponse.json({ error: 'not_found', message: 'Template not found' }, { status: 404 });
  }

  let body: ApplyProjectTemplateBody;
  try {
    body = (await request.json()) as ApplyProjectTemplateBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const projectSlug = parseProjectSlug(body.projectSlug);
  if (projectSlug == null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Project slug is required.' },
      { status: 400 }
    );
  }

  try {
    const result = await applyBuildCoreProjectTemplateToProject(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      templateId,
      projectSlug
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply project template';
    if (message === 'template_not_found') {
      return NextResponse.json({ error: 'not_found', message: 'Template not found' }, { status: 404 });
    }
    if (message === 'project_not_found') {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
