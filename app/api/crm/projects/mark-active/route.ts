/**
 * POST /api/crm/projects/mark-active — thin adapter over unified status service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  CrmMarkProjectsActiveValidationError,
  markCrmProjectsActiveForOrg,
  parseMarkCrmProjectsActiveBody,
} from '@/infrastructure/crm/server/crmMarkProjectsActiveService';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { CrmSetProjectsStatusValidationError } from '@/infrastructure/crm/server/crmSetProjectsStatusService';

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

  const input = parseMarkCrmProjectsActiveBody(body);
  if (input == null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'At least one project slug is required.' },
      { status: 400 }
    );
  }

  try {
    const result = await markCrmProjectsActiveForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      input
    );
    return NextResponse.json(result);
  } catch (err) {
    if (
      err instanceof CrmMarkProjectsActiveValidationError ||
      err instanceof CrmSetProjectsStatusValidationError
    ) {
      return NextResponse.json({ error: 'validation_error', message: err.message }, { status: 400 });
    }
    return mapCrmRouteError(err, 'Failed to mark CRM projects active');
  }
}
