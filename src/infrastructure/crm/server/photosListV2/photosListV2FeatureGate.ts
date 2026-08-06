import { NextResponse } from 'next/server';
import { isPhotosListV2EnabledForOrganization } from '@/infrastructure/config/photosListV2Config';

/**
 * Established disabled/not-found pattern when Photos list v2 is off.
 * Does not fall back to v1.
 */
export function photosListV2DisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'not_found',
      message: 'Photos list v2 is not enabled for this organization.',
    },
    { status: 404 }
  );
}

export function assertPhotosListV2EnabledForOrganization(
  organizationId: string
): NextResponse | null {
  if (isPhotosListV2EnabledForOrganization(organizationId)) {
    return null;
  }
  return photosListV2DisabledResponse();
}
