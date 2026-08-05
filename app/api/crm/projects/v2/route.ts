/**
 * GET /api/crm/projects/v2 — paginated root Projects (dashboard list v2).
 * Behind BUILDCORE_PROJECTS_LIST_V2 / org allowlist. No v1 fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { assertProjectsListV2EnabledForOrganization } from '@/infrastructure/crm/server/listV2/projectsListV2FeatureGate';
import { parseCrmProjectsListV2Query } from '@/infrastructure/crm/server/listV2/projectsListV2QueryParams';
import {
  CrmProjectsListV2InvalidCursorError,
  CrmProjectsListV2InvalidRequestError,
  listCrmRootProjectsPageV2,
} from '@/infrastructure/crm/server/listV2/projectsListV2Service';
import {
  crmProjectsListV2InvalidCursorResponse,
  logCrmProjectsListV2Event,
} from '@/infrastructure/crm/server/listV2';

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
    const page = await listCrmRootProjectsPageV2({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      request: parsed.request,
      cursor: parsed.cursor,
    });
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof CrmProjectsListV2InvalidCursorError) {
      logCrmProjectsListV2Event({
        name: 'crm.projects_list_v2.cursor_invalid',
        category: 'malformed',
        view: parsed.request.view,
      });
      const invalid = crmProjectsListV2InvalidCursorResponse();
      return NextResponse.json(invalid.body, { status: invalid.status });
    }
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
    return mapCrmRouteError(err, 'Failed to load CRM projects v2');
  }
}
