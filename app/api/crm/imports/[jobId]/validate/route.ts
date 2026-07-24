/**
 * POST /api/crm/imports/[jobId]/validate — validate import mapping and rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { validateSpreadsheetImportJob } from '@/infrastructure/crm/server/crmSpreadsheetImportService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { jobId: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'create'
  );
  if (!access.ok) return access.response;

  const jobId = context.params.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: 'not_found', message: 'Import job not found' }, { status: 404 });
  }

  try {
    const result = await validateSpreadsheetImportJob(
      auth.context.supabase,
      auth.context.organizationId,
      jobId
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to validate import job';
    if (message === 'Import job not found.') {
      return NextResponse.json({ error: 'not_found', message }, { status: 404 });
    }
    return mapCrmRouteError(err, 'Failed to validate import job');
  }
}
