/**
 * GET /api/crm/projects/workflow-task-statuses — distinct workflow task statuses per project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listWorkflowTaskStatusesByOrg } from '@/infrastructure/crm/server/crmReadService';
import { scopeProjectKeyedMapForViewer } from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';
import { serializeWorkflowTaskStatusIndex } from '@/domain/crm/projectWorkflowTaskStatusIndex';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const byProjectId = await scopeProjectKeyedMapForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      await listWorkflowTaskStatusesByOrg(auth.context.supabase, auth.context.organizationId)
    );
    return NextResponse.json({ byProjectId: serializeWorkflowTaskStatusIndex(byProjectId) });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load CRM workflow task statuses';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
