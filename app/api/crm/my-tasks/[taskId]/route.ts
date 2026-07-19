/**
 * GET /api/crm/my-tasks/[taskId] — single Member My Task assignment (scoped).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import {
  CrmMyTasksForbiddenError,
  getCrmMyTaskForViewer,
} from '@/infrastructure/crm/server/crmMyTasksService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { taskId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const taskId = context.params.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
  }

  try {
    const task = await getCrmMyTaskForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      taskId
    );
    if (task == null) {
      return NextResponse.json({ error: 'not_found', message: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof CrmMyTasksForbiddenError) {
      return NextResponse.json({ error: 'forbidden', message: err.message }, { status: 403 });
    }
    return mapCrmRouteError(err, 'Failed to load My Task');
  }
}
