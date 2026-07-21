import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listCrmOrganizationPhotosForViewer } from '@/infrastructure/crm/server/crmOrganizationPhotosService';
import { deleteCrmOrganizationPhotosForViewer } from '@/infrastructure/crm/server/crmOrganizationPhotosBulkDelete';
import { getDocumentStorageProviderForCrmAuth } from '@/infrastructure/crm/server/documentStorageProviderForCrmAuth';
import { crmDocumentErrorResponse } from '@/infrastructure/crm/server/crmDocumentRouteErrors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const rawLimit = Number(searchParams.get('limit') ?? '40');
  const limit = Number.isFinite(rawLimit) ? rawLimit : 40;

  try {
    const page = await listCrmOrganizationPhotosForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      {
        search: searchParams.get('search') ?? '',
        cursor: searchParams.get('cursor'),
        limit,
      }
    );
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'photos_load_failed',
        message: error instanceof Error ? error.message : 'Could not load photos.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const ids =
    body != null &&
    typeof body === 'object' &&
    Array.isArray((body as { documentIds?: unknown }).documentIds)
      ? (body as { documentIds: unknown[] }).documentIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  try {
    const result = await deleteCrmOrganizationPhotosForViewer(
      auth.context.supabase,
      getDocumentStorageProviderForCrmAuth(auth.context),
      auth.context.organizationId,
      auth.context.user.id,
      ids
    );
    return NextResponse.json(result);
  } catch (error) {
    return crmDocumentErrorResponse(error);
  }
}
