/**
 * POST /api/crm/projects/[slug]/[subSlug]/stages/complete-empty — subproject batch empty stage completion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { postBatchEmptyStageCompletionRoute } from '@/infrastructure/crm/server/crmProjectStageCompletionRouteHandlers';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; subSlug: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return postBatchEmptyStageCompletionRoute(request, {
    slug: context.params.slug,
    subSlug: context.params.subSlug,
  });
}
