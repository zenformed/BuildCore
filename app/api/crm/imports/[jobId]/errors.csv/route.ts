/**
 * GET /api/crm/imports/[jobId]/errors.csv — download import error CSV.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { buildContentDispositionAttachment } from '@/infrastructure/crm/server/crmDocumentDownloadResponse';
import { buildImportErrorCsv } from '@/infrastructure/crm/server/crmSpreadsheetImportService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { jobId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const jobId = context.params.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: 'not_found', message: 'Import job not found' }, { status: 404 });
  }

  try {
    const csv = await buildImportErrorCsv(
      auth.context.supabase,
      auth.context.organizationId,
      jobId
    );
    const fileName = `import-errors-${jobId}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': buildContentDispositionAttachment(fileName),
        'Cache-Control': 'private, no-store',
        'Content-Length': String(Buffer.byteLength(csv, 'utf8')),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build import error CSV';
    if (message === 'Import job not found.') {
      return NextResponse.json({ error: 'not_found', message }, { status: 404 });
    }
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
