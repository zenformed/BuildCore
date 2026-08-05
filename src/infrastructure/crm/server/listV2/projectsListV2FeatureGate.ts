import { NextResponse } from 'next/server';
import { isProjectsListV2EnabledForOrganization } from '@/infrastructure/config/projectsListV2Config';

/**
 * Established disabled/not-found pattern when Projects list v2 is off.
 * Does not fall back to v1.
 */
export function projectsListV2DisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'not_found',
      message: 'Projects list v2 is not enabled for this organization.',
    },
    { status: 404 }
  );
}

export function assertProjectsListV2EnabledForOrganization(
  organizationId: string
): NextResponse | null {
  if (isProjectsListV2EnabledForOrganization(organizationId)) {
    return null;
  }
  return projectsListV2DisabledResponse();
}
