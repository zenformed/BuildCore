/**
 * DELETE /api/crm/project-templates/[templateId] — remove an organization project template.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireCanManageBuildCoreProjectTemplates } from '@/infrastructure/crm/server/buildCoreProjectTemplatePermissionService';
import { deleteBuildCoreProjectTemplateForOrg } from '@/infrastructure/crm/server/crmProjectTemplateService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { templateId: string } };

export async function DELETE(
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

  try {
    const deleted = await deleteBuildCoreProjectTemplateForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      templateId
    );
    if (!deleted) {
      return NextResponse.json({ error: 'not_found', message: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete project template';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
