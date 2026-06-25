/**
 * POST /api/crm/projects/mark-inactive — mark one or more subprojects inactive with a reason.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import {
  CrmMarkProjectsInactiveValidationError,
  markCrmProjectsInactiveForOrg,
  parseMarkCrmProjectsInactiveBody,
} from '@/infrastructure/crm/server/crmMarkProjectsInactiveService';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'update'
  );
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const input = parseMarkCrmProjectsInactiveBody(body);
  if (input == null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  try {
    const result = await markCrmProjectsInactiveForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      input
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CrmMarkProjectsInactiveValidationError) {
      return NextResponse.json({ error: 'validation_error', message: err.message }, { status: 400 });
    }
    return mapCrmRouteError(err, 'Failed to mark CRM projects inactive');
  }
}
