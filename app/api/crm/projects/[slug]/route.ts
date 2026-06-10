/**
 * GET /api/crm/projects/[slug] — full project hub aggregate for the detail page.
 * PATCH /api/crm/projects/[slug] — update project, client, and contact fields.
 * DELETE /api/crm/projects/[slug] — archive a project (soft delete).
 */

import { performance } from 'node:perf_hooks';
import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { requireBuildCoreProjectManagementAccess } from '@/infrastructure/crm/server/buildCoreProjectManagementAccess';
import { archiveCrmProjectBySlugForOrg } from '@/infrastructure/crm/server/crmArchiveProjectService';
import { getCrmProjectDetailBySlugForOrg } from '@/infrastructure/crm/server/crmReadService';
import { scopeCrmProjectDetailForViewer } from '@/infrastructure/crm/server/crmMemberProjectDetailService';
import { updateCrmProjectBySlugForOrg } from '@/infrastructure/crm/server/crmUpdateProjectService';
import {
  validateCreateCrmProjectBody,
  type CreateCrmProjectBody,
} from '@/infrastructure/crm/server/validateCreateCrmProjectBody';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const routeStarted = performance.now();
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  const authMs = Math.round(performance.now() - routeStarted);
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  try {
    const projectStarted = performance.now();
    const project = await getCrmProjectDetailBySlugForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      slug
    );
    const projectMs = Math.round(performance.now() - projectStarted);
    if (project == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    const scopeStarted = performance.now();
    const scoped = await scopeCrmProjectDetailForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      project
    );
    const scopeMs = Math.round(performance.now() - scopeStarted);
    if (scoped == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    if (process.env.NODE_ENV === 'development') {
      console.info('[PERF] GET /api/crm/projects/[slug]', {
        slug,
        authMs,
        projectMs,
        scopeMs,
        totalMs: Math.round(performance.now() - routeStarted),
      });
    }
    return NextResponse.json(scoped);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load CRM project';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  let body: CreateCrmProjectBody;
  try {
    body = (await request.json()) as CreateCrmProjectBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const validated = validateCreateCrmProjectBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  const access = await requireBuildCoreProjectManagementAccess(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id,
    'update'
  );
  if (!access.ok) return access.response;

  try {
    const project = await updateCrmProjectBySlugForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      slug,
      validated.input
    );
    if (project == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    const scoped = await scopeCrmProjectDetailForViewer(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      project
    );
    if (scoped == null) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(scoped);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update CRM project';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
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
    'delete'
  );
  if (!access.ok) return access.response;

  try {
    const archived = await archiveCrmProjectBySlugForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      slug
    );
    if (!archived) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to archive CRM project';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
