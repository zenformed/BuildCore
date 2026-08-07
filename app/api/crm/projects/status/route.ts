/**
 * POST /api/crm/projects/status — unified Project/Subproject status change (single or bulk).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import {
  CrmSetProjectsStatusValidationError,
  setCrmProjectsStatusForOrg,
} from '@/infrastructure/crm/server/crmSetProjectsStatusService';
import { parseSetCrmProjectsStatusBody } from '@/domain/crm/setCrmProjectsStatus';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const input = parseSetCrmProjectsStatusBody(body);
  if (input == null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  try {
    const result = await setCrmProjectsStatusForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      {
        ...input,
        source: input.source ?? 'api',
      }
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CrmSetProjectsStatusValidationError) {
      return NextResponse.json({ error: 'validation_error', message: err.message }, { status: 400 });
    }
    return mapCrmRouteError(err, 'Failed to update CRM project status');
  }
}
