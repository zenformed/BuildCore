/**
 * GET /api/crm/projects/[slug]/subprojects — child project summaries for a parent project.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { CrmProjectSummary } from '@/domain/crm';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listCrmProjectSummariesForOrg } from '@/infrastructure/crm/server/crmReadService';
import {
  memberCanAccessProjectIdForViewer,
  scopeCrmProjectSummariesForViewer,
} from '@/infrastructure/crm/server/crmMemberProjectVisibilityService';
import { logCrmProjectListT2Debug } from '@/infrastructure/crm/server/crmProjectListRouteDebug';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

type Subprojects404Reason =
  | 'missing_parent_slug'
  | 'parent_not_found'
  | 'parent_access_denied';

function summarizeProjectForSubprojects404Debug(project: CrmProjectSummary): {
  id: string;
  slug: string;
  parentProjectId: string | null;
  name: string;
} {
  return {
    id: project.id,
    slug: project.slug,
    parentProjectId: project.parentProjectId,
    name: project.name,
  };
}

function logSubprojects404Debug(options: {
  reason: Subprojects404Reason;
  parentSlug: string | null;
  rawSlugParam: string | undefined;
  allSummaries?: readonly CrmProjectSummary[];
  parent?: CrmProjectSummary | null;
}): void {
  const { reason, parentSlug, rawSlugParam, allSummaries, parent } = options;

  if (reason === 'missing_parent_slug') {
    console.info('[subprojects] 404 debug', {
      reason,
      incomingParentSlug: parentSlug,
      rawSlugParam,
    });
    return;
  }

  const summaries = allSummaries ?? [];
  const slugMatches = summaries.filter((project) => project.slug === parentSlug);
  const rootSlugMatches = summaries.filter(
    (project) => project.slug === parentSlug && project.parentProjectId == null
  );

  console.info('[subprojects] 404 debug', {
    reason,
    incomingParentSlug: parentSlug,
    rawSlugParam,
    allSummariesLength: summaries.length,
    hasSlugMatch: slugMatches.length > 0,
    hasRootSlugMatch: rootSlugMatches.length > 0,
    relevantSummaries: slugMatches.map(summarizeProjectForSubprojects404Debug),
    parentFound: parent ?? null,
    parentFoundFields: parent ? summarizeProjectForSubprojects404Debug(parent) : null,
  });
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const rawSlugParam = context.params.slug;
  const parentSlug = rawSlugParam?.trim();
  if (!parentSlug) {
    logSubprojects404Debug({
      reason: 'missing_parent_slug',
      parentSlug: parentSlug ?? null,
      rawSlugParam,
    });
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const allSummaries = await listCrmProjectSummariesForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { rootsOnly: false }
    );
    const dashboardEquivalentSummaries = await listCrmProjectSummariesForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      { rootsOnly: false }
    );
    const parent = allSummaries.find(
      (project) => project.slug === parentSlug && project.parentProjectId == null
    );
    if (parent == null) {
      logCrmProjectListT2Debug({
        route: 'subprojects',
        parentSlug,
        parentFound: parent,
        allSummaries,
        dashboardEquivalentSummaries,
      });
      logSubprojects404Debug({
        reason: 'parent_not_found',
        parentSlug,
        rawSlugParam,
        allSummaries,
        parent,
      });
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const canAccessParent = await memberCanAccessProjectIdForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      parent.id
    );
    if (!canAccessParent) {
      logCrmProjectListT2Debug({
        route: 'subprojects',
        parentSlug,
        parentFound: parent,
        allSummaries,
        dashboardEquivalentSummaries,
      });
      logSubprojects404Debug({
        reason: 'parent_access_denied',
        parentSlug,
        rawSlugParam,
        allSummaries,
        parent,
      });
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const childSummaries = allSummaries.filter(
      (project) => project.parentProjectId === parent.id
    );
    const projects = await scopeCrmProjectSummariesForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      childSummaries
    );

    logCrmProjectListT2Debug({
      route: 'subprojects',
      parentSlug,
      parentFound: parent,
      allSummaries,
      childSummariesBeforeScope: childSummaries,
      childSummariesAfterScope: projects,
      dashboardEquivalentSummaries,
    });

    return NextResponse.json(
      { projects, total: projects.length },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load subprojects';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
