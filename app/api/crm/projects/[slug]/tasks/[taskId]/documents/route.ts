/**
 * GET  /api/crm/projects/[slug]/tasks/[taskId]/documents — list task documents
 * POST /api/crm/projects/[slug]/tasks/[taskId]/documents — upload document (multipart)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import {
  listWorkflowTaskDocumentsForOrg,
} from '@/infrastructure/crm/server/crmDocumentService';
import {
  requireBuildCoreWorkflowTaskPermission,
  resolveBuildCoreWorkflowTaskAccessForUser,
  workflowTaskPermissionForbiddenResponse,
} from '@/infrastructure/crm/server/buildCoreWorkflowTaskPermissionService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; taskId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const taskId = context.params.taskId?.trim();
  if (!slug || !taskId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
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

    const documents = await listWorkflowTaskDocumentsForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { projectSlug: slug, workflowTaskId: taskId }
    );
    return NextResponse.json({ documents });
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: 'deprecated',
      message: 'Use direct upload: POST /api/crm/projects/[slug]/direct-uploads/prepare',
    },
    { status: 410 }
  );
}
