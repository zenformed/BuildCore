/**
 * GET /api/crm/projects/[slug]/photo — stream project primary photo bytes.
 * POST /api/crm/projects/[slug]/photo — upload/replace primary photo (multipart field `photo`).
 * DELETE /api/crm/projects/[slug]/photo — remove primary photo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { scopeCrmProjectDetailForViewer } from '@/infrastructure/crm/server/crmMemberProjectDetailService';
import {
  downloadProjectPrimaryPhotoForOrg,
  removeProjectPrimaryPhotoForOrg,
  uploadProjectPrimaryPhotoForOrg,
} from '@/infrastructure/crm/server/crmProjectPrimaryPhotoService';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { getDocumentStorageProvider } from '@/infrastructure/storage/getDocumentStorageProvider';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

function storageContext(authHeader: string, organizationId: string) {
  return {
    accessToken: authHeader.replace(/^Bearer\s+/i, ''),
    organizationId,
  };
}

function mockStorage(authHeader: string, organizationId: string) {
  return getCrmDataSource() === 'mock'
    ? getDocumentStorageProvider(storageContext(authHeader, organizationId))
    : undefined;
}

function mapPhotoRouteError(err: unknown): { message: string; status: number } {
  const message = err instanceof Error ? err.message : 'Failed to update project photo';
  const lower = message.toLowerCase();

  if (message.includes('must be') || message.includes('empty') || message.includes('required')) {
    return { message, status: 400 };
  }
  if (lower.includes('primary_photo_path') || lower.includes('column')) {
    return {
      message:
        'Project photo storage is not set up yet. Apply migration 00026_crm_projects_primary_photo.',
      status: 503,
    };
  }
  if (lower.includes('bucket not found')) {
    return {
      message:
        'Photo storage bucket is missing. Apply migration 00026_crm_projects_primary_photo.',
      status: 503,
    };
  }
  if (lower.includes('row-level security') || lower.includes('storage_upload_failed')) {
    return { message: 'Could not save photo. Check storage permissions for your organization.', status: 403 };
  }
  return { message, status: 500 };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const photo = await downloadProjectPrimaryPhotoForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      slug,
      mockStorage(auth.context.authHeader, auth.context.organizationId)
    );
    if (photo == null) {
      return NextResponse.json({ error: 'not_found', message: 'Photo not found' }, { status: 404 });
    }

    return new NextResponse(photo.buffer, {
      status: 200,
      headers: {
        'Content-Type': photo.contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    const mapped = mapPhotoRouteError(err);
    return NextResponse.json({ error: 'internal_error', message: mapped.message }, { status: mapped.status });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'update'
  );
  if (!access.ok) return access.response;

  const formData = await request.formData();
  const photo = formData.get('photo');
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: 'validation_error', message: 'Photo file is required.' }, { status: 400 });
  }

  try {
    const body = new Uint8Array(await photo.arrayBuffer());
    const project = await uploadProjectPrimaryPhotoForOrg({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      slug,
      fileName: photo.name,
      mimeType: photo.type,
      size: photo.size,
      body,
      storage: mockStorage(auth.context.authHeader, auth.context.organizationId),
    });
    if (project == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    const scoped = await scopeCrmProjectDetailForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      project
    );
    return NextResponse.json(scoped);
  } catch (err) {
    const mapped = mapPhotoRouteError(err);
    return NextResponse.json({ error: 'validation_error', message: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'update'
  );
  if (!access.ok) return access.response;

  try {
    const project = await removeProjectPrimaryPhotoForOrg({
      supabase: auth.context.supabase,
      organizationId: auth.context.organizationId,
      slug,
      storage: mockStorage(auth.context.authHeader, auth.context.organizationId),
    });
    if (project == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    const scoped = await scopeCrmProjectDetailForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      project
    );
    return NextResponse.json(scoped);
  } catch (err) {
    const mapped = mapPhotoRouteError(err);
    return NextResponse.json({ error: 'internal_error', message: mapped.message }, { status: mapped.status });
  }
}
