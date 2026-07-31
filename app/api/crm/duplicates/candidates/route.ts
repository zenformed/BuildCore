/**
 * POST /api/crm/duplicates/candidates — find duplicate candidates for one prepared record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import {
  CrmDuplicateDetectionValidationError,
  findCrmDuplicateCandidates,
} from '@/infrastructure/crm/server/identity/crmDuplicateCandidateService';
import { parseDuplicateCandidatesRequest } from '@/infrastructure/crm/server/identity/validateDuplicateCandidatesRequest';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'create'
  );
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'JSON body required' },
      { status: 400 }
    );
  }

  const parsed = parseDuplicateCandidatesRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'invalid_body', message: parsed.message },
      { status: 400 }
    );
  }

  try {
    const result = await findCrmDuplicateCandidates(
      auth.context.supabase,
      auth.context.organizationId,
      parsed.options
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CrmDuplicateDetectionValidationError) {
      return NextResponse.json(
        { error: err.code, message: err.message, details: err.details },
        { status: 400 }
      );
    }
    return mapCrmRouteError(err, 'Failed to find duplicate candidates');
  }
}
