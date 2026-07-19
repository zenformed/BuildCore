/**
 * GET /api/crm/my-tasks — Member My Tasks dashboard (org-wide visible assignments).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import {
  CrmMyTasksForbiddenError,
  listCrmMyTasksForViewer,
} from '@/infrastructure/crm/server/crmMyTasksService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const assigneeScope = request.nextUrl.searchParams.get('assigneeScope');
    const body = await listCrmMyTasksForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      { assigneeScope }
    );
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof CrmMyTasksForbiddenError) {
      return NextResponse.json({ error: 'forbidden', message: err.message }, { status: 403 });
    }
    return mapCrmRouteError(err, 'Failed to load My Tasks');
  }
}
