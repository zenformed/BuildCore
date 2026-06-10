import { NextRequest, NextResponse } from 'next/server';
import { usesCoreOrganizationBranding } from '@/infrastructure/branding/organizationBrandingAuthority';
import { coreBrandingHttpFailure } from '@/infrastructure/branding/coreBrandingRelay';
import { readRequestBearerToken } from '@/infrastructure/auth/readRequestBearer';
import {
  deleteOrganizationLogo,
  getOrganizationLogoBytes,
} from '@/infrastructure/coreApi/organizationBrandingClient';
import { requireOrganizationPermission } from '@/infrastructure/organization/organizationPermissionEnforcement';

/**
 * GET /api/branding/logo
 * SaaS + Core: Bearer JWT → ZenformedCore GET /users/me/organization/branding/logo
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (usesCoreOrganizationBranding()) {
    const token = readRequestBearerToken(request);
    if (token == null) {
      return new NextResponse(null, { status: 401 });
    }
    const result = await getOrganizationLogoBytes(token);
    if (!result.ok) {
      if (result.error.kind === 'http_error' && result.error.status === 404) {
        return new NextResponse(null, { status: 404 });
      }
      const failure = coreBrandingHttpFailure(result.error);
      if (failure != null) {
        return NextResponse.json(failure.body, { status: failure.status });
      }
      return NextResponse.json({ error: 'logo_unavailable' }, { status: 502 });
    }
    return new NextResponse(result.data.buffer, {
      headers: {
        'Content-Type': result.data.contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}

/**
 * DELETE /api/branding/logo — remove org logo on Core.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (usesCoreOrganizationBranding()) {
    const token = readRequestBearerToken(request);
    if (token == null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const permission = await requireOrganizationPermission(token, 'canEditOrganizationProfile');
    if (!permission.ok) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You do not have permission to edit organization settings.' },
        { status: 403 }
      );
    }
    const result = await deleteOrganizationLogo(token);
    if (!result.ok) {
      const failure = coreBrandingHttpFailure(result.error);
      if (failure != null) {
        return NextResponse.json(failure.body, { status: failure.status });
      }
      return NextResponse.json({ error: 'logo_delete_failed' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'branding_not_configured' }, { status: 503 });
}
