/**
 * POST /api/crm/projects/[slug]/stages/complete-empty — batch mark empty incomplete stages complete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { postBatchEmptyStageCompletionRoute } from '@/infrastructure/crm/server/crmProjectStageCompletionRouteHandlers';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return postBatchEmptyStageCompletionRoute(request, {
    slug: context.params.slug,
  });
}
