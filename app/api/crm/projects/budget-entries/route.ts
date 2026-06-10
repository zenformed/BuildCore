/**
 * GET /api/crm/projects/budget-entries — budget entry rows for org-wide cost rollups.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listBudgetEntriesByOrg } from '@/infrastructure/crm/server/crmReadService';
import { scopeProjectKeyedMapForViewer } from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const byProjectId = await scopeProjectKeyedMapForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      await listBudgetEntriesByOrg(
        auth.context.supabase,
        auth.context.organizationId
      )
    );
    const serialized = Object.fromEntries(byProjectId.entries());
    return NextResponse.json({ byProjectId: serialized });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load CRM budget entries';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
