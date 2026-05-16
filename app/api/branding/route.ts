import { NextRequest, NextResponse } from 'next/server';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { usesCoreOrganizationBranding } from '@/infrastructure/branding/organizationBrandingAuthority';
import { mapCoreBrandingToAppApi } from '@/infrastructure/branding/mapCoreBranding';
import { coreBrandingHttpFailure } from '@/infrastructure/branding/coreBrandingRelay';
import { readRequestBearerToken } from '@/infrastructure/auth/readRequestBearer';
import {
  getOrganizationBranding,
  patchOrganizationBrandingDisplayName,
  putOrganizationLogoRaw,
} from '@/infrastructure/coreApi/organizationBrandingClient';

const MANIFEST_DEFAULT_NAME = buildcoreAppDefinition.displayName;

function manifestBrandingFallback() {
  return { shopName: MANIFEST_DEFAULT_NAME, hasLogo: false };
}

/**
 * GET /api/branding — `{ shopName, hasLogo }`
 * SaaS + Core: Bearer JWT → ZenformedCore GET /users/me/organization/branding
 * Fallback: app manifest display name, no logo
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (usesCoreOrganizationBranding()) {
    const token = readRequestBearerToken(request);
    if (token == null) {
      return NextResponse.json(manifestBrandingFallback());
    }
    const result = await getOrganizationBranding(token);
    if (!result.ok) {
      const failure = coreBrandingHttpFailure(result.error);
      if (failure?.status === 404 && failure.body.error === 'organization_not_found') {
        return NextResponse.json(manifestBrandingFallback());
      }
      if (failure != null) {
        return NextResponse.json(failure.body, { status: failure.status });
      }
      return NextResponse.json({ error: 'branding_unavailable' }, { status: 502 });
    }
    return NextResponse.json(mapCoreBrandingToAppApi(result.data));
  }

  return NextResponse.json(manifestBrandingFallback());
}

/**
 * POST /api/branding — save company name and/or logo (Core relay when configured).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const coreBranding = usesCoreOrganizationBranding();
    const token = readRequestBearerToken(request);
    if (coreBranding && token == null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const shopName = formData.get('shopName');
      const logo = formData.get('logo') as File | null;

      if (coreBranding && token != null) {
        if (typeof shopName === 'string' && shopName.trim()) {
          const patch = await patchOrganizationBrandingDisplayName(token, shopName.trim());
          if (!patch.ok) {
            const failure = coreBrandingHttpFailure(patch.error);
            if (failure != null) {
              return NextResponse.json(failure.body, { status: failure.status });
            }
            return NextResponse.json({ error: 'branding_update_failed' }, { status: 502 });
          }
        }
        if (logo && logo.size > 0) {
          const buffer = Buffer.from(await logo.arrayBuffer());
          const mime =
            logo.type === 'image/jpeg' || logo.type === 'image/jpg'
              ? 'image/jpeg'
              : logo.type === 'image/webp'
                ? 'image/webp'
                : 'image/png';
          const put = await putOrganizationLogoRaw(token, buffer, mime);
          if (!put.ok) {
            const failure = coreBrandingHttpFailure(put.error);
            if (failure != null) {
              return NextResponse.json(failure.body, { status: failure.status });
            }
            return NextResponse.json({ error: 'logo_upload_failed' }, { status: 502 });
          }
        }
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: 'branding_not_configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const shopName = body.shopName;
    if (typeof shopName === 'string' && coreBranding && token != null) {
      const patch = await patchOrganizationBrandingDisplayName(
        token,
        shopName.trim() || MANIFEST_DEFAULT_NAME
      );
      if (!patch.ok) {
        const failure = coreBrandingHttpFailure(patch.error);
        if (failure != null) {
          return NextResponse.json(failure.body, { status: failure.status });
        }
        return NextResponse.json({ error: 'branding_update_failed' }, { status: 502 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to save branding' }, { status: 500 });
  }
}
