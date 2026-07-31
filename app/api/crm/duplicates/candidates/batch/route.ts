/**
 * POST /api/crm/duplicates/candidates/batch — batch duplicate candidate groups for import.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import {
  CrmDuplicateDetectionValidationError,
  findCrmDuplicateCandidatesBatch,
} from '@/infrastructure/crm/server/identity/crmDuplicateCandidateService';
import { parseDuplicateCandidatesBatchRequest } from '@/infrastructure/crm/server/identity/validateDuplicateCandidatesRequest';
import { listDashboardVisibleCrmProjectIdsForViewer } from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';

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

  const parsed = parseDuplicateCandidatesBatchRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'invalid_body', message: parsed.message },
      { status: 400 }
    );
  }

  try {
    const dashboardVisibleRecordIds = await listDashboardVisibleCrmProjectIdsForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    const result = await findCrmDuplicateCandidatesBatch(
      auth.context.supabase,
      auth.context.organizationId,
      {
        ...parsed.options,
        dashboardVisibleRecordIds,
      }
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CrmDuplicateDetectionValidationError) {
      return NextResponse.json(
        { error: err.code, message: err.message, details: err.details },
        { status: 400 }
      );
    }
    return mapCrmRouteError(err, 'Failed to find duplicate candidate groups');
  }
}
