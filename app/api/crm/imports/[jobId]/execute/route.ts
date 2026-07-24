/**
 * POST /api/crm/imports/[jobId]/execute — start spreadsheet import execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { startImportExecution } from '@/infrastructure/crm/server/crmSpreadsheetImportService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { jobId: string } };

type ExecuteBody = {
  readonly clientClaimToken?: string;
};

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

  let body: ExecuteBody;
  try {
    body = (await request.json()) as ExecuteBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const clientClaimToken =
    typeof body.clientClaimToken === 'string' ? body.clientClaimToken.trim() : '';
  if (!clientClaimToken) {
    return NextResponse.json(
      { error: 'validation_error', message: 'clientClaimToken is required.' },
      { status: 400 }
    );
  }

  try {
    const result = await startImportExecution(
      auth.context.supabase,
      auth.context.organizationId,
      jobId,
      clientClaimToken
    );
    return NextResponse.json({
      status: 'running',
      claimExpiresAt: result.claimExpiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start import execution';
    if (message === 'Import job not found.') {
      return NextResponse.json({ error: 'not_found', message }, { status: 404 });
    }
    return mapCrmRouteError(err, 'Failed to start import execution');
  }
}
