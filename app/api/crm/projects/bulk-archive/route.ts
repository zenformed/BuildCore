/**
 * POST /api/crm/projects/bulk-archive — archive multiple projects (soft delete) in one request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { bulkArchiveCrmProjectsBySlugsForOrg } from '@/infrastructure/crm/server/crmArchiveProjectService';
import { mapCrmRouteError } from '@/infrastructure/crm/server/crmApiRouteErrors';

export const dynamic = 'force-dynamic';

type BulkArchiveBody = {
  readonly slugs?: readonly string[];
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'delete'
  );
  if (!access.ok) return access.response;

  let body: BulkArchiveBody;
  try {
    body = (await request.json()) as BulkArchiveBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const slugs = Array.isArray(body.slugs)
    ? body.slugs.filter((slug): slug is string => typeof slug === 'string')
    : [];

  if (slugs.length === 0) {
    return NextResponse.json(
      { error: 'validation_error', message: 'At least one project slug is required.' },
      { status: 400 }
    );
  }

  try {
    const result = await bulkArchiveCrmProjectsBySlugsForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      slugs
    );
    return NextResponse.json(result);
  } catch (err) {
    return mapCrmRouteError(err, 'Failed to archive CRM projects');
  }
}
