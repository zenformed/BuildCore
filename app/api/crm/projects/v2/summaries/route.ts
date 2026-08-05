/**
 * POST /api/crm/projects/v2/summaries — page-scoped payment/progress/stage/childCount
 * for visible Project IDs only. Behind Projects list v2 feature flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { assertProjectsListV2EnabledForOrganization } from '@/infrastructure/crm/server/listV2/projectsListV2FeatureGate';
import {
  CrmProjectsListV2InvalidRequestError,
  loadCrmProjectsPageSummariesV2,
} from '@/infrastructure/crm/server/listV2/projectsListV2Service';
import { logCrmProjectsListV2Event } from '@/infrastructure/crm/server/listV2';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const disabled = assertProjectsListV2EnabledForOrganization(auth.context.organizationId);
  if (disabled != null) return disabled;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'JSON body required' },
      { status: 400 }
    );
  }

  const projectIdsRaw =
    body != null && typeof body === 'object' && 'projectIds' in body
      ? (body as { projectIds?: unknown }).projectIds
      : null;
  if (!Array.isArray(projectIdsRaw)) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'projectIds array is required' },
      { status: 400 }
    );
  }
  const projectIds = projectIdsRaw.filter((id): id is string => typeof id === 'string');

  try {
    const summaries = await loadCrmProjectsPageSummariesV2({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      projectIds,
    });
    return NextResponse.json(summaries);
  } catch (err) {
    if (err instanceof CrmProjectsListV2InvalidRequestError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 400 }
      );
    }
    logCrmProjectsListV2Event({
      name: 'crm.projects_list_v2.db_failure',
      view: 'roots',
      code: err instanceof Error ? err.name : 'unknown',
    });
    return mapCrmRouteError(err, 'Failed to load CRM projects v2 summaries');
  }
}
