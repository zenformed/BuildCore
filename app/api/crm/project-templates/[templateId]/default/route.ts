/**
 * PATCH /api/crm/project-templates/[templateId]/default — set or unset org default template.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireCanManageBuildCoreProjectTemplates } from '@/infrastructure/crm/server/buildCoreProjectTemplatePermissionService';
import { setBuildCoreProjectTemplateDefaultForOrg } from '@/infrastructure/crm/server/crmProjectTemplateService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { templateId: string } };

type SetDefaultBody = {
  isDefault?: unknown;
};

export async function PATCH(
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

  let body: SetDefaultBody;
  try {
    body = (await request.json()) as SetDefaultBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  if (typeof body.isDefault !== 'boolean') {
    return NextResponse.json(
      { error: 'validation_error', message: 'isDefault must be a boolean.' },
      { status: 400 }
    );
  }

  try {
    const template = await setBuildCoreProjectTemplateDefaultForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      templateId,
      body.isDefault
    );
    return NextResponse.json({ template });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update default template';
    if (message === 'template_not_found') {
      return NextResponse.json({ error: 'not_found', message: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
