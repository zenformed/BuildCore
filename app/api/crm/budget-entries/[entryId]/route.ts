/**
 * PATCH /api/crm/budget-entries/[entryId] — update a budget line item.
 * DELETE /api/crm/budget-entries/[entryId] — soft-delete a budget line item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  deleteCrmBudgetEntryForOrg,
  updateCrmBudgetEntryForOrg,
} from '@/infrastructure/crm/server/crmBudgetService';
import {
  validateUpdateBudgetEntryBody,
  type BudgetEntryBody,
} from '@/infrastructure/crm/server/validateBudgetEntryBody';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { entryId: string } };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const entryId = context.params.entryId?.trim();
  if (!entryId) {
    return NextResponse.json({ error: 'not_found', message: 'Budget entry not found' }, { status: 404 });
  }

  let body: BudgetEntryBody;
  try {
    body = (await request.json()) as BudgetEntryBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const validated = validateUpdateBudgetEntryBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: 'validation_error', message: validated.message }, { status: 400 });
  }

  const slug = request.nextUrl.searchParams.get('projectSlug')?.trim() ?? '';

  try {
    const entry = await updateCrmBudgetEntryForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      { entryId, projectSlug: slug, ...validated.input }
    );
    if (entry == null) {
      return NextResponse.json({ error: 'not_found', message: 'Budget entry not found' }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update budget entry';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const entryId = context.params.entryId?.trim();
  if (!entryId) {
    return NextResponse.json({ error: 'not_found', message: 'Budget entry not found' }, { status: 404 });
  }

  try {
    const deleted = await deleteCrmBudgetEntryForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id,
      entryId
    );
    if (!deleted) {
      return NextResponse.json({ error: 'not_found', message: 'Budget entry not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete budget entry';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
