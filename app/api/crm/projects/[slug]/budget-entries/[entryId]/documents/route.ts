/**
 * GET  /api/crm/projects/[slug]/budget-entries/[entryId]/documents — list budget entry documents
 * POST /api/crm/projects/[slug]/budget-entries/[entryId]/documents — upload document (multipart)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';
import {
  listBudgetEntryDocumentsForOrg,
} from '@/infrastructure/crm/server/crmBudgetEntryDocumentService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; entryId: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  const entryId = context.params.entryId?.trim();
  if (!slug || !entryId) {
    return NextResponse.json({ error: 'not_found', message: 'Not found' }, { status: 404 });
  }

  try {
    const documents = await listBudgetEntryDocumentsForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { projectSlug: slug, budgetEntryId: entryId }
    );
    return NextResponse.json({ documents });
  } catch (err) {
    return crmDocumentErrorResponse(err);
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: 'deprecated',
      message: 'Use direct upload: POST /api/crm/projects/[slug]/direct-uploads/prepare',
    },
    { status: 410 }
  );
}
