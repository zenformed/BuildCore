/**
 * POST /api/crm/imports/[jobId]/resolutions — save parent group resolutions.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { CrmImportParentResolution } from '@/domain/crm/spreadsheetImportTypes';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { saveImportResolutions } from '@/infrastructure/crm/server/crmSpreadsheetImportService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { jobId: string } };

type ResolutionsBody = {
  readonly groups?: readonly {
    readonly groupKey?: string;
    readonly resolution?: CrmImportParentResolution;
  }[];
  readonly excludedSourceRowIndexes?: readonly number[];
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

  let body: ResolutionsBody;
  try {
    body = (await request.json()) as ResolutionsBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const resolutions = (body.groups ?? [])
    .filter(
      (item): item is { readonly groupKey: string; readonly resolution: CrmImportParentResolution } =>
        typeof item.groupKey === 'string' &&
        item.groupKey.trim().length > 0 &&
        item.resolution != null &&
        typeof item.resolution === 'object'
    )
    .map((item) => ({
      groupKey: item.groupKey.trim(),
      resolution: item.resolution,
    }));

  const excludedSourceRowIndexes = Array.isArray(body.excludedSourceRowIndexes)
    ? body.excludedSourceRowIndexes.filter((index): index is number => Number.isInteger(index))
    : [];

  try {
    const result = await saveImportResolutions(
      auth.context.supabase,
      auth.context.organizationId,
      jobId,
      resolutions,
      excludedSourceRowIndexes
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save import resolutions';
    if (message === 'Import job not found.') {
      return NextResponse.json({ error: 'not_found', message }, { status: 404 });
    }
    return mapCrmRouteError(err, 'Failed to save import resolutions');
  }
}
