/**
 * GET /api/internal/organization/payment-table-columns
 * PATCH /api/internal/organization/payment-table-columns
 */

import { NextRequest, NextResponse } from 'next/server';
import { isPaymentTableColumnPosition } from '@/domain/buildcore/paymentTableColumns';
import { organizationRoleCanManagePipelineStages } from '@/domain/buildcore/orgPipelineStages';
import { requireCrmApiAuth } from '@/infrastructure/crm/server/crmApiRouteAuth';
import {
  buildBuildCorePaymentTableColumnsResponse,
  setPaymentTableColumnForOrg,
} from '@/infrastructure/crm/server/buildCorePaymentTableColumnService';
import {
  getMockPaymentTableColumnsResponse,
  setMockPaymentTableColumn,
} from '@/infrastructure/crm/mock/mockPaymentTableColumnsStore';
import { getMockActiveWorkflowTaskCustomFieldDefinitions } from '@/infrastructure/crm/mock/mockWorkflowTaskCustomFieldsStore';
import { loadActiveOrganizationMemberRole } from '@/infrastructure/crm/server/buildCoreWorkflowTaskVisibilityService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { BUILDCORE_ADMIN_NO_CACHE_HEADERS } from '@/infrastructure/coreApi/buildCoreAdminFetch';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (runtimeModes.useMockAuth()) {
    return NextResponse.json(getMockPaymentTableColumnsResponse(true), {
      headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS,
    });
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  try {
    const response = await buildBuildCorePaymentTableColumnsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json(response, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load table columns.';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required.' }, { status: 400 });
  }

  if (body == null || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_payload', message: 'Invalid request body.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const position = typeof record.position === 'number' ? record.position : Number.NaN;
  if (!isPaymentTableColumnPosition(position)) {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'Column position must be 1 or 2.' },
      { status: 400 }
    );
  }

  let fieldKey: string | null = null;
  if ('fieldKey' in record) {
    if (record.fieldKey === null) {
      fieldKey = null;
    } else if (typeof record.fieldKey === 'string') {
      fieldKey = record.fieldKey.trim().length > 0 ? record.fieldKey.trim() : null;
    } else {
      return NextResponse.json(
        { error: 'invalid_payload', message: 'fieldKey must be a string or null.' },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: 'invalid_payload', message: 'fieldKey is required.' },
      { status: 400 }
    );
  }

  if (runtimeModes.useMockAuth()) {
    try {
      const activeKeys = new Set(
        getMockActiveWorkflowTaskCustomFieldDefinitions('payment').map((def) => def.fieldKey)
      );
      const slots = setMockPaymentTableColumn(position, fieldKey, activeKeys);
      return NextResponse.json(
        { ...getMockPaymentTableColumnsResponse(true), slots },
        { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update table column.';
      return NextResponse.json({ error: 'request_failed', message }, { status: 400 });
    }
  }

  const auth = await requireCrmApiAuth(request.headers.get('Authorization'));
  if (!auth.ok) return auth.response;

  const actorRole = await loadActiveOrganizationMemberRole(
    auth.context.supabase,
    auth.context.organizationId,
    auth.context.user.id
  );
  if (!organizationRoleCanManagePipelineStages(actorRole)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'You do not have permission to manage table columns.' },
      { status: 403 }
    );
  }

  try {
    const slots = await setPaymentTableColumnForOrg(
      auth.context.supabase,
      auth.context.organizationId,
      position,
      fieldKey
    );
    const response = await buildBuildCorePaymentTableColumnsResponse(
      auth.context.supabase,
      auth.context.organizationId,
      auth.context.user.id
    );
    return NextResponse.json({ ...response, slots }, { headers: BUILDCORE_ADMIN_NO_CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update table column.';
    return NextResponse.json({ error: 'request_failed', message }, { status: 400 });
  }
}
