/**
 * GET /api/crm/projects/v2/count — exact root Projects count for the same
 * filters/search/permissions as the page endpoint. Not embedded in page responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { assertProjectsListV2EnabledForOrganization } from '@/infrastructure/crm/server/listV2/projectsListV2FeatureGate';
import { parseCrmProjectsListV2Query } from '@/infrastructure/crm/server/listV2/projectsListV2QueryParams';
import {
  countCrmProjectsListV2,
  CrmProjectsListV2InvalidRequestError,
} from '@/infrastructure/crm/server/listV2/projectsListV2Service';
import { logCrmProjectsListV2Event } from '@/infrastructure/crm/server/listV2';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const disabled = assertProjectsListV2EnabledForOrganization(auth.context.organizationId);
  if (disabled != null) return disabled;

  const parsed = parseCrmProjectsListV2Query(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'invalid_request', message: parsed.message },
      { status: 400 }
    );
  }

  try {
    const count = await countCrmProjectsListV2({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      request: parsed.request,
    });
    return NextResponse.json(count);
  } catch (err) {
    if (err instanceof CrmProjectsListV2InvalidRequestError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 400 }
      );
    }
    logCrmProjectsListV2Event({
      name: 'crm.projects_list_v2.db_failure',
      view: parsed.request.view,
      code: err instanceof Error ? err.name : 'unknown',
    });
    return mapCrmRouteError(err, 'Failed to count CRM projects v2');
  }
}
