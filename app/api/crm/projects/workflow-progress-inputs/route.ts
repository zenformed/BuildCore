/**
 * GET /api/crm/projects/workflow-progress-inputs — workflow task + manual stage completion rollup per project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listWorkflowProgressInputsByOrg } from '@/infrastructure/crm/server/crmReadService';
import { scopeProjectKeyedMapForViewer } from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';
import { serializeWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const byProjectId = await scopeProjectKeyedMapForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      await listWorkflowProgressInputsByOrg(
        auth.context.supabase,
        auth.context.organizationId
      )
    );
    return NextResponse.json({
      byProjectId: serializeWorkflowProgressInputIndex(byProjectId),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load CRM workflow progress inputs';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
