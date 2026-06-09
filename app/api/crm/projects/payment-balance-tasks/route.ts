/**
 * GET /api/crm/projects/payment-balance-tasks — payment milestone rows for org-wide financial rollups.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import { listPaymentBalanceTasksByOrg } from '@/infrastructure/crm/server/crmReadService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const byProjectId = await listPaymentBalanceTasksByOrg(
      auth.context.supabase,
      auth.context.organizationId
    );
    const serialized = Object.fromEntries(byProjectId.entries());
    return NextResponse.json({ byProjectId: serialized });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load CRM payment balance tasks';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}
