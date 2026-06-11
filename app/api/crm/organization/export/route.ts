/**
 * GET /api/crm/organization/export — Owner/Admin XLSX export of org BuildCore data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { organizationExportFilename } from '@/export/organization/organizationExportFilename';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { buildContentDispositionAttachment } from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
import { requireBuildCoreOrganizationExportAccess } from '@/infrastructure/crm/server/buildCoreOrganizationExportAccess';
import { buildOrganizationExportXlsxForOrg } from '@/infrastructure/crm/server/crmOrganizationExportService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const access = await requireBuildCoreOrganizationExportAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!access.ok) return access.response;

  try {
    const accessToken = auth.context.authHeader.replace(/^Bearer\s+/i, '').trim();
    const buffer = await buildOrganizationExportXlsxForOrg({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      accessToken,
    });
    const fileName = organizationExportFilename();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': buildContentDispositionAttachment(fileName),
        'Cache-Control': 'private, no-store',
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export organization data';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
