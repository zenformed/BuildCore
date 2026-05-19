/**
 * POST /api/crm/projects/[slug]/budget-entries — create a project budget line item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { createCrmBudgetEntryForOrg } from '@/infrastructure/crm/server/crmBudgetService';
import { resolveCrmProjectIdBySlug } from '@/infrastructure/crm/server/resolveCrmProjectIdBySlug';
import {
  validateCreateBudgetEntryBody,
  type BudgetEntryBody,
} from '@/infrastructure/crm/server/validateBudgetEntryBody';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { slug: string } };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const slug = context.params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
  }

  let body: BudgetEntryBody;
  try {
    body = (await request.json()) as BudgetEntryBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const validated = validateCreateBudgetEntryBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  try {
    const projectId = await resolveCrmProjectIdBySlug(
      auth.context.supabase,
      auth.context.organizationId,
      slug
    );
    if (!projectId) {
      return NextResponse.json({ error: 'not_found', message: 'Project not found' }, { status: 404 });
    }

    const entry = await createCrmBudgetEntryForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      { projectId, projectSlug: slug, ...validated.input }
    );
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create budget entry';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
