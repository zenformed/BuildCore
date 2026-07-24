/**
 * GET /api/crm/imports/[jobId] — spreadsheet import job status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { getSpreadsheetImportJobStatus } from '@/infrastructure/crm/server/crmSpreadsheetImportService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { jobId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const jobId = context.params.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: 'not_found', message: 'Import job not found' }, { status: 404 });
  }

  try {
    const status = await getSpreadsheetImportJobStatus(
      auth.context.supabase,
      auth.context.organizationId,
      jobId
    );
    return NextResponse.json({
      job: status.job,
      groups: status.groups,
      counts: status.counts,
      recentRowErrors: status.recentRowErrors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load import job';
    if (message === 'Import job not found.') {
      return NextResponse.json({ error: 'not_found', message }, { status: 404 });
    }
    return mapCrmRouteError(err, 'Failed to load import job');
  }
}
