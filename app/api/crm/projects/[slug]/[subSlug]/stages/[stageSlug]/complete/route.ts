/**
 * POST /api/crm/projects/[slug]/[subSlug]/stages/[stageSlug]/complete — subproject manual stage completion.
 * DELETE /api/crm/projects/[slug]/[subSlug]/stages/[stageSlug]/complete — undo subproject manual completion.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  deleteManualStageCompletionRoute,
  postManualStageCompletionRoute,
} from '@/infrastructure/crm/server/crmProjectStageCompletionRouteHandlers';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string; subSlug: string; stageSlug: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return postManualStageCompletionRoute(request, {
    slug: context.params.slug,
    subSlug: context.params.subSlug,
    stageSlug: context.params.stageSlug,
  });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return deleteManualStageCompletionRoute(request, {
    slug: context.params.slug,
    subSlug: context.params.subSlug,
    stageSlug: context.params.stageSlug,
  });
}
