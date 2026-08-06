import { NextResponse } from 'next/server';
import { isDocumentsListV2EnabledForOrganization } from '@/infrastructure/config/documentsListV2Config';

/**
 * Established disabled/not-found pattern when Documents list v2 is off.
 * Does not fall back to v1.
 */
export function documentsListV2DisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'not_found',
      message: 'Documents list v2 is not enabled for this organization.',
    },
    { status: 404 }
  );
}

export function assertDocumentsListV2EnabledForOrganization(
  organizationId: string
): NextResponse | null {
  if (isDocumentsListV2EnabledForOrganization(organizationId)) {
    return null;
  }
  return documentsListV2DisabledResponse();
}
